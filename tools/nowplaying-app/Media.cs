using Windows.Graphics.Imaging;
using Windows.Media.Control;
using Windows.Storage.Streams;

namespace VxhNowPlaying;

public sealed record Track(string Title, string Artist, string Album, string App, bool Playing, double Position, double Duration);

/// <summary>Reads the system media session (the one in the Windows volume flyout) without any player API or login.</summary>
public sealed class Media
{
    GlobalSystemMediaTransportControlsSessionManager? manager;

    static readonly string[] Browsers = ["chrome", "msedge", "firefox", "opera", "brave", "vivaldi", "arc"];
    static readonly string[] Players = ["spotify", "applemusic", "itunes", "tidal", "deezer", "foobar", "vlc", "aimp", "musicbee", "winamp", "zunemusic", "media.player", "amazon", "youtube music", "ytmdesktop"];

    static bool Matches(string appId, string source)
    {
        var id = appId.ToLowerInvariant();
        return source switch
        {
            "spotify" => id.Contains("spotify"),
            "browser" => Browsers.Any(id.Contains),
            "music" => Players.Any(id.Contains),
            _ => true,
        };
    }

    static string AppName(string appId)
    {
        var id = appId.ToLowerInvariant();
        if (id.Contains("spotify")) return "Spotify";
        if (id.Contains("chrome")) return "Chrome";
        if (id.Contains("msedge")) return "Edge";
        if (id.Contains("firefox")) return "Firefox";
        if (id.Contains("applemusic") || id.Contains("itunes")) return "Apple Music";
        if (id.Contains("tidal")) return "Tidal";
        if (id.Contains("deezer")) return "Deezer";
        if (id.Contains("vlc")) return "VLC";
        var name = Path.GetFileNameWithoutExtension(appId.Split('!')[0]);
        return name.Length > 40 ? name[..40] : name;
    }

    /// <summary>The session to show: a playing one from the chosen source first, then the system's current one.</summary>
    async Task<GlobalSystemMediaTransportControlsSession?> PickAsync(string source)
    {
        manager ??= await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        var sessions = manager.GetSessions().Where(s => Matches(s.SourceAppUserModelId, source)).ToList();
        var playing = sessions.FirstOrDefault(s => s.GetPlaybackInfo().PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing);
        if (playing != null) return playing;
        var current = manager.GetCurrentSession();
        if (current != null && Matches(current.SourceAppUserModelId, source)) return current;
        return sessions.FirstOrDefault();
    }

    public async Task<(Track? Track, IRandomAccessStreamReference? Thumb)> ReadAsync(string source)
    {
        var s = await PickAsync(source);
        if (s == null) return (null, null);
        var props = await s.TryGetMediaPropertiesAsync();
        if (props == null || string.IsNullOrWhiteSpace(props.Title)) return (null, null);
        var tl = s.GetTimelineProperties();
        var playing = s.GetPlaybackInfo().PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;
        var duration = Math.Max(0, (tl.EndTime - tl.StartTime).TotalSeconds);
        var position = Math.Max(0, (tl.Position - tl.StartTime).TotalSeconds);
        // The timeline is only updated now and then: move it on by the time since its last update.
        if (playing && tl.LastUpdatedTime.Year > 2000) position += Math.Max(0, (DateTimeOffset.Now - tl.LastUpdatedTime).TotalSeconds);
        if (duration > 0) position = Math.Min(position, duration);
        var artist = string.IsNullOrWhiteSpace(props.Artist) ? props.AlbumArtist : props.Artist;
        return (new Track(props.Title, artist ?? "", props.AlbumTitle ?? "", AppName(s.SourceAppUserModelId), playing, position, duration), props.Thumbnail);
    }

    /// <summary>"Next track" on the session being shown (works in Spotify, YouTube playlists and most players).</summary>
    public async Task<bool> SkipAsync(string source)
    {
        var s = await PickAsync(source);
        return s != null && await s.TrySkipNextAsync();
    }

    /// <summary>The cover as a small JPEG data URL (at most 200 px), or null.</summary>
    public static async Task<string?> CoverAsync(IRandomAccessStreamReference? thumb)
    {
        if (thumb == null) return null;
        try
        {
            using var input = await thumb.OpenReadAsync();
            var decoder = await BitmapDecoder.CreateAsync(input);
            var scale = Math.Min(1.0, 200.0 / Math.Max(decoder.PixelWidth, decoder.PixelHeight));
            var transform = new BitmapTransform
            {
                ScaledWidth = (uint)Math.Max(1, decoder.PixelWidth * scale),
                ScaledHeight = (uint)Math.Max(1, decoder.PixelHeight * scale),
                InterpolationMode = BitmapInterpolationMode.Fant,
            };
            var pixels = await decoder.GetPixelDataAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Ignore, transform, ExifOrientationMode.RespectExifOrientation, ColorManagementMode.DoNotColorManage);
            using var output = new InMemoryRandomAccessStream();
            var props = new BitmapPropertySet { { "ImageQuality", new BitmapTypedValue(0.82, Windows.Foundation.PropertyType.Single) } };
            var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.JpegEncoderId, output, props);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Ignore, transform.ScaledWidth, transform.ScaledHeight, 96, 96, pixels.DetachPixelData());
            await encoder.FlushAsync();
            var bytes = new byte[output.Size];
            output.Seek(0);
            using (var reader = new DataReader(output.GetInputStreamAt(0)))
            {
                await reader.LoadAsync((uint)output.Size);
                reader.ReadBytes(bytes);
            }
            return bytes.Length < 60_000 ? "data:image/jpeg;base64," + Convert.ToBase64String(bytes) : null;
        }
        catch { return null; }
    }
}
