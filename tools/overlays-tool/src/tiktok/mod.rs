//! TikTok LIVE chat, read from the streamer's own PC (their IP, their limits).
//!
//! TikTok has no public API for LIVE chat. This follows what tiktok-live-connector does:
//!  1. find the room id of the @user (TikTok's web API, or the /live page as a fallback),
//!  2. get a signed WebSocket address from the Euler Stream sign server (free, anonymous, rate limited per IP),
//!  3. read protobuf frames from TikTok's WebSocket: chat, gifts, follows, shares, end of stream.
//! TikTok changes things now and then: every step reports a state instead of crashing, and the loop retries.

pub mod proto;

use std::collections::HashMap;
use std::io::Read;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use prost::Message;
use serde::Serialize;
use tokio::sync::{mpsc, watch};
use tokio_tungstenite::tungstenite::{client::IntoClientRequest, http::HeaderValue, Message as WsMessage};

use proto::*;

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const HEARTBEAT: Duration = Duration::from_secs(10);
const OFFLINE_RETRY: Duration = Duration::from_secs(60);

/// What the overlay shows about the connection.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum State {
    Connecting,
    Live,
    Offline,
    Limited,
    Error,
    Off,
}

impl State {
    pub fn label(self) -> &'static str {
        match self {
            State::Connecting => "Łączenie…",
            State::Live => "Na żywo, czat działa",
            State::Offline => "Kanał nie nadaje teraz na żywo",
            State::Limited => "Limit połączeń, ponowię za chwilę",
            State::Error => "Nie udało się połączyć, ponowię za chwilę",
            State::Off => "Wyłączone",
        }
    }
}

/// One thing that happened in the room, in the shape the panel server takes (/api/panel/tiktok).
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Event {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub id: String,
    pub user: String,
    pub login: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub text: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub gift: String,
    #[serde(skip_serializing_if = "is_zero")]
    pub count: i64,
    #[serde(skip_serializing_if = "is_zero")]
    pub diamonds: i64,
}
fn is_zero(v: &i64) -> bool {
    *v == 0
}

#[derive(Debug)]
pub enum Out {
    State(State, String),
    Event(Event),
}

/// Where to talk to. Tests point these at a local mock (VXH_TT_WEB / VXH_TT_SIGN).
#[derive(Clone)]
pub struct Endpoints {
    pub web: String,
    pub sign: String,
    pub api_key: Option<String>,
}

impl Default for Endpoints {
    fn default() -> Self {
        Endpoints {
            web: std::env::var("VXH_TT_WEB").unwrap_or_else(|_| "https://www.tiktok.com".into()),
            sign: std::env::var("VXH_TT_SIGN").unwrap_or_else(|_| "https://tiktok.eulerstream.com".into()),
            api_key: std::env::var("VXH_TT_API_KEY").ok().filter(|k| !k.is_empty()),
        }
    }
}

pub fn normalize_user(raw: &str) -> String {
    let u = raw.trim().replace("https://www.tiktok.com/", "").replace("/live", "");
    u.trim_start_matches('@').trim().to_lowercase()
}
pub fn valid_user(u: &str) -> bool {
    (2..=24).contains(&u.len()) && u.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_')
}

#[derive(Debug)]
enum Fail {
    Offline,
    Limited(Duration),
    Other(String),
}
impl<E: std::fmt::Display> From<E> for Fail {
    fn from(e: E) -> Self {
        Fail::Other(e.to_string())
    }
}

