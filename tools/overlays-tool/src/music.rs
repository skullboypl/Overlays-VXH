//! Now playing -> OBS panel, and the chat commands: !skip for mods / the streamer, !voteskip for viewers.
//! The settings come from the dock (or this app's window), the skip goes to the player as Windows' "next track".

use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use serde_json::json;
use tokio::sync::watch;

use crate::state::{self, PanelSettings, Track};
use crate::{chat, config, media, panel};

struct Votes {
    voters: HashSet<String>,
    last_skip: Option<Instant>,
    skipped_by: String,
    force_send: bool,
    seen_next_at: Option<i64>,
    chat_for: String,
    chat_stop: Option<watch::Sender<bool>>,
}

fn votes() -> &'static Mutex<Votes> {
    static V: OnceLock<Mutex<Votes>> = OnceLock::new();
    V.get_or_init(|| Mutex::new(Votes { voters: HashSet::new(), last_skip: None, skipped_by: String::new(), force_send: false, seen_next_at: None, chat_for: String::new(), chat_stop: None }))
}

/// New panel state: remember it, obey the dock's "next song", start / stop the chat readers.
pub fn on_settings(s: PanelSettings) {
    let changed = state::read(|st| st.settings != s);
    if !changed {
        return;
    }
    state::with(|st| st.settings = s.clone());
    let mut v = votes().lock().unwrap();
    match v.seen_next_at {
        None => v.seen_next_at = Some(s.next_at),
        Some(seen) if s.next_at > seen => {
            v.seen_next_at = Some(s.next_at);
            tokio::spawn(skip("panel".into()));
        }
        _ => {}
    }
    let want = if s.skip || s.vote { format!("{}|{}", s.twitch, s.kick) } else { String::new() };
    if want == v.chat_for {
        return;
    }
    v.chat_for = want.clone();
    if let Some(stop) = v.chat_stop.take() {
        let _ = stop.send(true);
    }
    state::with(|st| st.chat_on = !want.is_empty());
    if want.is_empty() {
        return;
    }
    let (tx, rx) = watch::channel(false);
    v.chat_stop = Some(tx);
    if !s.twitch.is_empty() {
        tokio::spawn(chat::twitch(s.twitch.clone(), on_chat, rx.clone()));
    }
    if !s.kick.is_empty() {
        tokio::spawn(chat::kick(config::origin(), s.kick.clone(), on_chat, rx));
    }
    state::log(format!("Czytam czat: {}", [("Twitch", &s.twitch), ("Kick", &s.kick)].iter().filter(|(_, c)| !c.is_empty()).map(|(p, c)| format!("{p} {c}")).collect::<Vec<_>>().join(", ")));
}

fn on_chat(line: chat::Line) {
    let s = state::read(|st| st.settings.clone());
    let cmd = line.text.trim().split(' ').next().unwrap_or("").to_lowercase();
    if s.skip && line.privileged && cmd == s.skip_cmd {
        tokio::spawn(skip(line.user));
        return;
    }
    if !s.vote || cmd != s.vote_cmd || state::read(|st| st.track.is_none()) {
        return;
    }
    let mut v = votes().lock().unwrap();
    if !v.voters.insert(format!("{}:{}", line.platform, line.user.to_lowercase())) {
        return;
    }
    v.force_send = true;
    let count = v.voters.len();
    state::with(|st| st.votes = count);
    if count >= s.needed {
        tokio::spawn(skip(format!("{count} głosów")));
    }
}

/// Skips the song (cooldown from the dock; the dock / app button only waits a second).
pub async fn skip(by: String) {
    let cooldown = if by == "panel" { 1 } else { state::read(|st| st.settings.cooldown) };
    {
        let mut v = votes().lock().unwrap();
        if v.last_skip.is_some_and(|t| t.elapsed() < Duration::from_secs(cooldown)) {
            return;
        }
        v.last_skip = Some(Instant::now());
    }
    if !media::skip(&config::get().source).await {
        state::log("Nie udało się przełączyć utworu (odtwarzacz nie pozwala)");
        return;
    }
    let mut v = votes().lock().unwrap();
    v.skipped_by = if by == "panel" { String::new() } else { by.clone() };
    v.voters.clear();
    v.force_send = true;
    drop(v);
    state::with(|st| { st.votes = 0; st.last_skip = if by == "panel" { "przycisk".into() } else { by.clone() }; });
    state::log(format!("⏭ Następny utwór ({})", if by == "panel" { "przycisk" } else { &by }));
}

async fn send(client: &reqwest::Client, t: Option<&Track>, cover: Option<Option<String>>) -> bool {
    let (count, by) = {
        let mut v = votes().lock().unwrap();
        (v.voters.len(), std::mem::take(&mut v.skipped_by))
    };
    let s = state::read(|st| st.settings.clone());
    let music = t.map(|t| {
        json!({
            "title": t.title, "artist": t.artist, "album": t.album, "app": t.app, "playing": t.playing,
            "position": (t.position * 10.0).round() / 10.0, "duration": (t.duration * 10.0).round() / 10.0,
            "votes": count, "needed": if s.vote { s.needed } else { 0 }, "skippedBy": by,
        })
    });
    // cover: Some(Some(url)) = new picture, Some(None) = none for this song, None = keep the current one.
    let body = match cover {
        None => json!({ "music": music }),
        Some(c) => json!({ "music": music, "cover": c }),
    };
    (200..300).contains(&panel::post(client, "music", body).await)
}

/// Every second: what is playing. Sends when the song, play/pause or position jumps, and every 15 s anyway.
pub async fn run() {
    let client = panel::http();
    let mut last: Option<Track> = None;
    let mut last_sent = Instant::now() - Duration::from_secs(60);
    let mut expected = 0.0;
    let mut tick = tokio::time::interval(Duration::from_secs(1));
    let mut source = config::get().source;
    loop {
        tick.tick().await;
        let now_source = config::get().source;
        if now_source != source {
            source = now_source;
            last = None;
        }
        let read = media::read(&source, false).await;
        let track = read.map(|(t, _)| t);
        let changed_song = track.as_ref().map(|t| (&t.title, &t.artist)) != last.as_ref().map(|t| (&t.title, &t.artist));
        let changed_state = track.as_ref().map(|t| t.playing) != last.as_ref().map(|t| t.playing);
        let seeked = matches!((&track, &last), (Some(t), Some(_)) if !changed_song && (t.position - expected).abs() > 3.0);
        let force = std::mem::take(&mut votes().lock().unwrap().force_send);
        if changed_song {
            votes().lock().unwrap().voters.clear();
            state::with(|st| st.votes = 0);
        }
        let linked = panel::link().is_some();
        if linked && (changed_song || changed_state || seeked || force || last_sent.elapsed() > Duration::from_secs(15)) {
            let cover = if changed_song {
                let c = match &track { Some(_) => media::read(&source, true).await.and_then(|(_, c)| c), None => None };
                Some(c)
            } else {
                None
            };
            let ok = send(&client, track.as_ref(), cover).await;
            last_sent = Instant::now();
            state::with(|st| st.music_sent = ok);
        }
        expected = track.as_ref().map(|t| t.position + if t.playing { 1.0 } else { 0.0 }).unwrap_or(0.0);
        if track != state::read(|st| st.track.clone()) {
            state::with(|st| st.track = track.clone());
        }
        last = track;
    }
}

/// On exit: tell the overlay the music stopped.
pub async fn stop() {
    let _ = tokio::time::timeout(Duration::from_secs(3), send(&panel::http(), None, None)).await;
}
