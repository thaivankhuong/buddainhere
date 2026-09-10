use base64::{engine::general_purpose::STANDARD, Engine};
use std::path::Path;

pub fn to_data_url(path: &str) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("Không đọc được ảnh {path}: {e}"))?;
    let mime = mime_for_path(path);
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

fn mime_for_path(path: &str) -> &'static str {
    match Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("gif") => "image/gif",
        _ => "image/jpeg",
    }
}

pub fn to_audio_data_url(path: &str) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("Không đọc được nhạc {path}: {e}"))?;
    let mime = mime_for_audio(path);
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

fn mime_for_audio(path: &str) -> &'static str {
    match Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("mp3") => "audio/mpeg",
        Some("wav") => "audio/wav",
        Some("ogg") => "audio/ogg",
        Some("m4a") => "audio/mp4",
        Some("flac") => "audio/flac",
        _ => "audio/mpeg",
    }
}
