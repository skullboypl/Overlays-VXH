//! The window: one column of cards in VXH colours. Closing it only hides it (the app keeps working in the tray).

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use eframe::egui::{self, Color32, CornerRadius, FontData, FontDefinitions, FontFamily, FontId, Margin, RichText, Stroke, TextStyle, Vec2};
use serde_json::json;

use crate::state::{self, PanelStatus};
use crate::tiktok::State as TtState;
use crate::{config, music, panel, platform};

const ORANGE: Color32 = Color32::from_rgb(0xff, 0x59, 0x00);
const BG: Color32 = Color32::from_rgb(0x0e, 0x0e, 0x11);
const CARD: Color32 = Color32::from_rgb(0x17, 0x17, 0x1c);
const LINE: Color32 = Color32::from_rgb(0x2a, 0x2a, 0x33);
const TEXT: Color32 = Color32::from_rgb(0xf2, 0xf2, 0xf5);
const MUTED: Color32 = Color32::from_rgb(0x9a, 0x9a, 0xa8);
const GREEN: Color32 = Color32::from_rgb(0x3d, 0xdc, 0x84);
const YELLOW: Color32 = Color32::from_rgb(0xff, 0xc8, 0x3d);
const RED: Color32 = Color32::from_rgb(0xff, 0x5c, 0x6c);
const TWITCH: Color32 = Color32::from_rgb(0xa9, 0x70, 0xff);
const KICK: Color32 = Color32::from_rgb(0x53, 0xfc, 0x18);
const TIKTOK: Color32 = Color32::from_rgb(0xff, 0x2a, 0x5f);

pub static QUITTING: AtomicBool = AtomicBool::new(false);

pub struct App {
    rt: tokio::runtime::Handle,
    tiktok_user: String,
    paste_error: Option<String>,
    show_log: bool,
    /// The room id stays hidden unless asked: the window may be on stream.
    show_room: bool,
}

fn fonts() -> FontDefinitions {
    let mut f = FontDefinitions::default();
    // Windows' own Segoe UI: native look, nothing to ship. Elsewhere egui's built-in font.
    let candidates = [("ui", r"C:\Windows\Fonts\segoeui.ttf"), ("ui-bold", r"C:\Windows\Fonts\seguisb.ttf"), ("ui-emoji", r"C:\Windows\Fonts\seguiemj.ttf")];
    for (name, path) in candidates {
        if let Ok(bytes) = std::fs::read(path) {
            f.font_data.insert(name.into(), Arc::new(FontData::from_owned(bytes)));
        }
    }
    if f.font_data.contains_key("ui") {
        f.families.get_mut(&FontFamily::Proportional).unwrap().insert(0, "ui".into());
    }
    if f.font_data.contains_key("ui-emoji") {
        f.families.get_mut(&FontFamily::Proportional).unwrap().push("ui-emoji".into());
    }
    let bold = if f.font_data.contains_key("ui-bold") { "ui-bold" } else { "ui" };
    let mut fam = f.families.get(&FontFamily::Proportional).cloned().unwrap_or_default();
    if f.font_data.contains_key(bold) {
        fam.insert(0, bold.into());
    }
    f.families.insert(FontFamily::Name("bold".into()), fam);
    f
}

