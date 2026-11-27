//! What the window shows: filled by the background workers, read by the UI every frame.

use std::collections::VecDeque;
use std::sync::{Mutex, OnceLock};

use crate::{tiktok, update};

#[derive(Clone, Debug, PartialEq, Default)]
pub enum PanelStatus {
    #[default]
    NoLink,
    Connecting,
    Connected,
    /// The dock key was replaced in the panel: this link no longer works.
    Revoked,
    Offline(String),
}

/// What the app takes from the OBS panel: linked channels and the music-command settings from the dock.
#[derive(Clone, Debug, PartialEq)]
pub struct PanelSettings {
    pub twitch: String,
    pub kick: String,
    pub skip: bool,
    pub vote: bool,
    pub needed: usize,
    pub cooldown: u64,
    pub skip_cmd: String,
    pub vote_cmd: String,
    /// Server time of the dock's "next song" button.
    pub next_at: i64,
}
impl Default for PanelSettings {
    fn default() -> Self {
        PanelSettings { twitch: String::new(), kick: String::new(), skip: false, vote: false, needed: 5, cooldown: 20, skip_cmd: "!skip".into(), vote_cmd: "!voteskip".into(), next_at: 0 }
    }
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct Track {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub app: String,
    pub playing: bool,
    pub position: f64,
    pub duration: f64,
}

pub struct Shared {
    pub panel: PanelStatus,
    pub room: String,
    pub settings: PanelSettings,
    pub track: Option<Track>,
    pub music_sent: bool,
    pub votes: usize,
    pub last_skip: String,
    pub tiktok: tiktok::State,
    pub tiktok_detail: String,
    pub tiktok_count: u64,
    pub tiktok_last: String,
    pub chat_on: bool,
    pub update: update::Status,
    pub log: VecDeque<String>,
}

impl Default for Shared {
    fn default() -> Self {
        Shared {
            panel: PanelStatus::NoLink,
            room: String::new(),
            settings: PanelSettings::default(),
            track: None,
            music_sent: false,
            votes: 0,
            last_skip: String::new(),
            tiktok: tiktok::State::Off,
            tiktok_detail: String::new(),
            tiktok_count: 0,
            tiktok_last: String::new(),
            chat_on: false,
            update: update::Status::Idle,
            log: VecDeque::new(),
        }
    }
}

static SHARED: OnceLock<Mutex<Shared>> = OnceLock::new();
static REPAINT: OnceLock<Box<dyn Fn() + Send + Sync>> = OnceLock::new();

/// Reads or changes the shared state, then asks the window to redraw.
pub fn with<R>(f: impl FnOnce(&mut Shared) -> R) -> R {
    let r = f(&mut SHARED.get_or_init(Default::default).lock().unwrap());
    if let Some(p) = REPAINT.get() {
        p();
    }
    r
}
pub fn read<R>(f: impl FnOnce(&Shared) -> R) -> R {
    f(&SHARED.get_or_init(Default::default).lock().unwrap())
}
pub fn on_change(f: impl Fn() + Send + Sync + 'static) {
    let _ = REPAINT.set(Box::new(f));
}
pub fn log(line: impl Into<String>) {
    let line = line.into();
    with(|s| {
        let t = chrono_like_now();
        s.log.push_back(format!("{t}  {line}"));
        while s.log.len() > 60 {
            s.log.pop_front();
        }
    });
}
fn chrono_like_now() -> String {
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    // Local time is not worth a dependency here: UTC hh:mm:ss is enough to read the order of events.
    format!("{:02}:{:02}:{:02}", (secs / 3600) % 24, (secs / 60) % 60, secs % 60)
}
