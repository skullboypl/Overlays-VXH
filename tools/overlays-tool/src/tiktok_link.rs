//! Starts / stops the TikTok reader when the settings change, and posts what it reads to the OBS panel room:
//! events in small batches (at most about 2 posts a second), and the connection state every 10 s, so overlays set
//! to "through the app" know the app is there and do not fall back to the server.

use std::time::{Duration, Instant};

use serde_json::json;
use tokio::sync::{mpsc, watch};

use crate::tiktok::{self, Endpoints, Event, Out, State};
use crate::{config, panel, state};

const BATCH: Duration = Duration::from_millis(500);
const HEARTBEAT: Duration = Duration::from_secs(10);

async fn post(client: &reqwest::Client, user: &str, st: State, events: &[Event]) -> u16 {
    panel::post(client, "tiktok", json!({ "tiktok": { "user": user, "state": st }, "events": events })).await
}

pub async fn run() {
    let client = panel::http();
    let mut changes = config::watch();
    loop {
        let c = config::get();
        let user = tiktok::normalize_user(&c.tiktok_user);
        if !c.tiktok_on || !tiktok::valid_user(&user) {
            state::with(|s| { s.tiktok = State::Off; s.tiktok_detail.clear(); });
            let _ = changes.changed().await;
            continue;
        }
        let (stop_tx, stop_rx) = watch::channel(false);
        let (out_tx, mut out_rx) = mpsc::unbounded_channel();
        let reader = tokio::spawn(tiktok::run(user.clone(), Endpoints::default(), out_tx, stop_rx));
        state::log(format!("TikTok: czytam czat @{user}"));
        let mut current = State::Connecting;
        let mut pending: Vec<Event> = Vec::new();
        let mut last_post = Instant::now() - HEARTBEAT;
        let mut tick = tokio::time::interval(Duration::from_millis(250));
        loop {
            tokio::select! {
                msg = out_rx.recv() => match msg {
                    Some(Out::State(st, detail)) => {
                        if st != current { state::log(format!("TikTok: {}{}", st.label(), if detail.is_empty() { String::new() } else { format!(" ({detail})") })); }
                        current = st;
                        state::with(|s| { s.tiktok = st; s.tiktok_detail = detail; });
                        // A change of state goes out right away.
                        if st != State::Off { let _ = post(&client, &user, st, &std::mem::take(&mut pending)).await; last_post = Instant::now(); }
                    }
                    Some(Out::Event(e)) => {
                        let line = match e.kind { "chat" => format!("{}: {}", e.user, e.text), "gift" => format!("{} 🎁 {} ×{}", e.user, e.gift, e.count), k => format!("{} {}", e.user, k) };
                        state::with(|s| { s.tiktok_count += 1; s.tiktok_last = line; });
                        pending.push(e);
                        if pending.len() > 200 { pending.drain(..pending.len() - 200); }
                    }
                    None => break,
                },
                _ = tick.tick() => {
                    let due = (!pending.is_empty() && last_post.elapsed() >= BATCH) || last_post.elapsed() >= HEARTBEAT;
                    if due && panel::link().is_some() {
                        let batch: Vec<Event> = pending.drain(..pending.len().min(60)).collect();
                        let code = post(&client, &user, current, &batch).await;
                        // Too fast for the server: put the batch back and wait a moment.
                        if code == 429 { let mut b = batch; b.append(&mut pending); pending = b; }
                        last_post = Instant::now();
                    }
                }
                _ = changes.changed() => {
                    let n = config::get();
                    if !n.tiktok_on || tiktok::normalize_user(&n.tiktok_user) != user { break; }
                }
            }
        }
        let _ = stop_tx.send(true);
        reader.abort();
        // Overlays switch back to the server right away instead of waiting for the app to go quiet.
        let _ = post(&client, &user, State::Off, &[]).await;
        state::with(|s| { s.tiktok = State::Off; s.tiktok_detail.clear(); });
        // The reader gave up on its own (not a settings change): do not spin, wait for a change or try again later.
        let n = config::get();
        if n.tiktok_on && tiktok::normalize_user(&n.tiktok_user) == user {
            tokio::select! {
                _ = changes.changed() => {}
                _ = tokio::time::sleep(Duration::from_secs(30)) => {}
            }
        }
    }
}
