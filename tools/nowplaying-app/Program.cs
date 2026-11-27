using System.Net.Http.Json;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace VxhNowPlaying;

/// <summary>
/// Tray app: every second reads what Windows says is playing and, when something changed (or every 15 s),
/// sends it to /api/panel/music with the dock key. The "Now playing" widget (source: app) shows it in OBS.
/// </summary>
static class Program
{
    static readonly HttpClient http = new() { Timeout = TimeSpan.FromSeconds(8) };
    static Config config = Config.Load();
    static Tray? tray;
    static string status = "Uruchamianie…";
    static Track? last;
    static DateTime lastSent = DateTime.MinValue;
    static double expectedPos;
    // Music commands from chat (settings come from the dock).
    static PanelSettings settings = new();
    static readonly Media media = new();
    static readonly HashSet<string> voters = new(StringComparer.OrdinalIgnoreCase);
    static DateTime lastSkip = DateTime.MinValue;
    static long seenNextAt = -1;
    static string skippedBy = "";
    static bool forceSend;
    static CancellationTokenSource? chatStop;
    static string chatFor = "";

    [DllImport("user32.dll")] static extern bool OpenClipboard(IntPtr owner);
    [DllImport("user32.dll")] static extern bool CloseClipboard();
    [DllImport("user32.dll")] static extern IntPtr GetClipboardData(uint format);
    [DllImport("kernel32.dll")] static extern IntPtr GlobalLock(IntPtr mem);
    [DllImport("kernel32.dll")] static extern bool GlobalUnlock(IntPtr mem);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);

    [STAThread]
    static void Main()
    {
        using var single = new Mutex(true, "VxhNowPlaying.Single", out var first);
        if (!first) return;
        http.DefaultRequestHeaders.UserAgent.ParseAdd("VXH-Now-Playing/1.0");
        SetAutostart(config.Autostart);
        tray = new Tray("VXH Now Playing", Menu);
        if (Config.ParseDockLink(config.DockLink) == null)
            tray.Balloon("VXH Now Playing", "Skopiuj link docka ze strony Panel OBS i wybierz w menu ikony: „Wklej link docka ze schowka”.");
        _ = Task.Run(Loop);
        _ = Task.Run(() => Panel.FollowAsync(() => Config.ParseDockLink(config.DockLink), OnSettings, CancellationToken.None));
        tray.Run();
        _ = Send(null, null); // tell the overlay the music stopped
    }

    static IReadOnlyList<Tray.Item> Menu()
    {
        var linked = Config.ParseDockLink(config.DockLink) != null;
        return new List<Tray.Item>
        {
            new(status, null, Disabled: true),
            new("", null, Separator: true),
            new(linked ? "Zmień link docka (ze schowka)" : "Wklej link docka ze schowka", PasteLink),
            new("Źródło: wszystko, co gra", () => SetSource("all"), config.Source == "all"),
            new("Źródło: tylko Spotify", () => SetSource("spotify"), config.Source == "spotify"),
            new("Źródło: tylko przeglądarka (YouTube itp.)", () => SetSource("browser"), config.Source == "browser"),
            new("Źródło: programy muzyczne", () => SetSource("music"), config.Source == "music"),
            new("", null, Separator: true),
            new("Uruchamiaj razem z Windows", () => { config.Autostart = !config.Autostart; config.Save(); SetAutostart(config.Autostart); }, config.Autostart),
            new("Otwórz Panel OBS", () => OpenUrl((Config.ParseDockLink(config.DockLink)?.Origin ?? "https://overlays.vxh.pl") + "/panel")),
            new("Zamknij", () => tray?.Quit()),
        };
    }

    static void SetSource(string s) { config.Source = s; config.Save(); last = null; }

    static void PasteLink()
    {
        var text = ReadClipboard();
        var parsed = Config.ParseDockLink(text);
        if (parsed == null)
        {
            MessageBox(IntPtr.Zero, "W schowku nie ma linku docka.\n\nNa stronie Panel OBS (overlays.vxh.pl/panel) kliknij „Kopiuj” przy linku docka i spróbuj jeszcze raz.", "VXH Now Playing", 0x30);
            return;
        }
        config.DockLink = text!.Trim();
        config.Save();
        last = null;
        tray?.Balloon("VXH Now Playing", "Połączono z Panelem OBS. W studiu ustaw w „Teraz gra” źródło: aplikacja.");
    }

    static string? ReadClipboard()
    {
        if (!OpenClipboard(IntPtr.Zero)) return null;
        try
        {
            var h = GetClipboardData(13); // CF_UNICODETEXT
            if (h == IntPtr.Zero) return null;
            var p = GlobalLock(h);
            try { return Marshal.PtrToStringUni(p); } finally { GlobalUnlock(h); }
        }
        finally { CloseClipboard(); }
    }

    static void SetAutostart(bool on)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
            if (key == null) return;
            if (on) key.SetValue("VXH Now Playing", $"\"{Environment.ProcessPath}\"");
            else key.DeleteValue("VXH Now Playing", false);
        }
        catch { /* no access: the menu item just does nothing */ }
    }

    static void OpenUrl(string url)
    {
        try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
    }

    /// <summary>New panel state: start / stop chat listeners for the linked channels, obey the dock's "next song".</summary>
    static void OnSettings(PanelSettings s)
    {
        settings = s;
        if (seenNextAt < 0) seenNextAt = s.NextAt;
        else if (s.NextAt > seenNextAt) { seenNextAt = s.NextAt; _ = Skip("panel"); }
        var want = (s.Skip || s.Vote) ? $"{s.Twitch}|{s.Kick}" : "";
        if (want == chatFor) return;
        chatFor = want;
        chatStop?.Cancel();
        chatStop = null;
        if (want == "") return;
        chatStop = new CancellationTokenSource();
        var origin = Config.ParseDockLink(config.DockLink)?.Origin ?? "https://overlays.vxh.pl";
        if (s.Twitch != "") _ = Task.Run(() => Chat.TwitchAsync(s.Twitch, OnChat, chatStop.Token));
        if (s.Kick != "") _ = Task.Run(() => Chat.KickAsync(origin, s.Kick, OnChat, chatStop.Token));
    }

    static void OnChat(ChatLine line)
    {
        var cmd = line.Text.Trim().Split(' ', 2)[0].ToLowerInvariant();
        if (settings.Skip && line.Privileged && cmd == settings.SkipCmd) { _ = Skip(line.User); return; }
        if (!settings.Vote || cmd != settings.VoteCmd || last == null) return;
        lock (voters)
        {
            if (!voters.Add($"{line.Platform}:{line.User}")) return;
            forceSend = true;
            if (voters.Count >= settings.Needed) _ = Skip($"{voters.Count} głosów");
        }
    }

    static async Task Skip(string by)
    {
        if (DateTime.UtcNow - lastSkip < TimeSpan.FromSeconds(by == "panel" ? 1 : settings.Cooldown)) return;
        lastSkip = DateTime.UtcNow;
        if (!await media.SkipAsync(config.Source)) return;
        skippedBy = by == "panel" ? "" : by;
        lock (voters) voters.Clear();
        forceSend = true;
    }

    static async Task Loop()
    {
        while (true)
        {
            try
            {
                var (track, thumb) = await media.ReadAsync(config.Source);
                var changedSong = track?.Title != last?.Title || track?.Artist != last?.Artist;
                var changedState = track?.Playing != last?.Playing;
                // A jump of more than 3 s against where the song should be = the streamer seeked.
                var seeked = track != null && last != null && !changedSong && Math.Abs(track.Position - expectedPos) > 3;
                var stale = DateTime.UtcNow - lastSent > TimeSpan.FromSeconds(15);
                if (changedSong) lock (voters) voters.Clear();
                if (changedSong || changedState || seeked || stale || forceSend)
                {
                    forceSend = false;
                    var cover = changedSong ? await Media.CoverAsync(thumb) : null;
                    var ok = await Send(track, changedSong ? (cover ?? "") : null);
                    lastSent = DateTime.UtcNow;
                    status = Config.ParseDockLink(config.DockLink) == null ? "Brak linku docka"
                        : !ok ? "Brak połączenia z panelem"
                        : track == null ? "Nic nie gra" : $"{(track.Playing ? "▶" : "❚❚")} {track.Title} – {track.Artist}";
                    tray?.SetTip("VXH Now Playing\n" + status);
                }
                last = track;
                expectedPos = track == null ? 0 : track.Position + (track.Playing ? 1 : 0);
            }
            catch (Exception e)
            {
                status = "Błąd: " + e.Message;
            }
            await Task.Delay(1000);
        }
    }

    /// <summary>cover: data URL = new picture, "" = no picture for this song, null = keep the current one.</summary>
    static async Task<bool> Send(Track? t, string? cover)
    {
        var link = Config.ParseDockLink(config.DockLink);
        if (link == null) return false;
        int votes; lock (voters) votes = voters.Count;
        var by = skippedBy;
        skippedBy = "";
        object? music = t == null ? null : new
        {
            title = t.Title, artist = t.Artist, album = t.Album, app = t.App, playing = t.Playing, position = Math.Round(t.Position, 1), duration = Math.Round(t.Duration, 1),
            votes, needed = settings.Vote ? settings.Needed : 0, skippedBy = by,
        };
        object body = cover == null
            ? new { key = link.Value.Key, music }
            : cover == "" ? new { key = link.Value.Key, music, cover = (string?)null } : new { key = link.Value.Key, music, cover = (string?)cover };
        try
        {
            var res = await http.PostAsJsonAsync($"{link.Value.Origin}/api/panel/music", body);
            return res.IsSuccessStatusCode;
        }
        catch { return false; }
    }
}
