//! Updates from GitHub releases (tags `tool-v*` on skullboypl/Overlays-VXH).
//! On start the app installs a newer release by itself (setting "auto_update"); while running it only checks every
//! few hours and offers the update, so it never restarts in the middle of a stream.
//! A download is installed only when Windows says its Authenticode signature is valid and the signer is SkullMedia.

use std::path::{Path, PathBuf};
use std::time::Duration;

use serde_json::Value;

use crate::{config, state};

const RELEASES: &str = "https://api.github.com/repos/skullboypl/Overlays-VXH/releases?per_page=30";
const TAG_PREFIX: &str = "tool-v";
/// Subject of the EV certificate the releases are signed with (same as SmoothWizard).
const SIGNER: &str = "CN=SkullMedia Artur Spychalski";
const CHECK_EVERY: Duration = Duration::from_secs(6 * 3600);

#[derive(Clone, Debug, PartialEq)]
pub struct Release {
    pub version: String,
    pub url: String,
    pub page: String,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub enum Status {
    #[default]
    Idle,
    Checking,
    UpToDate,
    Available(Release),
    Installing(String),
    Failed(String),
}

/// "2.0.10" -> [2, 0, 10]; anything that is not a number counts as 0.
fn parse(v: &str) -> Vec<u64> {
    v.trim_start_matches('v').split(['.', '-', '+']).take(3).map(|p| p.parse().unwrap_or(0)).collect()
}
pub fn newer(candidate: &str, current: &str) -> bool {
    parse(candidate) > parse(current)
}

/// Newest published (not draft, not pre-release) app release with an .exe, if it is newer than this build.
pub fn pick(releases: &Value, current: &str) -> Option<Release> {
    releases
        .as_array()?
        .iter()
        .filter(|r| !r["draft"].as_bool().unwrap_or(true) && !r["prerelease"].as_bool().unwrap_or(true))
        .filter_map(|r| {
            let version = r["tag_name"].as_str()?.strip_prefix(TAG_PREFIX)?.to_string();
            let url = r["assets"].as_array()?.iter().find(|a| a["name"].as_str().is_some_and(|n| n.to_lowercase().ends_with(".exe")))?["browser_download_url"].as_str()?.to_string();
            Some(Release { version, url, page: r["html_url"].as_str().unwrap_or_default().to_string() })
        })
        .filter(|r| newer(&r.version, current))
        .max_by(|a, b| parse(&a.version).cmp(&parse(&b.version)))
}

fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(concat!("VXH-Overlays-Tool/", env!("CARGO_PKG_VERSION")))
        .timeout(Duration::from_secs(120))
        .build()
        .expect("http client")
}

pub async fn check() -> Result<Option<Release>, String> {
    // VXH_UPDATE_URL: a local stand-in for the GitHub API in tests.
    let url = std::env::var("VXH_UPDATE_URL").unwrap_or_else(|_| RELEASES.to_string());
    let res = http().get(url).header("Accept", "application/vnd.github+json").send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("GitHub {}", res.status().as_u16()));
    }
    let list: Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(pick(&list, env!("CARGO_PKG_VERSION")))
}

/// Windows' own Authenticode check of a file, through PowerShell (no window). True only for a valid signature by SIGNER.
#[cfg(windows)]
fn signed_by_us(path: &Path) -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let script = format!(
        "$s = Get-AuthenticodeSignature -LiteralPath '{}'; if ($s.Status -eq 'Valid') {{ $s.SignerCertificate.Subject }}",
        path.display().to_string().replace('\'', "''")
    );
    let Ok(out) = std::process::Command::new("powershell").args(["-NoProfile", "-NonInteractive", "-Command", &script]).creation_flags(CREATE_NO_WINDOW).output() else { return false };
    String::from_utf8_lossy(&out.stdout).trim().starts_with(SIGNER)
}
#[cfg(not(windows))]
fn signed_by_us(_path: &Path) -> bool {
    false
}

fn exe() -> Option<PathBuf> {
    std::env::current_exe().ok()
}
fn old_copy(exe: &Path) -> PathBuf {
    exe.with_extension("old.exe")
}

/// Removes the copy left behind by the previous update.
pub fn cleanup() {
    if let Some(e) = exe() {
        let _ = std::fs::remove_file(old_copy(&e));
    }
}