/// TikTok's cookies (ttwid and friends): collected from every response, sent back on the next request and the socket.
#[derive(Default)]
struct Jar(HashMap<String, String>);
impl Jar {
    fn take(&mut self, header: &str) {
        for part in header.split(';') {
            let Some((k, v)) = part.trim().split_once('=') else { continue };
            let k = k.trim().trim_start_matches(',').trim();
            let low = k.to_ascii_lowercase();
            if k.is_empty() || ["path", "domain", "expires", "max-age", "samesite", "secure", "httponly", "priority"].contains(&low.as_str()) {
                continue;
            }
            self.0.insert(k.to_string(), v.trim().to_string());
        }
    }
    fn from_response(&mut self, res: &reqwest::Response) {
        for v in res.headers().get_all(reqwest::header::SET_COOKIE) {
            if let Ok(s) = v.to_str() {
                // One Set-Cookie per header: only its first pair is the cookie.
                if let Some(first) = s.split(';').next() {
                    self.take(first);
                }
            }
        }
    }
    /// Without session cookies: the app never logs in to TikTok.
    fn header(&self) -> String {
        let skip = ["sessionid", "sessionid_ss", "sid_tt", "sid_guard", "tt-target-idc"];
        let mut v: Vec<_> = self.0.iter().filter(|(k, _)| !skip.contains(&k.as_str())).map(|(k, v)| format!("{k}={v}")).collect();
        v.sort();
        v.join("; ")
    }
}

struct Client {
    http: reqwest::Client,
    ep: Endpoints,
    jar: Jar,
    device_id: String,
}

fn web_params() -> Vec<(&'static str, String)> {
    let (name, version) = USER_AGENT.split_once('/').unwrap_or(("Mozilla", "5.0"));
    vec![
        ("aid", "1988".into()),
        ("app_language", "pl".into()),
        ("app_name", "tiktok_web".into()),
        ("browser_language", "pl-PL".into()),
        ("browser_name", name.into()),
        ("browser_online", "true".into()),
        ("browser_platform", "Win32".into()),
        ("browser_version", version.into()),
        ("cookie_enabled", "true".into()),
        ("device_platform", "web_pc".into()),
        ("focus_state", "true".into()),
        ("from_page", "user".into()),
        ("history_len", "10".into()),
        ("is_fullscreen", "false".into()),
        ("is_page_visible", "true".into()),
        ("screen_height", "1080".into()),
        ("screen_width", "1920".into()),
        ("tz_name", "Europe/Warsaw".into()),
        ("referer", "https://www.tiktok.com/".into()),
        ("root_referer", "https://www.tiktok.com/".into()),
        ("channel", "tiktok_web".into()),
        ("data_collection_enabled", "true".into()),
        ("os", "windows".into()),
        ("priority_region", "PL".into()),
        ("region", "PL".into()),
        ("user_is_login", "true".into()),
        ("webcast_language", "pl".into()),
    ]
}

fn ws_params() -> Vec<(&'static str, String)> {
    let (name, version) = USER_AGENT.split_once('/').unwrap_or(("Mozilla", "5.0"));
    vec![
        ("version_code", "180800".into()),
        ("aid", "1988".into()),
        ("app_language", "pl".into()),
        ("app_name", "tiktok_web".into()),
        ("browser_platform", "Win32".into()),
        ("browser_language", "pl-PL".into()),
        ("browser_name", name.into()),
        ("browser_version", version.into()),
        ("browser_online", "true".into()),
        ("cookie_enabled", "true".into()),
        ("tz_name", "Europe/Warsaw".into()),
        ("device_platform", "web".into()),
        ("identity", "audience".into()),
        ("live_id", "12".into()),
        ("webcast_language", "pl".into()),
        ("ws_direct", "0".into()),
        ("sup_ws_ds_opt", "1".into()),
        ("update_version_code", "2.0.0".into()),
        ("did_rule", "3".into()),
        ("screen_height", "1080".into()),
        ("screen_width", "1920".into()),
        ("heartbeat_duration", "0".into()),
        ("resp_content_type", "protobuf".into()),
        ("history_comment_count", "6".into()),
        ("client_enter", "1".into()),
        ("last_rtt", format!("{:.3}", 100.0 + rand::random::<f64>() * 100.0)),
    ]
}

/// Room id and whether it is live, from the room JSON TikTok's pages use.
fn room_from_json(v: &serde_json::Value) -> Option<(String, Option<i64>)> {
    let id = v.pointer("/user/roomId").or_else(|| v.pointer("/user/room_id"))?;
    let id = match id {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        _ => return None,
    };
    let status = v.pointer("/liveRoom/status").and_then(|s| s.as_i64()).or_else(|| v.pointer("/user/status").and_then(|s| s.as_i64()));
    Some((id, status))
}

