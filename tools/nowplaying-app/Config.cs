using System.Text.Json;

namespace VxhNowPlaying;

/// <summary>Settings in %APPDATA%\VXH Now Playing\config.json. The dock link holds the panel key: it never leaves this PC except to the panel server.</summary>
public sealed class Config
{
    public string DockLink { get; set; } = "";
    /// <summary>all | spotify | browser | music (Spotify, Apple Music, Tidal, Deezer, foobar, VLC, AIMP, MusicBee...)</summary>
    public string Source { get; set; } = "all";
    public bool Autostart { get; set; } = true;

    static string Dir => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "VXH Now Playing");
    static string FilePath => Path.Combine(Dir, "config.json");

    public static Config Load()
    {
        try { return JsonSerializer.Deserialize<Config>(File.ReadAllText(FilePath)) ?? new Config(); }
        catch { return new Config(); }
    }

    public void Save()
    {
        Directory.CreateDirectory(Dir);
        File.WriteAllText(FilePath, JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true }));
    }

    /// <summary>"https://overlays.vxh.pl/panel/dock#k=KEY" -> (origin, key); null when the text is not a dock link.</summary>
    public static (string Origin, string Key)? ParseDockLink(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var m = System.Text.RegularExpressions.Regex.Match(text.Trim(), @"^(https?://[^/\s#?]+)/panel/dock#k=([A-Za-z0-9_-]{43})$");
        return m.Success ? (m.Groups[1].Value, m.Groups[2].Value) : null;
    }
}
