use crate::config::AppConfig;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

#[derive(Clone, Copy)]
pub enum HotkeyAction {
    Pause,
    Resume,
    NextImage,
    ToggleOverlay,
}

fn bindings(config: &AppConfig) -> impl Iterator<Item = (HotkeyAction, &str)> {
    [
        (HotkeyAction::Pause, &config.hotkey_pause),
        (HotkeyAction::Resume, &config.hotkey_resume),
        (HotkeyAction::NextImage, &config.hotkey_next_image),
        (HotkeyAction::ToggleOverlay, &config.hotkey_toggle_overlay),
    ]
    .into_iter()
    .filter_map(|(action, key)| key.as_deref().map(|key| (action, key)))
}

pub fn hotkeys_equal(a: &AppConfig, b: &AppConfig) -> bool {
    a.hotkey_pause == b.hotkey_pause
        && a.hotkey_resume == b.hotkey_resume
        && a.hotkey_next_image == b.hotkey_next_image
        && a.hotkey_toggle_overlay == b.hotkey_toggle_overlay
}

pub fn action_for(config: &AppConfig, shortcut: &Shortcut) -> Option<HotkeyAction> {
    bindings(config)
        .find(|(_, key)| key.parse::<Shortcut>().is_ok_and(|s| s == *shortcut))
        .map(|(action, _)| action)
}

pub fn register_hotkeys(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let global_shortcut = app.global_shortcut();
    global_shortcut
        .unregister_all()
        .map_err(|e| format!("Không gỡ được phím tắt cũ: {e}"))?;

    let mut registered: Vec<Shortcut> = Vec::new();
    for (_, key) in bindings(config) {
        let shortcut: Shortcut = key
            .parse()
            .map_err(|_| format!("Phím tắt không hợp lệ: {key}"))?;
        if registered.contains(&shortcut) {
            return Err(format!("Phím tắt {key} đang được gán cho nhiều hành động"));
        }
        global_shortcut
            .register(shortcut)
            .map_err(|_| format!("Phím {key} đã được sử dụng bởi ứng dụng khác"))?;
        registered.push(shortcut);
    }
    Ok(())
}