fn style(ctx: &egui::Context) {
    ctx.set_fonts(fonts());
    let mut s = (*ctx.style()).clone();
    s.text_styles = [
        (TextStyle::Heading, FontId::new(19.0, FontFamily::Name("bold".into()))),
        (TextStyle::Body, FontId::new(14.0, FontFamily::Proportional)),
        (TextStyle::Button, FontId::new(14.0, FontFamily::Proportional)),
        (TextStyle::Small, FontId::new(12.0, FontFamily::Proportional)),
        (TextStyle::Monospace, FontId::new(12.0, FontFamily::Monospace)),
    ]
    .into();
    s.spacing.item_spacing = Vec2::new(8.0, 8.0);
    s.spacing.button_padding = Vec2::new(14.0, 7.0);
    s.spacing.interact_size.y = 32.0;
    let v = &mut s.visuals;
    *v = egui::Visuals::dark();
    v.panel_fill = BG;
    v.window_fill = CARD;
    v.extreme_bg_color = Color32::from_rgb(0x0b, 0x0b, 0x0e);
    v.override_text_color = Some(TEXT);
    v.selection.bg_fill = ORANGE.gamma_multiply(0.5);
    v.selection.stroke = Stroke::new(1.0_f32, ORANGE);
    v.hyperlink_color = ORANGE;
    let r = CornerRadius::same(10);
    for w in [&mut v.widgets.inactive, &mut v.widgets.hovered, &mut v.widgets.active, &mut v.widgets.open, &mut v.widgets.noninteractive] {
        w.corner_radius = r;
    }
    v.widgets.inactive.bg_fill = Color32::from_rgb(0x22, 0x22, 0x29);
    v.widgets.inactive.weak_bg_fill = Color32::from_rgb(0x22, 0x22, 0x29);
    v.widgets.inactive.bg_stroke = Stroke::new(1.0_f32, LINE);
    v.widgets.hovered.bg_fill = Color32::from_rgb(0x2c, 0x2c, 0x35);
    v.widgets.hovered.weak_bg_fill = Color32::from_rgb(0x2c, 0x2c, 0x35);
    v.widgets.hovered.bg_stroke = Stroke::new(1.0_f32, ORANGE.gamma_multiply(0.6));
    v.widgets.active.bg_fill = Color32::from_rgb(0x33, 0x33, 0x3d);
    v.widgets.noninteractive.bg_stroke = Stroke::new(1.0_f32, LINE);
    ctx.set_style(s);
}

fn card(ui: &mut egui::Ui, title: &str, accent: Color32, body: impl FnOnce(&mut egui::Ui)) {
    egui::Frame::new().fill(CARD).stroke(Stroke::new(1.0_f32, LINE)).corner_radius(CornerRadius::same(14)).inner_margin(Margin::same(14)).show(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.horizontal(|ui| {
            let (rect, _) = ui.allocate_exact_size(Vec2::new(4.0, 16.0), egui::Sense::hover());
            ui.painter().rect_filled(rect, CornerRadius::same(2), accent);
            ui.label(RichText::new(title.to_uppercase()).size(12.5).color(MUTED).family(FontFamily::Name("bold".into())).extra_letter_spacing(0.8));
        });
        ui.add_space(2.0);
        body(ui);
    });
    ui.add_space(10.0);
}

fn dot(ui: &mut egui::Ui, color: Color32) {
    let (rect, _) = ui.allocate_exact_size(Vec2::splat(10.0), egui::Sense::hover());
    ui.painter().circle_filled(rect.center(), 4.5, color);
}

/// iOS-style switch.
fn toggle(ui: &mut egui::Ui, on: &mut bool, enabled: bool) -> egui::Response {
    let size = Vec2::new(40.0, 22.0);
    let (rect, mut resp) = ui.allocate_exact_size(size, if enabled { egui::Sense::click() } else { egui::Sense::hover() });
    if resp.clicked() {
        *on = !*on;
        resp.mark_changed();
    }
    let t = ui.ctx().animate_bool_responsive(resp.id, *on);
    let bg = if !enabled { Color32::from_rgb(0x26, 0x26, 0x2e) } else { Color32::from_rgb(0x30, 0x30, 0x3a).lerp_to_gamma(ORANGE, t) };
    ui.painter().rect_filled(rect, CornerRadius::same(11), bg);
    let x = egui::lerp((rect.left() + 11.0)..=(rect.right() - 11.0), t);
    ui.painter().circle_filled(egui::pos2(x, rect.center().y), 8.0, if enabled { Color32::WHITE } else { MUTED });
    resp
}

fn primary(ui: &mut egui::Ui, text: &str) -> egui::Response {
    ui.add(egui::Button::new(RichText::new(text).color(Color32::WHITE).family(FontFamily::Name("bold".into()))).fill(ORANGE).stroke(Stroke::NONE))
}

fn row_label(ui: &mut egui::Ui, text: &str) {
    ui.label(RichText::new(text).color(TEXT));
}

