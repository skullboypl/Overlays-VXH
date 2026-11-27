//! The OBS panel server: claim the room for the dock key, follow its state live (Server-Sent Events, read-only),
//! and post now playing, TikTok chat and dock settings with the key.

use std::time::Duration;

use futures_util::StreamExt;
use serde_json::{json, Value};

use crate::config;
use crate::state::{self, PanelSettings, PanelStatus};

pub fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(concat!("VXH-Overlays-Tool/", env!("CARGO_PKG_VERSION")))
        .timeout(Duration::from_secs(10))
        .build()
        .expect("http client")
}

/// The current dock link as (origin, key), or None.
pub fn link() -> Option<(String, String)> {
    config::parse_dock_link(&config::get().dock_link)
}

/// POST /api/panel/<action> with the key. Returns the HTTP status (0 = no connection).
pub async fn post(client: &reqwest::Client, action: &str, mut body: Value) -> u16 {
    let Some((origin, key)) = link() else { return 0 };
    body["key"] = json!(key);
    match client.post(format!("{origin}/api/panel/{action}")).json(&body).send().await {
        Ok(r) => r.status().as_u16(),
        Err(_) => 0,
    }
}

/// Dock settings changed from the app window (same patch the dock sends).
pub async fn update(patch: Value) -> u16 {
    post(&http(), "update", json!({ "patch": patch })).await
}

fn s(v: &Value, k: &str, d: &str) -> String {
    v.get(k).and_then(|x| x.as_str()).unwrap_or(d).to_string()
}
fn n(v: &Value, k: &str, d: i64) -> i64 {
    v.get(k).and_then(|x| x.as_f64()).map(|x| x as i64).unwrap_or(d)
}

pub fn parse_settings(state: &Value) -> PanelSettings {
    let links = state.get("links").cloned().unwrap_or(Value::Null);
    let ctl = state.get("musicCtl").cloned().unwrap_or(Value::Null);
    let fire = state.get("fire").cloned().unwrap_or(Value::Null);
    PanelSettings {
        twitch: s(&links, "twitch", ""),
        kick: s(&links, "kick", ""),
        skip: ctl.get("skip").and_then(|x| x.as_bool()).unwrap_or(false),
        vote: ctl.get("vote").and_then(|x| x.as_bool()).unwrap_or(false),
        needed: n(&ctl, "needed", 5).clamp(2, 100) as usize,
        cooldown: n(&ctl, "cooldown", 20).clamp(0, 600) as u64,
        skip_cmd: s(&ctl, "skipCmd", "!skip"),
        vote_cmd: s(&ctl, "voteCmd", "!voteskip"),
        next_at: n(&fire, "musicnext", 0),
    }
}

/// Runs forever: follows whichever dock link is set, reconnects on its own, and calls `on_settings` on every change.
pub async fn follow(on_settings: impl Fn(PanelSettings) + Send + 'static) {
    let client = reqwest::Client::builder().user_agent(concat!("VXH-Overlays-Tool/", env!("CARGO_PKG_VERSION"))).build().expect("http");
    let mut changes = config::watch();
    loop {
        let Some((origin, key)) = link() else {
            state::with(|s| { s.panel = PanelStatus::NoLink; s.room.clear(); });
            let _ = changes.changed().await;
            continue;
        };
        state::with(|s| s.panel = PanelStatus::Connecting);
        let result: Result<(), String> = async {
            let res = client.post(format!("{origin}/api/panel/claim")).json(&json!({ "key": key })).timeout(Duration::from_secs(10)).send().await.map_err(|e| e.to_string())?;
            if res.status().as_u16() == 403 {
                state::with(|s| s.panel = PanelStatus::Revoked);
                return Err("revoked".into());
            }
            let claim: Value = res.json().await.map_err(|e| e.to_string())?;
            let room = claim.get("room").and_then(|r| r.as_str()).ok_or("no room")?.to_string();
            if let Some(st) = claim.get("state") {
                on_settings(parse_settings(st));
            }
            let res = client.get(format!("{origin}/api/panel/{room}/events?watch=1")).send().await.map_err(|e| e.to_string())?;
            state::with(|s| { s.panel = PanelStatus::Connected; s.room = room.clone(); });
            state::log("Połączono z Panelem OBS");
            let mut stream = res.bytes_stream();
            let mut buf = String::new();
            let mut event = String::new();
            loop {
                tokio::select! {
                    chunk = stream.next() => {
                        let Some(chunk) = chunk else { return Err("stream ended".into()) };
                        buf.push_str(&String::from_utf8_lossy(&chunk.map_err(|e| e.to_string())?));
                        while let Some(i) = buf.find('\n') {
                            let line = buf[..i].trim_end_matches('\r').to_string();
                            buf.drain(..=i);
                            if line.is_empty() { event.clear(); continue; }
                            if let Some(e) = line.strip_prefix("event: ") { event = e.to_string(); continue; }
                            // Only the unnamed messages carry the state; "tiktok" ones are for overlays.
                            if let (true, Some(data)) = (event.is_empty(), line.strip_prefix("data: ")) {
                                if let Ok(v) = serde_json::from_str::<Value>(data) {
                                    if let Some(st) = v.get("state") { on_settings(parse_settings(st)); }
                                }
                            }
                        }
                    }
                    _ = changes.changed() => {
                        if link().map(|l| l.1) != Some(key.clone()) { return Ok(()); }
                    }
                    _ = tokio::time::sleep(Duration::from_secs(70)) => return Err("no data".into()),
                }
            }
        }
        .await;
        match result {
            Ok(()) => continue,
            Err(e) if e == "revoked" => {
                state::log("Ten link docka został zastąpiony nowym kluczem w panelu. Połącz aplikację jeszcze raz.");
                let _ = changes.changed().await;
            }
            Err(e) => {
                state::with(|s| s.panel = PanelStatus::Offline(e));
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(5)) => {}
                    _ = changes.changed() => {}
                }
            }
        }
    }
}
