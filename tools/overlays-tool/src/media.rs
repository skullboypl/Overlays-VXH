//! What Windows shows as "now playing" (the media flyout): Spotify, YouTube in the browser, Apple Music, Tidal, VLC…
//! No player API, no login. WinRT runs on its own thread; the rest of the app asks it through a channel.

use crate::state::Track;

#[cfg(windows)]
mod win {
    use std::sync::mpsc;
    use std::sync::OnceLock;

    use windows::core::HSTRING;
    use windows::Graphics::Imaging::{BitmapAlphaMode, BitmapDecoder, BitmapInterpolationMode, BitmapPixelFormat, BitmapTransform, ColorManagementMode, ExifOrientationMode};
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session, GlobalSystemMediaTransportControlsSessionManager as Manager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    };
    use windows::Storage::Streams::IRandomAccessStreamReference;

    use super::Track;

    const BROWSERS: [&str; 7] = ["chrome", "msedge", "firefox", "opera", "brave", "vivaldi", "arc"];
    const PLAYERS: [&str; 15] = ["spotify", "applemusic", "itunes", "tidal", "deezer", "foobar", "vlc", "aimp", "musicbee", "winamp", "zunemusic", "media.player", "amazon", "youtube music", "ytmdesktop"];

    fn matches(app: &str, source: &str) -> bool {
        let id = app.to_lowercase();
        match source {
            "spotify" => id.contains("spotify"),
            "browser" => BROWSERS.iter().any(|b| id.contains(b)),
            "music" => PLAYERS.iter().any(|p| id.contains(p)),
            _ => true,
        }
    }

    fn app_name(app: &str) -> String {
        let id = app.to_lowercase();
        for (k, v) in [("spotify", "Spotify"), ("chrome", "Chrome"), ("msedge", "Edge"), ("firefox", "Firefox"), ("applemusic", "Apple Music"), ("itunes", "Apple Music"), ("tidal", "Tidal"), ("deezer", "Deezer"), ("vlc", "VLC"), ("opera", "Opera"), ("brave", "Brave")] {
            if id.contains(k) {
                return v.into();
            }
        }
        let base = app.split('!').next().unwrap_or(app);
        let name = std::path::Path::new(base).file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        name.chars().take(40).collect()
    }

    pub enum Cmd {
        Read(String, bool, tokio::sync::oneshot::Sender<Option<(Track, Option<String>)>>),
        Skip(String, tokio::sync::oneshot::Sender<bool>),
    }

    static TX: OnceLock<mpsc::Sender<Cmd>> = OnceLock::new();

    pub fn sender() -> &'static mpsc::Sender<Cmd> {
        TX.get_or_init(|| {
            let (tx, rx) = mpsc::channel::<Cmd>();
            std::thread::spawn(move || {
                unsafe {
                    let _ = windows::Win32::System::WinRT::RoInitialize(windows::Win32::System::WinRT::RO_INIT_MULTITHREADED);
                }
                let mut manager: Option<Manager> = None;
                for cmd in rx {
                    if manager.is_none() {
                        manager = Manager::RequestAsync().and_then(|op| op.get()).ok();
                    }
                    match cmd {
                        Cmd::Read(source, cover, reply) => {
                            let _ = reply.send(manager.as_ref().and_then(|m| read(m, &source, cover).ok().flatten()));
                        }
                        Cmd::Skip(source, reply) => {
                            let ok = manager.as_ref().and_then(|m| pick(m, &source).ok().flatten()).and_then(|s| s.TrySkipNextAsync().and_then(|op| op.get()).ok()).unwrap_or(false);
                            let _ = reply.send(ok);
                        }
                    }
                }
            });
            tx
        })
    }

    fn app_of(s: &Session) -> String {
        s.SourceAppUserModelId().map(|h: HSTRING| h.to_string()).unwrap_or_default()
    }
    fn is_playing(s: &Session) -> bool {
        s.GetPlaybackInfo().and_then(|p| p.PlaybackStatus()).map(|st| st == Status::Playing).unwrap_or(false)
    }

    /// A playing session from the chosen source first, then the system's current one, then any from the source.
    fn pick(m: &Manager, source: &str) -> windows::core::Result<Option<Session>> {
        let sessions: Vec<Session> = m.GetSessions()?.into_iter().filter(|s| matches(&app_of(s), source)).collect();
        if let Some(s) = sessions.iter().find(|s| is_playing(s)) {
            return Ok(Some(s.clone()));
        }
        if let Ok(cur) = m.GetCurrentSession() {
            if matches(&app_of(&cur), source) {
                return Ok(Some(cur));
            }
        }
        Ok(sessions.into_iter().next())
    }

    fn read(m: &Manager, source: &str, want_cover: bool) -> windows::core::Result<Option<(Track, Option<String>)>> {
        let Some(s) = pick(m, source)? else { return Ok(None) };
        let props = s.TryGetMediaPropertiesAsync()?.get()?;
        let title = props.Title()?.to_string();
        if title.trim().is_empty() {
            return Ok(None);
        }
        let tl = s.GetTimelineProperties()?;
        let playing = is_playing(&s);
        let start = tl.StartTime()?.Duration as f64 / 1e7;
        let duration = ((tl.EndTime()?.Duration as f64 / 1e7) - start).max(0.0);
        let mut position = ((tl.Position()?.Duration as f64 / 1e7) - start).max(0.0);
        // The timeline is only updated now and then: move it on by the time since its last update.
        let updated = tl.LastUpdatedTime()?.UniversalTime;
        if playing && updated > 0 {
            let now = (std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs_f64()).unwrap_or(0.0) + 11_644_473_600.0) * 1e7;
            position += ((now - updated as f64) / 1e7).max(0.0);
        }
        if duration > 0.0 {
            position = position.min(duration);
        }
        let artist = props.Artist()?.to_string();
        let artist = if artist.trim().is_empty() { props.AlbumArtist()?.to_string() } else { artist };
        let track = Track { title, artist, album: props.AlbumTitle()?.to_string(), app: app_name(&app_of(&s)), playing, position, duration };
        let cover = if want_cover { props.Thumbnail().ok().and_then(|t| cover(&t)) } else { None };
        Ok(Some((track, cover)))
    }

    /// The cover as a small JPEG data URL (at most 200 px).
    fn cover(thumb: &IRandomAccessStreamReference) -> Option<String> {
        let stream = thumb.OpenReadAsync().ok()?.get().ok()?;
        let decoder = BitmapDecoder::CreateAsync(&stream).ok()?.get().ok()?;
        let (w, h) = (decoder.PixelWidth().ok()?, decoder.PixelHeight().ok()?);
        let scale = (200.0 / w.max(h).max(1) as f64).min(1.0);
        let (sw, sh) = (((w as f64 * scale) as u32).max(1), ((h as f64 * scale) as u32).max(1));
        let transform = BitmapTransform::new().ok()?;
        transform.SetScaledWidth(sw).ok()?;
        transform.SetScaledHeight(sh).ok()?;
        transform.SetInterpolationMode(BitmapInterpolationMode::Fant).ok()?;
        let pixels = decoder
            .GetPixelDataTransformedAsync(BitmapPixelFormat::Rgba8, BitmapAlphaMode::Ignore, &transform, ExifOrientationMode::RespectExifOrientation, ColorManagementMode::DoNotColorManage)
            .ok()?
            .get()
            .ok()?
            .DetachPixelData()
            .ok()?;
        super::jpeg_data_url(sw, sh, pixels.to_vec())
    }
}