impl Client {
    fn new(ep: Endpoints) -> Result<Self, reqwest::Error> {
        let http = reqwest::Client::builder().user_agent(USER_AGENT).timeout(Duration::from_secs(15)).gzip(true).build()?;
        let device_id: String = (0..19).map(|_| char::from(b'0' + rand::random::<u8>() % 10)).collect();
        Ok(Client { http, ep, jar: Jar::default(), device_id })
    }

    fn tiktok_get(&self, url: &str) -> reqwest::RequestBuilder {
        let cookies = self.jar.header();
        let cookie = if cookies.is_empty() { "tt-target-idc=useast1a".to_string() } else { format!("tt-target-idc=useast1a; {cookies}") };
        self.http
            .get(url)
            .header("Cookie", cookie)
            .header("Accept", "text/html,application/json,application/protobuf")
            .header("Referer", "https://www.tiktok.com/")
            .header("Origin", "https://www.tiktok.com")
            .header("Accept-Language", "en-US,en;q=0.9")
    }

    /// The room id of @user and whether TikTok says the stream is over (status 4).
    async fn room_id(&mut self, user: &str) -> Result<String, Fail> {
        let mut errors = Vec::new();
        // 1. The web API the LIVE page itself uses.
        let mut params = web_params();
        params.push(("device_id", self.device_id.clone()));
        params.push(("uniqueId", user.to_string()));
        params.push(("sourceType", "54".into()));
        let url = format!("{}/api-live/user/room/?{}", self.ep.web, encode(&params));
        match self.tiktok_get(&url).send().await {
            Ok(res) => {
                self.jar.from_response(&res);
                match res.json::<serde_json::Value>().await {
                    Ok(v) => {
                        if let Some((id, status)) = v.get("data").and_then(room_from_json) {
                            if status == Some(4) || id.is_empty() || id == "0" {
                                return Err(Fail::Offline);
                            }
                            return Ok(id);
                        }
                        errors.push(format!("api-live: {}", v.get("message").and_then(|m| m.as_str()).unwrap_or("no room")));
                    }
                    Err(e) => errors.push(format!("api-live: {e}")),
                }
            }
            Err(e) => errors.push(format!("api-live: {e}")),
        }
        // 2. The data embedded in the /live page.
        let url = format!("{}/@{}/live", self.ep.web, user);
        match self.tiktok_get(&url).send().await {
            Ok(res) => {
                self.jar.from_response(&res);
                let html = res.text().await.unwrap_or_default();
                let re = regex::Regex::new(r#"<script id="SIGI_STATE" type="application/json">(.*?)</script>"#).unwrap();
                if let Some(c) = re.captures(&html) {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&c[1]) {
                        if let Some((id, status)) = v.pointer("/LiveRoom/liveRoomUserInfo").and_then(room_from_json) {
                            if status == Some(4) || id.is_empty() || id == "0" {
                                return Err(Fail::Offline);
                            }
                            return Ok(id);
                        }
                    }
                }
                errors.push("html: no SIGI_STATE".into());
            }
            Err(e) => errors.push(format!("html: {e}")),
        }
        Err(Fail::Other(errors.join("; ")))
    }

    /// Euler Stream signs the WebSocket address. Returns the first batch (cursor, push server, ack data) and the room id.
    async fn sign(&mut self, room: &str) -> Result<(FetchResult, String), Fail> {
        let url = format!(
            "{}/webcast/rooms/{}/connect?{}",
            self.ep.sign,
            room,
            encode(&[("user_agent", USER_AGENT.to_string()), ("client_enter", "true".into()), ("platform", "web".into())])
        );
        let mut req = self.http.get(&url).header("Accept", "application/protobuf,application/json");
        if let Some(k) = &self.ep.api_key {
            req = req.header("x-api-key", k);
        }
        let res = req.send().await?;
        let status = res.status().as_u16();
        if status == 429 {
            let after = res.headers().get("retry-after").and_then(|v| v.to_str().ok()).and_then(|v| v.parse::<u64>().ok()).unwrap_or(60);
            return Err(Fail::Limited(Duration::from_secs(after.clamp(10, 900))));
        }
        if status != 200 {
            let body = res.text().await.unwrap_or_default();
            return Err(Fail::Other(format!("sign {status}: {}", body.chars().take(200).collect::<String>())));
        }
        let cookie = res.headers().get("x-set-tt-cookie").and_then(|v| v.to_str().ok()).map(str::to_string);
        let room = res.headers().get("x-room-id").and_then(|v| v.to_str().ok()).filter(|v| !v.is_empty()).unwrap_or(room).to_string();
        let Some(cookie) = cookie else { return Err(Fail::Other("sign: no cookies".into())) };
        self.jar.take(&cookie);
        let body = res.bytes().await?;
        let first = FetchResult::decode(body.as_ref())?;
        if first.cursor.is_empty() || first.push_server.is_empty() {
            return Err(Fail::Other("sign: missing cursor".into()));
        }
        Ok((first, room))
    }
}