fn fmt_time(s: f64) -> String {
    let s = s.max(0.0) as u64;
    format!("{}:{:02}", s / 60, s % 60)
}

impl App {
    pub fn new(cc: &eframe::CreationContext<'_>, rt: tokio::runtime::Handle) -> Self {
        style(&cc.egui_ctx);
        let ctx = cc.egui_ctx.clone();
        state::on_change(move || ctx.request_repaint());
        #[cfg(windows)]
        {
            use raw_window_handle::{HasWindowHandle, RawWindowHandle};
            if let Ok(h) = cc.window_handle() {
                if let RawWindowHandle::Win32(w) = h.as_raw() {
                    platform::remember_window(w.hwnd.get());
                }
            }
            crate::tray::start(cc.egui_ctx.clone(), rt.clone());
        }
        App { rt, tiktok_user: config::get().tiktok_user, paste_error: None, show_log: false, show_room: false }
    }

    fn header(&self, ui: &mut egui::Ui) {
        let status = state::read(|s| s.panel.clone());
        ui.horizontal(|ui| {
            egui::Frame::new().fill(ORANGE).corner_radius(CornerRadius::same(8)).inner_margin(Margin::symmetric(8, 3)).show(ui, |ui| {
                ui.label(RichText::new("VXH").color(Color32::WHITE).size(15.0).family(FontFamily::Name("bold".into())));
            });
            ui.label(RichText::new("Overlays Tool").size(19.0).family(FontFamily::Name("bold".into())));
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                let (c, t) = match status {
                    PanelStatus::Connected => (GREEN, "Połączono"),
                    PanelStatus::Connecting => (YELLOW, "Łączenie…"),
                    PanelStatus::NoLink => (MUTED, "Brak panelu"),
                    PanelStatus::Revoked => (RED, "Link nieaktualny"),
                    PanelStatus::Offline(_) => (RED, "Brak połączenia"),
                };
                egui::Frame::new().fill(c.gamma_multiply(0.14)).corner_radius(CornerRadius::same(20)).inner_margin(Margin::symmetric(10, 4)).show(ui, |ui| {
                    ui.horizontal(|ui| {
                        dot(ui, c);
                        ui.label(RichText::new(t).color(c).size(12.5));
                    });
                });
            });
        });
    }

    fn panel_card(&mut self, ui: &mut egui::Ui) {
        let (status, room) = state::read(|s| (s.panel.clone(), s.room.clone()));
        card(ui, "Panel OBS", ORANGE, |ui| {
            match &status {
                PanelStatus::NoLink | PanelStatus::Revoked => {
                    ui.label(RichText::new(if status == PanelStatus::Revoked { "Ten link docka został zastąpiony nowym kluczem. Połącz aplikację jeszcze raz." } else { "Połącz aplikację z Twoim Panelem OBS. Klucz zostaje na tym komputerze." }).color(MUTED));
                    ui.horizontal_wrapped(|ui| {
                        if primary(ui, "Połącz z panelem").clicked() {
                            platform::open_url(&format!("{}/panel?app=connect", config::origin()));
                        }
                        if ui.button("Wklej link docka").clicked() {
                            self.paste();
                        }
                    });
                    ui.label(RichText::new("W panelu kliknij „Połącz z VXH Overlays Tool”: przeglądarka otworzy tę aplikację z linkiem.").size(12.0).color(MUTED));
                }
                _ => {
                    ui.horizontal(|ui| {
                        let (c, t) = match &status {
                            PanelStatus::Connected => (GREEN, "Połączono z panelem".to_string()),
                            PanelStatus::Offline(e) => (RED, format!("Serwer panelu nie odpowiada ({e}), ponawiam…")),
                            _ => (YELLOW, "Łączenie z panelem…".to_string()),
                        };
                        dot(ui, c);
                        ui.label(t);
                    });
                    if !room.is_empty() {
                        ui.horizontal(|ui| {
                            let shown = if self.show_room { format!("{}…", &room[..8.min(room.len())]) } else { "••••••••".into() };
                            ui.label(RichText::new(format!("{} · pokój {shown}", config::origin().trim_start_matches("https://"))).size(12.0).color(MUTED));
                            if ui.small_button(if self.show_room { "Ukryj" } else { "Pokaż" }).clicked() {
                                self.show_room = !self.show_room;
                            }
                        });
                    }
                    ui.horizontal_wrapped(|ui| {
                        if ui.button("Otwórz Panel OBS").clicked() {
                            platform::open_url(&format!("{}/panel", config::origin()));
                        }
                        if ui.button("Zmień link (ze schowka)").clicked() {
                            self.paste();
                        }
                        if ui.button(RichText::new("Rozłącz").color(RED)).clicked() {
                            config::update(|c| c.dock_link.clear());
                        }
                    });
                }
            }
            if let Some(e) = &self.paste_error {
                ui.label(RichText::new(e).color(RED).size(12.5));
            }
        });
    }

    fn paste(&mut self) {
        match platform::clipboard_text().filter(|t| config::parse_dock_link(t).is_some()) {
            Some(t) => {
                config::update(|c| c.dock_link = t.trim().to_string());
                self.paste_error = None;
            }
            None => self.paste_error = Some("W schowku nie ma linku docka. W Panelu OBS kliknij „Kopiuj” przy linku docka i spróbuj znowu.".into()),
        }
    }

    fn accounts_card(&mut self, ui: &mut egui::Ui) {
        let (settings, connected) = state::read(|s| (s.settings.clone(), s.panel == PanelStatus::Connected));
        card(ui, "Konta", TWITCH, |ui| {
            for (name, color, login) in [("Twitch", TWITCH, &settings.twitch), ("Kick", KICK, &settings.kick)] {
                ui.horizontal(|ui| {
                    dot(ui, color);
                    ui.label(RichText::new(name).family(FontFamily::Name("bold".into())));
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if login.is_empty() {
                            ui.label(RichText::new(if connected { "niepołączone" } else { "—" }).color(MUTED));
                        } else {
                            ui.label(RichText::new(login.as_str()).color(TEXT));
                        }
                    });
                });
            }
            ui.horizontal(|ui| {
                dot(ui, TIKTOK);
                ui.label(RichText::new("TikTok").family(FontFamily::Name("bold".into())));
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    let r = ui.add(egui::TextEdit::singleline(&mut self.tiktok_user).hint_text("@nick").desired_width(150.0));
                    if r.lost_focus() {
                        let u = self.tiktok_user.trim().to_string();
                        config::update(|c| c.tiktok_user = u);
                    }
                });
            });
            ui.label(RichText::new("Twitch i Kick logujesz w Panelu OBS („Zaloguj przez Twitch / Kick”). Aplikacja bierze z panelu podpięte kanały.").size(12.0).color(MUTED));
            if ui.button("Zaloguj konta w panelu").clicked() {
                platform::open_url(&format!("{}/panel", config::origin()));
            }
        });
    }

    fn tiktok_card(&mut self, ui: &mut egui::Ui) {
        let (st, detail, count, last) = state::read(|s| (s.tiktok, s.tiktok_detail.clone(), s.tiktok_count, s.tiktok_last.clone()));
        let mut cfg = config::get();
        card(ui, "TikTok LIVE", TIKTOK, |ui| {
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    row_label(ui, "Czat TikTok przez aplikację");
                    ui.label(RichText::new("Zalecane: łączy z Twojego internetu, bez wspólnych limitów serwera").size(12.0).color(MUTED));
                });
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    let valid = crate::tiktok::valid_user(&crate::tiktok::normalize_user(&cfg.tiktok_user));
                    let enabled = valid || cfg.tiktok_on;
                    if toggle(ui, &mut cfg.tiktok_on, enabled).changed() {
                        let on = cfg.tiktok_on;
                        config::update(|c| c.tiktok_on = on);
                    }
                });
            });
            if !crate::tiktok::valid_user(&crate::tiktok::normalize_user(&cfg.tiktok_user)) {
                ui.label(RichText::new("Wpisz swój nick TikTok w karcie Konta.").size(12.5).color(MUTED));
            } else if cfg.tiktok_on {
                ui.horizontal(|ui| {
                    let c = match st {
                        TtState::Live => GREEN,
                        TtState::Connecting => YELLOW,
                        TtState::Offline | TtState::Off => MUTED,
                        TtState::Limited | TtState::Error => RED,
                    };
                    dot(ui, c);
                    ui.label(st.label());
                });
                if !detail.is_empty() && matches!(st, TtState::Error) {
                    ui.label(RichText::new(detail.chars().take(140).collect::<String>()).size(11.5).color(MUTED));
                }
                if count > 0 {
                    ui.label(RichText::new(format!("Odebrano: {count} · ostatnie: {}", last.chars().take(60).collect::<String>())).size(12.0).color(MUTED));
                }
            }
            ui.label(RichText::new("W nakładce „Czat Twitch + Kick” ustaw „Połączenie z TikTokiem: Przez aplikację” i użyj linku ze „Steruj z Panelu OBS”.").size(12.0).color(MUTED));
        });
    }

    fn music_card(&mut self, ui: &mut egui::Ui) {
        let (track, settings, votes, connected, chat_on) = state::read(|s| (s.track.clone(), s.settings.clone(), s.votes, s.panel == PanelStatus::Connected, s.chat_on));
        let mut cfg = config::get();
        card(ui, "Muzyka", GREEN, |ui| {
            match &track {
                Some(t) => {
                    ui.horizontal(|ui| {
                        ui.label(RichText::new(if t.playing { "▶" } else { "⏸" }).color(ORANGE));
                        ui.vertical(|ui| {
                            ui.label(RichText::new(&t.title).family(FontFamily::Name("bold".into())));
                            ui.label(RichText::new(format!("{} · {}", t.artist, t.app)).size(12.5).color(MUTED));
                        });
                    });
                    if t.duration > 0.0 {
                        let (rect, _) = ui.allocate_exact_size(Vec2::new(ui.available_width(), 4.0), egui::Sense::hover());
                        ui.painter().rect_filled(rect, CornerRadius::same(2), LINE);
                        let mut done = rect;
                        done.set_width(rect.width() * (t.position / t.duration).clamp(0.0, 1.0) as f32);
                        ui.painter().rect_filled(done, CornerRadius::same(2), ORANGE);
                        ui.label(RichText::new(format!("{} / {}", fmt_time(t.position), fmt_time(t.duration))).size(11.5).color(MUTED));
                    }
                }
                None => {
                    ui.label(RichText::new("Nic nie gra (albo odtwarzacz nie pokazuje utworu w Windows).").color(MUTED));
                }
            }
            ui.horizontal(|ui| {
                ui.label("Źródło");
                let names = [("all", "Wszystko, co gra"), ("spotify", "Tylko Spotify"), ("browser", "Przeglądarka (YouTube…)"), ("music", "Programy muzyczne")];
                let current = names.iter().find(|n| n.0 == cfg.source).map(|n| n.1).unwrap_or(names[0].1);
                egui::ComboBox::from_id_salt("source").selected_text(current).width(210.0).show_ui(ui, |ui| {
                    for (id, label) in names {
                        if ui.selectable_value(&mut cfg.source, id.to_string(), label).changed() {
                            let s = cfg.source.clone();
                            config::update(|c| c.source = s);
                        }
                    }
                });
            });
            ui.separator();
            let mut skip = settings.skip;
            let mut vote = settings.vote;
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    row_label(ui, &format!("{} dla modów i streamera", settings.skip_cmd));
                    ui.label(RichText::new("Od razu przełącza utwór").size(12.0).color(MUTED));
                });
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if toggle(ui, &mut skip, connected).changed() {
                        self.patch(json!({ "musicCtl": { "skip": skip } }));
                    }
                });
            });
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    row_label(ui, &format!("{} dla widzów", settings.vote_cmd));
                    ui.label(RichText::new(format!("Przełącza po {} głosach", settings.needed)).size(12.0).color(MUTED));
                });
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if toggle(ui, &mut vote, connected).changed() {
                        self.patch(json!({ "musicCtl": { "vote": vote } }));
                    }
                });
            });
            if settings.vote && votes > 0 {
                ui.label(RichText::new(format!("Głosy: {votes}/{}", settings.needed)).color(ORANGE));
            }
            if (settings.skip || settings.vote) && settings.twitch.is_empty() && settings.kick.is_empty() {
                ui.label(RichText::new("Zaloguj Twitch albo Kick w panelu: komendy są czytane z czatu podpiętych kanałów.").size(12.0).color(YELLOW));
            } else if chat_on {
                ui.label(RichText::new("Liczbę głosów, przerwę i nazwy komend ustawisz w docku panelu.").size(12.0).color(MUTED));
            }
            ui.horizontal(|ui| {
                if primary(ui, "⏭ Następny utwór").clicked() {
                    self.rt.spawn(music::skip("panel".into()));
                }
            });
        });
    }

    fn settings_card(&mut self, ui: &mut egui::Ui) {
        let mut cfg = config::get();
        card(ui, "Ustawienia", MUTED, |ui| {
            ui.horizontal(|ui| {
                row_label(ui, "Uruchamiaj razem z Windows");
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if toggle(ui, &mut cfg.autostart, true).changed() {
                        let on = cfg.autostart;
                        config::update(|c| c.autostart = on);
                        platform::set_autostart(on);
                    }
                });
            });
            ui.label(RichText::new("Zamknięcie okna chowa aplikację do zasobnika obok zegara. Wyłączysz ją z menu ikony („Zamknij”).").size(12.0).color(MUTED));
            ui.horizontal(|ui| {
                if ui.small_button(if self.show_log { "Ukryj dziennik" } else { "Pokaż dziennik" }).clicked() {
                    self.show_log = !self.show_log;
                }
                ui.label(RichText::new(concat!("wersja ", env!("CARGO_PKG_VERSION"))).size(11.5).color(MUTED));
            });
            if self.show_log {
                let log = state::read(|s| s.log.iter().rev().take(40).cloned().collect::<Vec<_>>());
                egui::Frame::new().fill(Color32::from_rgb(0x0b, 0x0b, 0x0e)).corner_radius(CornerRadius::same(8)).inner_margin(Margin::same(8)).show(ui, |ui| {
                    ui.set_width(ui.available_width());
                    for l in log {
                        ui.label(RichText::new(l).monospace().size(11.5).color(MUTED));
                    }
                });
            }
        });
    }

    fn patch(&self, patch: serde_json::Value) {
        self.rt.spawn(async move {
            if !(200..300).contains(&panel::update(patch).await) {
                state::log("Nie udało się zapisać ustawienia w panelu");
            }
        });
    }
}

