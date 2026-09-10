use base64::{engine::general_purpose::STANDARD, Engine};
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};

const THUMB_MAX_PX: u32 = 200;
const DISPLAY_MAX_PX: u32 = 1920;
const JPEG_QUALITY: u8 = 75;
const DISPLAY_JPEG_QUALITY: u8 = 85;

pub fn thumb_path_for(source: &Path) -> PathBuf {
    let file_name = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image");
    crate::config::thumb_dir().join(format!("{file_name}.thumb.jpg"))
}

fn thumb_is_fresh(source: &Path, thumb: &Path) -> bool {
    if !thumb.exists() {
        return false;
    }
    let Ok(src_meta) = fs::metadata(source) else {
        return false;
    };
    let Ok(thumb_meta) = fs::metadata(thumb) else {
        return false;
    };
    let Ok(src_mod) = src_meta.modified() else {
        return false;
    };
    let Ok(thumb_mod) = thumb_meta.modified() else {
        return false;
    };
    thumb_mod >= src_mod
}

pub fn ensure_thumbnail(source: &Path) -> Result<PathBuf, String> {
    let thumb_dir = crate::config::thumb_dir();
    crate::config::ensure_image_dir(&thumb_dir)?;

    let thumb_path = thumb_path_for(source);
    if thumb_is_fresh(source, &thumb_path) {
        return Ok(thumb_path);
    }

    let img = image::open(source).map_err(|e| format!("Không mở được ảnh {}: {e}", source.display()))?;
    let thumb = img.thumbnail(THUMB_MAX_PX, THUMB_MAX_PX);

    let mut buffer = Cursor::new(Vec::new());
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, JPEG_QUALITY);
    encoder
        .encode(
            thumb.as_bytes(),
            thumb.width(),
            thumb.height(),
            thumb.color().into(),
        )
        .map_err(|e| format!("Không tạo thumbnail: {e}"))?;

    fs::write(&thumb_path, buffer.into_inner())
        .map_err(|e| format!("Không lưu thumbnail: {e}"))?;

    Ok(thumb_path)
}

pub fn to_thumbnail_data_url(source: &str) -> Result<String, String> {
    let path = Path::new(source);
    let thumb = ensure_thumbnail(path)?;
    let bytes = fs::read(&thumb).map_err(|e| format!("Không đọc thumbnail: {e}"))?;
    Ok(format!(
        "data:image/jpeg;base64,{}",
        STANDARD.encode(bytes)
    ))
}

pub fn remove_thumbnail(source: &str) {
    let thumb = thumb_path_for(Path::new(source));
    let _ = fs::remove_file(thumb);
    remove_display_image(source);
}

pub fn display_path_for(source: &Path) -> PathBuf {
    let file_name = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image");
    crate::config::display_dir().join(format!("{file_name}.display.jpg"))
}

fn encode_jpeg(img: &image::DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    let mut buffer = Cursor::new(Vec::new());
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, quality);
    encoder
        .encode(
            img.as_bytes(),
            img.width(),
            img.height(),
            img.color().into(),
        )
        .map_err(|e| format!("Không tạo ảnh hiển thị: {e}"))?;
    Ok(buffer.into_inner())
}

pub fn ensure_display_image(source: &Path) -> Result<PathBuf, String> {
    let display_dir = crate::config::display_dir();
    crate::config::ensure_image_dir(&display_dir)?;

    let display_path = display_path_for(source);
    if thumb_is_fresh(source, &display_path) {
        return Ok(display_path);
    }

    let img = image::open(source)
        .map_err(|e| format!("Không mở được ảnh {}: {e}", source.display()))?;
    let display = img.thumbnail(DISPLAY_MAX_PX, DISPLAY_MAX_PX);
    let bytes = encode_jpeg(&display, DISPLAY_JPEG_QUALITY)?;
    fs::write(&display_path, bytes).map_err(|e| format!("Không lưu ảnh hiển thị: {e}"))?;

    Ok(display_path)
}

pub fn remove_display_image(source: &str) {
    let display = display_path_for(Path::new(source));
    let _ = fs::remove_file(display);
}