fn encode(params: &[(&str, String)]) -> String {
    let mut s = url::form_urlencoded::Serializer::new(String::new());
    for (k, v) in params {
        s.append_pair(k, v);
    }
    s.finish()
}

fn frame(kind: &str, payload: Vec<u8>, log_id: i64) -> Vec<u8> {
    PushFrame { log_id, payload_encoding: "pb".into(), payload_type: kind.into(), payload, ..Default::default() }.encode_to_vec()
}

fn gunzip(data: &[u8]) -> Vec<u8> {
    if data.len() > 2 && data[0] == 0x1f && data[1] == 0x8b {
        let mut out = Vec::new();
        if flate2::read::GzDecoder::new(data).read_to_end(&mut out).is_ok() {
            return out;
        }
    }
    data.to_vec()
}

fn who(u: &Option<User>) -> (String, String) {
    let u = u.clone().unwrap_or_default();
    let login = u.display_id.to_lowercase();
    let name = if u.nickname.is_empty() { u.display_id.clone() } else { u.nickname.clone() };
    (name.chars().take(40).collect(), login.chars().take(40).collect())
}

/// What one room message means for the overlay. `Err(())` = the stream ended.
pub fn translate(msg: &BaseMessage) -> Result<Option<Event>, ()> {
    let ev = |kind, id: i64, user: &Option<User>| {
        let (user, login) = who(user);
        Event { kind, id: if id != 0 { id.to_string() } else { format!("{:x}", rand::random::<u64>()) }, user, login, text: String::new(), gift: String::new(), count: 0, diamonds: 0 }
    };
    let id = |c: &Option<Common>| c.as_ref().map(|c| c.msg_id).unwrap_or(0);
    Ok(match msg.method.as_str() {
        "WebcastChatMessage" => {
            let m = ChatMessage::decode(msg.payload.as_slice()).map_err(|_| ())?;
            if m.content.trim().is_empty() {
                None
            } else {
                Some(Event { text: m.content.chars().take(300).collect(), ..ev("chat", id(&m.common), &m.user) })
            }
        }
        "WebcastGiftMessage" => {
            let m = GiftMessage::decode(msg.payload.as_slice()).map_err(|_| ())?;
            let g = m.gift.clone().unwrap_or_default();
            // A streak arrives many times while it runs: only its end counts.
            if g.r#type == 1 && m.repeat_end == 0 {
                None
            } else {
                Some(Event { gift: g.name.chars().take(40).collect(), count: m.repeat_count.max(1) as i64, diamonds: g.diamond_count as i64, ..ev("gift", id(&m.common), &m.user) })
            }
        }
        "WebcastSocialMessage" => {
            let m = SocialMessage::decode(msg.payload.as_slice()).map_err(|_| ())?;
            let key = m.common.as_ref().and_then(|c| c.display_text.as_ref()).map(|t| t.key.to_lowercase()).unwrap_or_default();
            if key.contains("follow") {
                Some(ev("follow", id(&m.common), &m.user))
            } else if key.contains("share") {
                Some(ev("share", id(&m.common), &m.user))
            } else {
                None
            }
        }
        "WebcastControlMessage" => {
            let m = ControlMessage::decode(msg.payload.as_slice()).map_err(|_| ())?;
            if m.action == 3 || m.action == 4 {
                return Err(());
            }
            None
        }
        _ => None,
    }
    .and_then(|e| if e.kind == "chat" && e.text.is_empty() { None } else { Some(e) }))
}
// The decode errors above must not end the stream: map them to "nothing".
fn handle(msg: &BaseMessage) -> Result<Option<Event>, ()> {
    if msg.method == "WebcastControlMessage" {
        return translate(msg);
    }
    Ok(translate(msg).ok().flatten())
}

