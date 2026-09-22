use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Dev: repo Data/kinhphapcu/images; Prod: bundled resource kinhphapcu/images/
pub fn dhammapada_images_dir(app: &AppHandle) -> PathBuf {
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../Data/kinhphapcu/images");
    if dev.is_dir() {
        return dev;
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("kinhphapcu").join("images");
        if bundled.is_dir() {
            return bundled;
        }
    }

    // Fallback: still return the expected relative layout under resources
    app.path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("kinhphapcu")
        .join("images")
}

pub fn verse_image_path(dir: &Path, image_id: u32) -> PathBuf {
    dir.join(format!("{image_id:03}.png"))
}

pub fn load_verse_image_display_data_url(
    app: &AppHandle,
    image_id: u32,
) -> Result<Option<String>, String> {
    if image_id == 0 || image_id > 423 {
        return Ok(None);
    }

    let dir = dhammapada_images_dir(app);
    let source = verse_image_path(&dir, image_id);
    if !source.is_file() {
        return Ok(None);
    }

    let display_path = crate::thumbnail::ensure_display_image(&source)?;
    let display_str = display_path
        .to_str()
        .ok_or_else(|| "Đường dẫn ảnh Pháp Cú không hợp lệ".to_string())?;
    Ok(Some(crate::image_data::to_data_url(display_str)?))
}
