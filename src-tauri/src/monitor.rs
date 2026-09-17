use serde::Serialize;
use tauri::{AppHandle, Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewWindow};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub id: String,
    pub label: String,
    pub is_primary: bool,
    pub width: u32,
    pub height: u32,
}

fn monitors_match(a: &Monitor, b: &Monitor) -> bool {
    a.position() == b.position() && a.size() == b.size()
}

fn monitor_label(index: usize, is_primary: bool, width: u32, height: u32) -> String {
    let role = if is_primary {
        "Màn hình chính"
    } else if index == 1 {
        "Màn hình phụ"
    } else {
        &format!("Màn hình {}", index + 1)
    };
    format!("{role} — {width}×{height}")
}

pub fn list_monitors(app: &AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app
        .available_monitors()
        .map_err(|e| format!("Không đọc được danh sách màn hình: {e}"))?;
    let primary = app
        .primary_monitor()
        .map_err(|e| format!("Không đọc được màn hình chính: {e}"))?;

    Ok(monitors
        .iter()
        .enumerate()
        .map(|(index, monitor)| {
            let size = monitor.size();
            let is_primary = primary
                .as_ref()
                .map(|p| monitors_match(p, monitor))
                .unwrap_or(index == 0);

            MonitorInfo {
                id: index.to_string(),
                label: monitor_label(index, is_primary, size.width, size.height),
                is_primary,
                width: size.width,
                height: size.height,
            }
        })
        .collect())
}

fn resolve_monitor<'a>(
    monitors: &'a [Monitor],
    primary: Option<&'a Monitor>,
    monitor_id: Option<&str>,
) -> &'a Monitor {
    let use_primary = monitor_id.is_none()
        || monitor_id == Some("primary")
        || monitor_id == Some("");

    if use_primary {
        if let Some(p) = primary {
            return p;
        }
        return &monitors[0];
    }

    if let Some(id) = monitor_id {
        if let Ok(index) = id.parse::<usize>() {
            if let Some(monitor) = monitors.get(index) {
                return monitor;
            }
        }
    }

    primary.unwrap_or(&monitors[0])
}

pub fn apply_overlay_monitor(app: &AppHandle, monitor_id: Option<&str>) -> Result<(), String> {
    let overlay = app
        .get_webview_window("overlay")
        .ok_or_else(|| "Không tìm thấy cửa sổ overlay".to_string())?;

    apply_overlay_monitor_window(&overlay, app, monitor_id)
}

pub fn apply_overlay_monitor_window(
    overlay: &WebviewWindow,
    app: &AppHandle,
    monitor_id: Option<&str>,
) -> Result<(), String> {
    let monitors = app
        .available_monitors()
        .map_err(|e| format!("Không đọc được danh sách màn hình: {e}"))?;

    if monitors.is_empty() {
        return Err("Không có màn hình nào".to_string());
    }

    let primary = app
        .primary_monitor()
        .map_err(|e| format!("Không đọc được màn hình chính: {e}"))?;
    let primary_ref = primary.as_ref();

    let monitor = resolve_monitor(&monitors, primary_ref, monitor_id);
    let position = monitor.position();
    let size = monitor.size();

    overlay
        .set_fullscreen(false)
        .map_err(|e| format!("Không tắt fullscreen overlay: {e}"))?;
    overlay
        .set_position(PhysicalPosition::new(position.x, position.y))
        .map_err(|e| format!("Không đặt vị trí overlay: {e}"))?;
    overlay
        .set_size(PhysicalSize::new(size.width, size.height))
        .map_err(|e| format!("Không đặt kích thước overlay: {e}"))?;

    Ok(())
}
