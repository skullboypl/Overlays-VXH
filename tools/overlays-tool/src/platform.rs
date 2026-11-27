//! The Windows bits: one copy at a time, start with Windows, the "vxh-tool://" link the panel page opens, and
//! showing / hiding the window from the tray. Elsewhere (development on Linux) they do nothing.


pub const PROTOCOL: &str = "vxh-tool";

/// Opens a page in the default browser.
pub fn open_url(url: &str) {
    let _ = open::that_detached(url);
}

pub fn clipboard_text() -> Option<String> {
    arboard::Clipboard::new().ok()?.get_text().ok()
}

#[cfg(windows)]
mod imp {
    use super::*;
    use crate::config::APP_NAME;
    use std::sync::atomic::{AtomicIsize, Ordering};
    use windows::core::HSTRING;
    use windows::Win32::Foundation::{GetLastError, ERROR_ALREADY_EXISTS, HWND};
    use windows::Win32::System::Threading::CreateMutexW;
    use windows::Win32::UI::WindowsAndMessaging::{SetForegroundWindow, ShowWindow, SW_HIDE, SW_RESTORE, SW_SHOW};
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    static HWND_RAW: AtomicIsize = AtomicIsize::new(0);

    /// False when another copy is already running (the named mutex lives as long as the process).
    pub fn first_instance() -> bool {
        unsafe {
            let h = CreateMutexW(None, true, &HSTRING::from("VxhOverlaysTool.Single"));
            !(h.is_err() || GetLastError() == ERROR_ALREADY_EXISTS)
        }
    }

    fn exe() -> String {
        std::env::current_exe().map(|p| p.display().to_string()).unwrap_or_default()
    }

    pub fn set_autostart(on: bool) {
        let Ok((key, _)) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run") else { return };
        if on {
            let _ = key.set_value(APP_NAME, &format!("\"{}\" --tray", exe()));
        } else {
            let _ = key.delete_value(APP_NAME);
        }
        // The old C# app: never run both.
        let _ = key.delete_value("VXH Now Playing");
    }

    /// HKCU\Software\Classes\vxh-tool: the panel page's "Connect the app" button opens this exe with the dock link.
    pub fn register_protocol() {
        let Ok((key, _)) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(format!(r"Software\Classes\{PROTOCOL}")) else { return };
        let _ = key.set_value("", &format!("URL:{APP_NAME}"));
        let _ = key.set_value("URL Protocol", &"");
        if let Ok((icon, _)) = key.create_subkey("DefaultIcon") {
            let _ = icon.set_value("", &format!("\"{}\",0", exe()));
        }
        if let Ok((cmd, _)) = key.create_subkey(r"shell\open\command") {
            let _ = cmd.set_value("", &format!("\"{}\" \"%1\"", exe()));
        }
    }

    pub fn remember_window(hwnd: isize) {
        HWND_RAW.store(hwnd, Ordering::SeqCst);
    }
    pub fn show_window() {
        let h = HWND_RAW.load(Ordering::SeqCst);
        if h != 0 {
            unsafe {
                let hwnd = HWND(h as *mut _);
                let _ = ShowWindow(hwnd, SW_SHOW);
                let _ = ShowWindow(hwnd, SW_RESTORE);
                let _ = SetForegroundWindow(hwnd);
            }
        }
    }
    pub fn hide_window() {
        let h = HWND_RAW.load(Ordering::SeqCst);
        if h != 0 {
            unsafe {
                let _ = ShowWindow(HWND(h as *mut _), SW_HIDE);
            }
        }
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn first_instance() -> bool {
        true
    }
    pub fn set_autostart(_on: bool) {}
    pub fn register_protocol() {}
    #[allow(dead_code)]
    pub fn remember_window(_hwnd: isize) {}
    pub fn show_window() {}
    pub fn hide_window() {}
}

pub use imp::*;
