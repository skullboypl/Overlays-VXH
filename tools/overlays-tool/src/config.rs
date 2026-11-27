//! Settings in %APPDATA%\VXH Overlays Tool\config.json. The dock link holds the panel key: it never leaves this PC
//! except to the panel server itself.

use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

pub const APP_NAME: &str = "VXH Overlays Tool";
pub const DEFAULT_ORIGIN: &str = "https://overlays.vxh.pl";

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Config {
    pub dock_link: String,
    /// all | spotify | browser | music
    pub source: String,
    pub autostart: bool,
    pub tiktok_user: String,
    pub tiktok_on: bool,
    /// Install a newer GitHub release by itself when the app starts.
    pub auto_update: bool,
}

impl Default for Config {
    fn default() -> Self {
        Config { dock_link: String::new(), source: "all".into(), autostart: true, tiktok_user: String::new(), tiktok_on: true, auto_update: true }
    }
}

pub fn dir() -> PathBuf {
    dirs::config_dir().unwrap_or_else(std::env::temp_dir).join(APP_NAME)
}
fn file() -> PathBuf {
    dir().join("config.json")
}
/// A second copy of the app started from a "vxh-tool://" link leaves the link here for the running one.
pub fn incoming_file() -> PathBuf {
    dir().join("incoming.txt")
}

/// The old C# app ("VXH Now Playing") kept {DockLink, Source, Autostart}: take them over once.
fn migrate() -> Option<Config> {
    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct Old {
        dock_link: Option<String>,
        source: Option<String>,
        autostart: Option<bool>,
    }
    let path = dirs::config_dir()?.join("VXH Now Playing").join("config.json");
    let old: Old = serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()?;
    Some(Config {
        dock_link: old.dock_link.unwrap_or_default(),
        source: old.source.unwrap_or_else(|| "all".into()),
        autostart: old.autostart.unwrap_or(true),
        ..Config::default()
    })
}

fn load() -> Config {
    match std::fs::read_to_string(file()) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => {
            let c = migrate().unwrap_or_default();
            let _ = save_to_disk(&c);
            c
        }
    }
}

fn save_to_disk(c: &Config) -> std::io::Result<()> {
    std::fs::create_dir_all(dir())?;
    std::fs::write(file(), serde_json::to_string_pretty(c).unwrap_or_default())
}

static CONFIG: OnceLock<Mutex<Config>> = OnceLock::new();
static VERSION: OnceLock<tokio::sync::watch::Sender<u64>> = OnceLock::new();

fn cell() -> &'static Mutex<Config> {
    CONFIG.get_or_init(|| Mutex::new(load()))
}
fn version() -> &'static tokio::sync::watch::Sender<u64> {
    VERSION.get_or_init(|| tokio::sync::watch::channel(0).0)
}

pub fn get() -> Config {
    cell().lock().unwrap().clone()
}
/// Changes, saves and wakes up everyone who follows the settings.
pub fn update(f: impl FnOnce(&mut Config)) {
    let mut c = cell().lock().unwrap();
    let before = c.clone();
    f(&mut c);
    if *c != before {
        let _ = save_to_disk(&c);
        version().send_modify(|v| *v += 1);
    }
}
/// Fires after every change of the settings.
pub fn watch() -> tokio::sync::watch::Receiver<u64> {
    version().subscribe()
}

/// "https://overlays.vxh.pl/panel/dock#k=KEY" -> (origin, key). Also takes "vxh-tool://connect?link=<that link>".
pub fn parse_dock_link(text: &str) -> Option<(String, String)> {
    let text = text.trim();
    if let Some(rest) = text.strip_prefix("vxh-tool://") {
        let u = url::Url::parse(&format!("http://x/{rest}")).ok()?;
        let link = u.query_pairs().find(|(k, _)| k == "link")?.1.to_string();
        return parse_dock_link(&link);
    }
    // Only the real panel (or a local test server): a web page opening vxh-tool:// must not point the app
    // at its own server, which would then receive the streamer's songs and TikTok chat.
    let re = regex::Regex::new(r"^(https://overlays\.vxh\.pl|http://(?:localhost|127\.0\.0\.1)(?::\d+)?)/panel/dock#k=([A-Za-z0-9_-]{43})$").unwrap();
    let c = re.captures(text)?;
    Some((c[1].to_string(), c[2].to_string()))
}

pub fn origin() -> String {
    parse_dock_link(&get().dock_link).map(|(o, _)| o).unwrap_or_else(|| DEFAULT_ORIGIN.into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dock_links() {
        let key = "A".repeat(43);
        let link = format!("https://overlays.vxh.pl/panel/dock#k={key}");
        assert_eq!(parse_dock_link(&link), Some(("https://overlays.vxh.pl".into(), key.clone())));
        let enc = url::form_urlencoded::byte_serialize(link.as_bytes()).collect::<String>();
        assert_eq!(parse_dock_link(&format!("vxh-tool://connect?link={enc}")), Some(("https://overlays.vxh.pl".into(), key)));
        assert_eq!(parse_dock_link("https://evil.example/panel/dock#k=short"), None);
        // A valid key on another site is refused too (a page must not redirect the app to its own server).
        assert_eq!(parse_dock_link(&format!("https://evil.example/panel/dock#k={}", "A".repeat(43))), None);
        assert!(parse_dock_link(&format!("http://localhost:5188/panel/dock#k={}", "A".repeat(43))).is_some());
        assert_eq!(parse_dock_link("hello"), None);
    }
}