/// RGBA pixels -> "data:image/jpeg;base64,…" (None when too big for the panel server).
#[cfg_attr(not(windows), allow(dead_code))]
pub fn jpeg_data_url(w: u32, h: u32, rgba: Vec<u8>) -> Option<String> {
    let img = image::RgbaImage::from_raw(w, h, rgba)?;
    let rgb = image::DynamicImage::ImageRgba8(img).to_rgb8();
    let mut out = Vec::new();
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 82).encode_image(&rgb).ok()?;
    (out.len() < 60_000).then(|| format!("data:image/jpeg;base64,{}", base64::engine::general_purpose::STANDARD.encode(out)))
}

/// The track for the chosen source (all | spotify | browser | music), and its cover when asked.
pub async fn read(source: &str, with_cover: bool) -> Option<(Track, Option<String>)> {
    #[cfg(windows)]
    {
        let (tx, rx) = tokio::sync::oneshot::channel();
        win::sender().send(win::Cmd::Read(source.into(), with_cover, tx)).ok()?;
        rx.await.ok().flatten()
    }
    #[cfg(not(windows))]
    {
        let _ = (source, with_cover);
        // Outside Windows there is no media session: VXH_FAKE_TRACK="Title|Artist" lets the UI be tried out.
        let fake = std::env::var("VXH_FAKE_TRACK").ok()?;
        let (title, artist) = fake.split_once('|').unwrap_or((&fake, ""));
        Some((Track { title: title.into(), artist: artist.into(), album: String::new(), app: "Spotify".into(), playing: true, position: 42.0, duration: 200.0 }, None))
    }
}

/// "Next track" on the session being shown (works in Spotify, YouTube playlists and most players).
pub async fn skip(source: &str) -> bool {
    #[cfg(windows)]
    {
        let (tx, rx) = tokio::sync::oneshot::channel();
        if win::sender().send(win::Cmd::Skip(source.into(), tx)).is_err() {
            return false;
        }
        rx.await.unwrap_or(false)
    }
    #[cfg(not(windows))]
    {
        let _ = source;
        std::env::var("VXH_FAKE_TRACK").is_ok()
    }
}