impl eframe::App for App {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        if ctx.input(|i| i.viewport().close_requested()) && !QUITTING.load(Ordering::SeqCst) && cfg!(windows) {
            ctx.send_viewport_cmd(egui::ViewportCommand::CancelClose);
            platform::hide_window();
        }
        egui::CentralPanel::default().frame(egui::Frame::new().fill(BG).inner_margin(Margin::same(16))).show(ctx, |ui| {
            self.header(ui);
            ui.add_space(10.0);
            egui::ScrollArea::vertical().auto_shrink([false, false]).show(ui, |ui| {
                self.panel_card(ui);
                self.accounts_card(ui);
                self.tiktok_card(ui);
                self.music_card(ui);
                self.settings_card(ui);
            });
        });
        ctx.request_repaint_after(Duration::from_secs(1));
    }
}

pub fn icon_rgba() -> (Vec<u8>, u32, u32) {
    let img = image::load_from_memory(include_bytes!("../icon.ico")).map(|i| i.to_rgba8()).unwrap_or_else(|_| image::RgbaImage::new(1, 1));
    let (w, h) = img.dimensions();
    (img.into_raw(), w, h)
}

pub fn run(rt: tokio::runtime::Handle, start_hidden: bool) -> eframe::Result<()> {
    let (rgba, width, height) = icon_rgba();
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title(config::APP_NAME)
            .with_inner_size([460.0, 720.0])
            .with_min_inner_size([380.0, 480.0])
            .with_visible(!start_hidden)
            .with_icon(egui::IconData { rgba, width, height }),
        ..Default::default()
    };
    eframe::run_native(config::APP_NAME, options, Box::new(move |cc| Ok(Box::new(App::new(cc, rt)))))
}