/// Reads the room until the stream ends, the socket drops or `stop` flips.
async fn read_room(c: &mut Client, room: &str, out: &mpsc::UnboundedSender<Out>, stop: &mut watch::Receiver<bool>) -> Result<(), Fail> {
    let (first, room) = c.sign(room).await?;
    let room_num: i64 = room.parse().unwrap_or(0);
    let mut params = ws_params();
    params.push(("compress", "gzip".into()));
    params.push(("room_id", room.clone()));
    params.push(("internal_ext", first.internal_ext.clone()));
    params.push(("cursor", first.cursor.clone()));
    let mut extra: Vec<_> = first.route_params.iter().filter(|(_, v)| !v.is_empty()).collect();
    extra.sort();
    let mut query = encode(&params);
    for (k, v) in extra {
        query.push('&');
        query.push_str(&url::form_urlencoded::Serializer::new(String::new()).append_pair(k, v).finish());
    }
    let url = format!("{}?{}&version_code=270000", first.push_server, query);
    let mut req = url.into_client_request()?;
    req.headers_mut().insert("User-Agent", HeaderValue::from_static(USER_AGENT));
    if let Ok(v) = HeaderValue::from_str(&c.jar.header()) {
        req.headers_mut().insert("Cookie", v);
    }
    let (ws, _) = tokio::time::timeout(Duration::from_secs(20), tokio_tungstenite::connect_async(req)).await.map_err(|_| Fail::Other("ws timeout".into()))??;
    let (mut tx, mut rx) = ws.split();
    let enter = EnterRoom {
        room_id: room_num,
        live_id: 12,
        identity: "audience".into(),
        enter_unique_id: (rand::random::<u64>() >> 1).max(1) as i64,
        filter_welcome_msg: "0".into(),
        ..Default::default()
    };
    tx.send(WsMessage::Binary(frame("im_enter_room", enter.encode_to_vec(), 0).into())).await?;
    let _ = out.send(Out::State(State::Live, String::new()));
    let mut seq = 1i64;
    let mut beat = tokio::time::interval(HEARTBEAT);
    beat.tick().await;
    loop {
        tokio::select! {
            _ = stop.changed() => { if *stop.borrow() { let _ = tx.close().await; return Ok(()); } }
            _ = beat.tick() => {
                let hb = HeartBeat { room_id: room_num, send_packet_seq_id: seq };
                seq += 1;
                tx.send(WsMessage::Binary(frame("hb", hb.encode_to_vec(), 0).into())).await?;
            }
            m = rx.next() => {
                let data = match m {
                    Some(Ok(WsMessage::Binary(b))) => b.to_vec(),
                    Some(Ok(WsMessage::Close(_))) | None => return Err(Fail::Other("socket closed".into())),
                    Some(Ok(_)) => continue,
                    Some(Err(e)) => return Err(e.into()),
                };
                let Ok(f) = PushFrame::decode(data.as_slice()) else { continue };
                if f.payload_type != "msg" || f.payload_encoding != "pb" { continue; }
                let Ok(batch) = FetchResult::decode(gunzip(&f.payload).as_slice()) else { continue };
                if batch.need_ack && f.log_id != 0 && !batch.internal_ext.is_empty() {
                    tx.send(WsMessage::Binary(frame("ack", batch.internal_ext.clone().into_bytes(), f.log_id).into())).await?;
                }
                for msg in &batch.messages {
                    match handle(msg) {
                        Ok(Some(e)) => { let _ = out.send(Out::Event(e)); }
                        Ok(None) => {}
                        Err(()) => { let _ = tx.close().await; return Err(Fail::Offline); }
                    }
                }
            }
        }
    }
}

