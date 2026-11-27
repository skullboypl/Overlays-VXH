//! VXH Overlays Tool: the streamer's companion app for the VXH Overlays OBS panel.
//!  - now playing from Windows (Spotify, YouTube, Apple Music, Tidal, VLC…) -> "Now playing" widget,
//!  - !skip for mods / the streamer and !voteskip for viewers, read from the linked Twitch / Kick chat,
//!  - TikTok LIVE chat read from the streamer's own PC -> chat overlay ("through the app").
//! Lives in the tray; the window shows the panel connection, accounts, TikTok and music.

// Release builds have no console window; debug builds keep one, so `cargo run -- --tiktok-test <nick>` prints.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod chat;
mod config;
mod media;
mod music;
mod panel;
mod platform;
mod state;
mod tiktok;
mod tiktok_link;
#[cfg(windows)]
mod tray;
mod ui;

use std::time::Duration;

/// A dock link that arrived from the panel page (vxh-tool://connect?link=…) or a second copy of the app.
fn take_link(text: &str) {
    let text = text.trim();
    if text == "show" {
        platform::show_window();
        return;
    }
    if let Some((origin, key)) = config::parse_dock_link(text) {
        config::update(|c| c.dock_link = format!("{origin}/panel/dock#k={key}"));
        state::log("Dostałem link docka z panelu");
        platform::show_window();
    }
}

/// Another copy started with a link leaves it in a file: pick it up.
async fn watch_incoming() {
    let path = config::incoming_file();
    loop {
        tokio::time::sleep(Duration::from_millis(700)).await;
        if let Ok(text) = std::fs::read_to_string(&path) {
            let _ = std::fs::remove_file(&path);
            take_link(&text);
        }
    }
}

/// Development helper: `--tiktok-test <user> [seconds]` prints what the TikTok reader sees, without a window.
fn tiktok_test(rt: &tokio::runtime::Runtime, args: &[String]) {
    let user = args.get(1).cloned().unwrap_or_default();
    let secs: u64 = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(30);
    rt.block_on(async move {
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        let (stop_tx, stop_rx) = tokio::sync::watch::channel(false);
        tokio::spawn(tiktok::run(user, tiktok::Endpoints::default(), tx, stop_rx));
        let end = tokio::time::sleep(Duration::from_secs(secs));
        tokio::pin!(end);
        loop {
            tokio::select! {
                m = rx.recv() => match m {
                    Some(tiktok::Out::State(s, d)) => println!("state {s:?} {d}"),
                    Some(tiktok::Out::Event(e)) => println!("event {}", serde_json::to_string(&e).unwrap_or_default()),
                    None => break,
                },
                _ = &mut end => break,
            }
        }
        let _ = stop_tx.send(true);
    });
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let rt = tokio::runtime::Builder::new_multi_thread().worker_threads(3).enable_all().build().expect("runtime");
    if args.first().map(String::as_str) == Some("--tiktok-test") {
        return tiktok_test(&rt, &args);
    }
    let link_arg = args.iter().find(|a| a.starts_with(&format!("{}://", platform::PROTOCOL))).cloned();
    if !platform::first_instance() {
        // Hand the link (or "show yourself") to the copy that is already running.
        let _ = std::fs::create_dir_all(config::dir());
        let _ = std::fs::write(config::incoming_file(), link_arg.unwrap_or_else(|| "show".into()));
        return;
    }
    if let Some(l) = &link_arg {
        take_link(l);
    }
    let cfg = config::get();
    platform::register_protocol();
    platform::set_autostart(cfg.autostart);

    let _guard = rt.enter();
    rt.spawn(panel::follow(music::on_settings));
    rt.spawn(music::run());
    rt.spawn(tiktok_link::run());
    rt.spawn(watch_incoming());

    let headless = args.iter().any(|a| a == "--headless");
    if headless {
        // Development / tests: the workers without a window.
        rt.block_on(async { tokio::signal::ctrl_c().await.ok() });
    } else {
        let start_hidden = args.iter().any(|a| a == "--tray") && link_arg.is_none();
        let _ = ui::run(rt.handle().clone(), start_hidden);
    }
    rt.block_on(music::stop());
}