/// Downloads, checks the signature, swaps the .exe (a running .exe can be renamed, not overwritten) and starts the new
/// one a moment after this process has quit. Returns only on failure.
pub async fn install(release: &Release, hidden: bool) -> String {
    let set = |s: Status| state::with(|st| st.update = s);
    set(Status::Installing(release.version.clone()));
    let Some(exe) = exe() else { return "nie znam ścieżki aplikacji".into() };
    let tmp = std::env::temp_dir().join(format!("vxh-overlays-tool-{}.exe", release.version));
    let bytes = match http().get(&release.url).send().await.and_then(|r| r.error_for_status()) {
        Ok(r) => match r.bytes().await {
            Ok(b) => b,
            Err(e) => return e.to_string(),
        },
        Err(e) => return e.to_string(),
    };
    if bytes.len() < 500_000 || std::fs::write(&tmp, &bytes).is_err() {
        return "pobrany plik jest uszkodzony".into();
    }
    if !signed_by_us(&tmp) {
        let _ = std::fs::remove_file(&tmp);
        return "pobrany plik nie ma ważnego podpisu SkullMedia, pomijam".into();
    }
    let old = old_copy(&exe);
    let _ = std::fs::remove_file(&old);
    if std::fs::rename(&exe, &old).is_err() {
        return "nie mogę podmienić pliku aplikacji (brak uprawnień do folderu?)".into();
    }
    if std::fs::copy(&tmp, &exe).is_err() {
        let _ = std::fs::rename(&old, &exe);
        return "nie mogę zapisać nowej wersji".into();
    }
    let _ = std::fs::remove_file(&tmp);
    state::log(format!("Zainstalowano wersję {}, uruchamiam ponownie", release.version));
    restart(&exe, hidden)
}

/// Starts the new .exe after this one has quit (the single-instance mutex must be free), then quits.
fn restart(exe: &Path, hidden: bool) -> ! {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let cmd = format!("ping -n 3 127.0.0.1 >nul & start \"\" \"{}\"{}", exe.display(), if hidden { " --tray" } else { "" });
        // raw_arg: cmd.exe does not understand the \" escaping Rust would add around a quoted path.
        let _ = std::process::Command::new("cmd").raw_arg(format!("/C \"{cmd}\"")).creation_flags(CREATE_NO_WINDOW).spawn();
    }
    let _ = exe;
    let _ = hidden;
    std::process::exit(0)
}

/// Runs for the whole life of the app: install on start when allowed, then check every few hours and only offer.
pub async fn run(started_hidden: bool) {
    cleanup();
    tokio::time::sleep(Duration::from_secs(8)).await;
    let mut first = true;
    loop {
        state::with(|s| s.update = Status::Checking);
        match check().await {
            Ok(Some(r)) => {
                // Debug builds never replace themselves.
                if first && config::get().auto_update && !cfg!(debug_assertions) {
                    let err = install(&r, started_hidden).await;
                    state::log(format!("Aktualizacja do {} nie udała się: {err}", r.version));
                    state::with(|s| s.update = Status::Failed(err));
                } else {
                    state::log(format!("Dostępna nowa wersja {}", r.version));
                    state::with(|s| s.update = Status::Available(r));
                }
            }
            Ok(None) => state::with(|s| s.update = Status::UpToDate),
            Err(e) => state::with(|s| s.update = Status::Failed(e)),
        }
        first = false;
        tokio::time::sleep(CHECK_EVERY).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn versions() {
        assert!(newer("2.0.1", "2.0.0"));
        assert!(newer("2.1.0", "2.0.9"));
        assert!(newer("2.0.10", "2.0.9"));
        assert!(!newer("2.0.0", "2.0.0"));
        assert!(!newer("1.9.9", "2.0.0"));
    }

    #[test]
    fn picks_newest_published_tool_release() {
        let exe = |v: &str| json!([{ "name": "VXH.Overlays.Tool.exe", "browser_download_url": format!("https://x/{v}.exe") }]);
        let list = json!([
            { "tag_name": "tool-v2.0.3", "draft": false, "prerelease": true, "assets": exe("203"), "html_url": "" },
            { "tag_name": "tool-v2.0.2", "draft": false, "prerelease": false, "assets": exe("202"), "html_url": "" },
            { "tag_name": "tool-v2.0.1", "draft": false, "prerelease": false, "assets": exe("201"), "html_url": "" },
            { "tag_name": "v9.9.9", "draft": false, "prerelease": false, "assets": exe("site"), "html_url": "" },
            { "tag_name": "tool-v2.0.4", "draft": true, "prerelease": false, "assets": exe("204"), "html_url": "" },
            { "tag_name": "tool-v2.0.5", "draft": false, "prerelease": false, "assets": [], "html_url": "" }
        ]);
        assert_eq!(pick(&list, "2.0.0").map(|r| r.version), Some("2.0.2".into()));
        assert_eq!(pick(&list, "2.0.2"), None);
    }
}