/// Runs until `stop` is true: connects, reads, waits and reconnects. States and events go to `out`.
pub async fn run(user: String, ep: Endpoints, out: mpsc::UnboundedSender<Out>, mut stop: watch::Receiver<bool>) {
    let user = normalize_user(&user);
    if !valid_user(&user) {
        let _ = out.send(Out::State(State::Error, "Zła nazwa użytkownika TikTok".into()));
        return;
    }
    let mut client = match Client::new(ep) {
        Ok(c) => c,
        Err(e) => {
            let _ = out.send(Out::State(State::Error, e.to_string()));
            return;
        }
    };
    let mut backoff = Duration::from_secs(5);
    while !*stop.borrow() {
        let _ = out.send(Out::State(State::Connecting, String::new()));
        let result = match client.room_id(&user).await {
            Ok(room) => read_room(&mut client, &room, &out, &mut stop).await,
            Err(e) => Err(e),
        };
        if *stop.borrow() {
            break;
        }
        let wait = match result {
            Ok(()) => break,
            Err(Fail::Offline) => {
                let _ = out.send(Out::State(State::Offline, String::new()));
                backoff = Duration::from_secs(5);
                OFFLINE_RETRY
            }
            Err(Fail::Limited(d)) => {
                let _ = out.send(Out::State(State::Limited, String::new()));
                d
            }
            Err(Fail::Other(msg)) => {
                let _ = out.send(Out::State(State::Error, msg));
                let w = backoff;
                backoff = (backoff * 2).min(Duration::from_secs(120));
                w
            }
        };
        tokio::select! {
            _ = tokio::time::sleep(wait) => {}
            _ = stop.changed() => {}
        }
    }
    let _ = out.send(Out::State(State::Off, String::new()));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base(method: &str, payload: Vec<u8>) -> BaseMessage {
        BaseMessage { method: method.into(), payload, msg_id: 1 }
    }
    fn user(nick: &str, handle: &str) -> Option<User> {
        Some(User { id: 1, nickname: nick.into(), display_id: handle.into() })
    }

    #[test]
    fn chat_gift_social_control() {
        let chat = ChatMessage { common: Some(Common { msg_id: 7, ..Default::default() }), user: user("Ala", "Ala_01"), content: "hej".into() };
        let e = translate(&base("WebcastChatMessage", chat.encode_to_vec())).unwrap().unwrap();
        assert_eq!((e.kind, e.id.as_str(), e.user.as_str(), e.login.as_str(), e.text.as_str()), ("chat", "7", "Ala", "ala_01", "hej"));

        let streak = GiftMessage { gift: Some(Gift { r#type: 1, name: "Rose".into(), diamond_count: 1, id: 5 }), repeat_count: 3, repeat_end: 0, user: user("O", "o"), ..Default::default() };
        assert_eq!(translate(&base("WebcastGiftMessage", streak.encode_to_vec())).unwrap(), None);
        let end = GiftMessage { repeat_end: 1, ..streak };
        let g = translate(&base("WebcastGiftMessage", end.encode_to_vec())).unwrap().unwrap();
        assert_eq!((g.kind, g.gift.as_str(), g.count, g.diamonds), ("gift", "Rose", 3, 1));

        let follow = SocialMessage { common: Some(Common { display_text: Some(Text { key: "pm_main_follow_message_viewer_2".into() }), ..Default::default() }), user: user("F", "f") };
        assert_eq!(translate(&base("WebcastSocialMessage", follow.encode_to_vec())).unwrap().unwrap().kind, "follow");

        let end = ControlMessage { action: 3, ..Default::default() };
        assert!(translate(&base("WebcastControlMessage", end.encode_to_vec())).is_err());
        assert_eq!(handle(&base("WebcastChatMessage", vec![0xff, 0xff])).unwrap(), None);
    }

    #[test]
    fn users_and_cookies() {
        assert_eq!(normalize_user(" @Some.User "), "some.user");
        assert_eq!(normalize_user("https://www.tiktok.com/@abc/live"), "abc");
        assert!(valid_user("some.user_1") && !valid_user("a") && !valid_user("bad user"));
        let mut j = Jar::default();
        j.take("ttwid=1%7Cabc; Path=/; Domain=tiktok.com; Secure; HttpOnly");
        j.take("tt-target-idc=useast1a; sessionid=x");
        assert_eq!(j.header(), "ttwid=1%7Cabc");
    }
}
