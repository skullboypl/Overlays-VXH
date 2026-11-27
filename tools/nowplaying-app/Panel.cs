using System.Net.Http.Json;
using System.Text.Json;

namespace VxhNowPlaying;

/// <summary>What the app needs from the OBS panel: the linked channels and the music-command settings set in the dock.</summary>
public sealed class PanelSettings
{
    public string Twitch { get; init; } = "";
    public string Kick { get; init; } = "";
    public bool Skip { get; init; }
    public bool Vote { get; init; }
    public int Needed { get; init; } = 5;
    public int Cooldown { get; init; } = 20;
    public string SkipCmd { get; init; } = "!skip";
    public string VoteCmd { get; init; } = "!voteskip";
    /// <summary>Time of the dock's "next song" button (server clock, ms).</summary>
    public long NextAt { get; init; }
}

/// <summary>Follows the panel room live (Server-Sent Events, read-only) and reports the settings as they change.</summary>
public static class Panel
{
    static readonly HttpClient http = new() { Timeout = Timeout.InfiniteTimeSpan };

    static string Str(JsonElement e, string name, string fallback = "") =>
        e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? fallback : fallback;
    static bool Bool(JsonElement e, string name) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.True;
    static long Num(JsonElement e, string name, long fallback) =>
        e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? (long)v.GetDouble() : fallback;
    static JsonElement Obj(JsonElement e, string name) =>
        e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Object ? v : default;

    public static PanelSettings Parse(JsonElement state)
    {
        var links = Obj(state, "links");
        var ctl = Obj(state, "musicCtl");
        var fire = Obj(state, "fire");
        return new PanelSettings
        {
            Twitch = Str(links, "twitch"), Kick = Str(links, "kick"),
            Skip = Bool(ctl, "skip"), Vote = Bool(ctl, "vote"),
            Needed = (int)Math.Clamp(Num(ctl, "needed", 5), 2, 100), Cooldown = (int)Math.Clamp(Num(ctl, "cooldown", 20), 0, 600),
            SkipCmd = Str(ctl, "skipCmd", "!skip"), VoteCmd = Str(ctl, "voteCmd", "!voteskip"),
            NextAt = Num(fire, "musicnext", 0),
        };
    }

    /// <summary>Runs until cancelled: room id from the key, then the room's event stream; reconnects on its own.</summary>
    public static async Task FollowAsync(Func<(string Origin, string Key)?> link, Action<PanelSettings> onChange, CancellationToken stop)
    {
        while (!stop.IsCancellationRequested)
        {
            try
            {
                var l = link();
                if (l == null) { await Task.Delay(3000, stop); continue; }
                var claim = await http.PostAsJsonAsync($"{l.Value.Origin}/api/panel/claim", new { key = l.Value.Key }, stop);
                var room = (await claim.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: stop)).GetProperty("room").GetString();
                using var res = await http.GetAsync($"{l.Value.Origin}/api/panel/{room}/events?watch=1", HttpCompletionOption.ResponseHeadersRead, stop);
                using var reader = new StreamReader(await res.Content.ReadAsStreamAsync(stop));
                while (!stop.IsCancellationRequested && await reader.ReadLineAsync(stop) is { } line)
                {
                    if (!line.StartsWith("data: ")) continue;
                    using var doc = JsonDocument.Parse(line[6..]);
                    onChange(Parse(doc.RootElement.GetProperty("state")));
                    if (link()?.Key != l.Value.Key) break; // dock link changed: reconnect to the new room
                }
            }
            catch (OperationCanceledException) { return; }
            catch { /* server away: try again */ }
            try { await Task.Delay(5000, stop); } catch { return; }
        }
    }
}
