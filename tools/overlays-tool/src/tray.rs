//! Tray icon (Windows): click = open the window, menu = open / quit.

#![cfg(windows)]

use std::sync::atomic::Ordering;
use std::sync::OnceLock;

use tray_icon::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tray_icon::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};

use crate::{config, music, platform, ui};

struct Holder(#[allow(dead_code)] TrayIcon);
// The icon is only touched on the UI thread; it just has to live as long as the app.
unsafe impl Send for Holder {}
unsafe impl Sync for Holder {}
static TRAY: OnceLock<Holder> = OnceLock::new();

pub fn start(ctx: eframe::egui::Context, rt: tokio::runtime::Handle) {
    let menu = Menu::new();
    let open = MenuItem::new("Otwórz VXH Overlays Tool", true, None);
    let panel = MenuItem::new("Otwórz Panel OBS", true, None);
    let quit = MenuItem::new("Zamknij", true, None);
    let _ = menu.append_items(&[&open, &panel, &PredefinedMenuItem::separator(), &quit]);
    let (rgba, w, h) = ui::icon_rgba();
    let Ok(icon) = tray_icon::Icon::from_rgba(rgba, w, h) else { return };
    let Ok(tray) = TrayIconBuilder::new().with_tooltip(config::APP_NAME).with_icon(icon).with_menu(Box::new(menu)).with_menu_on_left_click(false).build() else { return };
    let _ = TRAY.set(Holder(tray));

    let c = ctx.clone();
    TrayIconEvent::set_event_handler(Some(move |e: TrayIconEvent| {
        if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
            platform::show_window();
            c.request_repaint();
        }
    }));
    let (open_id, panel_id, quit_id) = (open.id().clone(), panel.id().clone(), quit.id().clone());
    MenuEvent::set_event_handler(Some(move |e: MenuEvent| {
        if e.id == open_id {
            platform::show_window();
            ctx.request_repaint();
        } else if e.id == panel_id {
            platform::open_url(&format!("{}/panel", config::origin()));
        } else if e.id == quit_id {
            ui::QUITTING.store(true, Ordering::SeqCst);
            // Tell the overlay the music stopped, then leave.
            let _ = rt.block_on(music::stop());
            std::process::exit(0);
        }
    }));
}
