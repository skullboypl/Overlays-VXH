//! Read-only chat for the music commands, without login: Twitch's anonymous IRC WebSocket and Kick's public Pusher
//! channel. Nothing is ever written to chat.

use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use tokio::sync::watch;
use tokio_tungstenite::tungstenite::Message;

/// One chat line: who wrote it and whether they may skip right away (moderator / broadcaster).
#[derive(Clone, Debug, PartialEq)]
pub struct Line {
    pub platform: &'static str,
    pub user: String,
    pub privileged: bool,
    pub text: String,
}

/// One IRC line with tags -> chat line (None for anything but PRIVMSG).
pub fn parse_twitch(line: &str) -> Option<Line> {
    let rest = line.strip_prefix('@')?;
    let (tags, rest) = rest.split_once(' ')?;
    let i = rest.find(" PRIVMSG #")?;
    let text = rest[i..].split_once(" :")?.1.to_string();
    let mut badges = "";
    let mut name = "";
    let mut mod_flag = false;
    for t in tags.split(';') {
        match t.split_once('=') {
            Some(("badges", v)) => badges = v,
            Some(("display-name", v)) => name = v,
            Some(("mod", "1")) => mod_flag = true,
            _ => {}
        }
    }
    let privileged = mod_flag || badges.split(',').any(|b| b.starts_with("broadcaster/") || b.starts_with("moderator/"));
    Some(Line { platform: "twitch", user: if name.is_empty() { "?".into() } else { name.into() }, privileged, text })
}

pub fn parse_kick(data: &Value) -> Option<Line> {
    let sender = data.get("sender")?;
    let user = sender.get("username").and_then(|u| u.as_str()).unwrap_or("?").to_string();
    let privileged = sender
        .pointer("/identity/badges")
        .and_then(|b| b.as_array())
        .map(|b| b.iter().any(|x| matches!(x.get("type").and_then(|t| t.as_str()), Some("moderator" | "broadcaster"))))
        .unwrap_or(false);
    let text = data.get("content").and_then(|c| c.as_str()).unwrap_or("").to_string();
    Some(Line { platform: "kick", user, privileged, text })
}

async fn wait_or_stop(d: Duration, stop: &mut watch::Receiver<bool>) -> bool {
    tokio::select! {
        _ = tokio::time::sleep(d) => *stop.borrow(),
        _ = stop.changed() => true,
    }
}

/// Twitch: reconnects until `stop` flips.
pub async fn twitch(channel: String, on_line: impl Fn(Line) + Send + Sync, mut stop: watch::Receiver<bool>) {
    let ch = channel.trim().trim_start_matches('#').to_lowercase();
    if ch.len() < 2 {
        return;
    }
    while !*stop.borrow() {
        let run = async {
            let (ws, _) = tokio_tungstenite::connect_async("wss://irc-ws.chat.twitch.tv:443").await.map_err(|e| e.to_string())?;
            let (mut tx, mut rx) = ws.split();
            for cmd in ["CAP REQ :twitch.tv/tags twitch.tv/commands".to_string(), "PASS SCHMOOPIIE".into(), format!("NICK justinfan{}", 10000 + rand::random::<u32>() % 80000), format!("JOIN #{ch}")] {
                tx.send(Message::Text(cmd.into())).await.map_err(|e| e.to_string())?;
            }
            while let Some(m) = rx.next().await {
                let Ok(Message::Text(t)) = m else { if m.is_err() { break } else { continue } };
                for line in t.split("\r\n").filter(|l| !l.is_empty()) {
                    if let Some(rest) = line.strip_prefix("PING") {
                        tx.send(Message::Text(format!("PONG{rest}").into())).await.map_err(|e| e.to_string())?;
                    } else if let Some(l) = parse_twitch(line) {
                        on_line(l);
                    }
                }
            }
            Ok::<(), String>(())
        };
        tokio::select! {
            _ = run => {}
            _ = stop.changed() => return,
        }
        if wait_or_stop(Duration::from_secs(5), &mut stop).await {
            return;
        }
    }
}

/// Kick: the chatroom id comes from the panel server (/api/followers), messages from Pusher.
pub async fn kick(origin: String, channel: String, on_line: impl Fn(Line) + Send + Sync, mut stop: watch::Receiver<bool>) {
    let slug = channel.trim().to_lowercase();
    if slug.len() < 2 {
        return;
    }
    let http = crate::panel::http();
    while !*stop.borrow() {
        let run = async {
            let url = format!("{origin}/api/followers?platform=kick&channel={}", url::form_urlencoded::byte_serialize(slug.as_bytes()).collect::<String>());
            let info: Value = http.get(url).send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
            let room = info.get("chatroom").and_then(|c| c.as_i64()).unwrap_or(0);
            if room == 0 {
                tokio::time::sleep(Duration::from_secs(60)).await;
                return Ok(());
            }
            let (ws, _) = tokio_tungstenite::connect_async("wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false").await.map_err(|e| e.to_string())?;
            let (mut tx, mut rx) = ws.split();
            let sub = serde_json::json!({ "event": "pusher:subscribe", "data": { "auth": "", "channel": format!("chatrooms.{room}.v2") } });
            tx.send(Message::Text(sub.to_string().into())).await.map_err(|e| e.to_string())?;
            while let Some(m) = rx.next().await {
                let Ok(Message::Text(t)) = m else { if m.is_err() { break } else { continue } };
                let Ok(v) = serde_json::from_str::<Value>(&t) else { continue };
                let ev = v.get("event").and_then(|e| e.as_str()).unwrap_or("");
                if ev == "pusher:ping" {
                    tx.send(Message::Text(r#"{"event":"pusher:pong","data":{}}"#.into())).await.map_err(|e| e.to_string())?;
                } else if ev.ends_with("ChatMessageEvent") {
                    let data = v.get("data").and_then(|d| d.as_str()).and_then(|d| serde_json::from_str::<Value>(d).ok());
                    if let Some(l) = data.as_ref().and_then(parse_kick) {
                        on_line(l);
                    }
                }
            }
            Ok::<(), String>(())
        };
        tokio::select! {
            _ = run => {}
            _ = stop.changed() => return,
        }
        if wait_or_stop(Duration::from_secs(5), &mut stop).await {
            return;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn twitch_lines() {
        let l = parse_twitch("@badge-info=;badges=moderator/1;color=#FF0000;display-name=Modek;mod=1 :modek!modek@modek.tmi.twitch.tv PRIVMSG #chan :!skip teraz").unwrap();
        assert_eq!((l.user.as_str(), l.privileged, l.text.as_str()), ("Modek", true, "!skip teraz"));
        let l = parse_twitch("@badges=subscriber/12;display-name=Widz;mod=0 :w!w@w PRIVMSG #chan :!voteskip").unwrap();
        assert!(!l.privileged);
        assert_eq!(parse_twitch(":tmi.twitch.tv 001 justinfan :Welcome"), None);
    }
    #[test]
    fn kick_lines() {
        let v: Value = serde_json::from_str(r#"{"content":"!skip","sender":{"username":"boss","identity":{"badges":[{"type":"broadcaster"}]}}}"#).unwrap();
        let l = parse_kick(&v).unwrap();
        assert!(l.privileged && l.user == "boss");
    }
}
