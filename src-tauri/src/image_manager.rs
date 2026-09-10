use rand::seq::SliceRandom;
use std::fs;
use std::path::{Path, PathBuf};

const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "bmp", "gif"];
const MUSIC_EXTENSIONS: &[&str] = &["mp3", "wav", "ogg", "m4a", "flac"];

pub fn is_image_loadable(path: &str) -> bool {
    let p = Path::new(path);
    if !p.is_file() || !is_image_file(p) {
        return false;
    }
    image::open(p).is_ok()
}

pub fn scan_images(dir: &Path) -> Result<Vec<String>, String> {
    scan_image_paths(dir)
}

pub fn scan_image_paths(dir: &Path) -> Result<Vec<String>, String> {
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut images: Vec<String> = fs::read_dir(dir)
        .map_err(|e| format!("Không đọc được thư mục {}: {e}", dir.display()))?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_file())
        .filter(|entry| is_image_file(&entry.path()))
        .filter_map(|entry| entry.path().to_str().map(String::from))
        .collect();

    images.sort();
    Ok(images)
}

pub fn scan_loadable_images(dir: &Path) -> Result<Vec<String>, String> {
    Ok(scan_image_paths(dir)?
        .into_iter()
        .filter(|path| is_image_loadable(path))
        .collect())
}

fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| IMAGE_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn is_music_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| MUSIC_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn sanitize_filename(file_name: &str) -> String {
    let path = Path::new(file_name);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg");
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let safe_stem: String = stem
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let safe_stem = if safe_stem.is_empty() {
        "image".to_string()
    } else {
        safe_stem
    };
    format!("{safe_stem}.{ext}")
}

fn unique_dest_path(dest_dir: &Path, file_name: &str) -> PathBuf {
    let mut dest = dest_dir.join(file_name);
    if !dest.exists() {
        return dest;
    }

    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file");
    let ext = Path::new(file_name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{e}"))
        .unwrap_or_default();

    let mut counter = 1;
    loop {
        dest = dest_dir.join(format!("{stem}_{counter}{ext}"));
        if !dest.exists() {
            return dest;
        }
        counter += 1;
    }
}

pub fn import_images(gallery_dir: &Path, source_paths: &[String]) -> Result<Vec<String>, String> {
    crate::config::ensure_image_dir(gallery_dir)?;

    let mut imported = Vec::new();
    for source in source_paths {
        let src = Path::new(source);
        if !src.is_file() || !is_image_file(src) {
            continue;
        }

        let file_name = src
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| format!("Tên file không hợp lệ: {source}"))?;

        let safe_name = sanitize_filename(file_name);
        let dest = unique_dest_path(gallery_dir, &safe_name);
        fs::copy(src, &dest).map_err(|e| format!("Không copy được {source}: {e}"))?;

        let path_str = dest
            .to_str()
            .ok_or_else(|| format!("Đường dẫn không hợp lệ: {}", dest.display()))?;

        if !is_image_loadable(path_str) {
            let _ = fs::remove_file(&dest);
            continue;
        }

        let _ = crate::thumbnail::ensure_thumbnail(&dest);
        imported.push(path_str.to_string());
    }

    Ok(imported)
}

pub fn import_music(music_dir: &Path, source_path: &str) -> Result<String, String> {
    crate::config::ensure_image_dir(music_dir)?;

    let src = Path::new(source_path);
    if !src.is_file() || !is_music_file(src) {
        return Err("File nhạc không hợp lệ".to_string());
    }

    let file_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Tên file nhạc không hợp lệ".to_string())?;

    let safe_name = sanitize_filename(file_name);
    let dest = unique_dest_path(music_dir, &safe_name);
    fs::copy(src, &dest).map_err(|e| format!("Không copy được nhạc: {e}"))?;

    dest.to_str()
        .map(String::from)
        .ok_or_else(|| "Đường dẫn nhạc không hợp lệ".to_string())
}

pub fn remove_music(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if p.exists() {
        fs::remove_file(p).map_err(|e| format!("Không xóa được nhạc: {e}"))?;
    }
    Ok(())
}

pub fn remove_image(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if p.exists() {
        fs::remove_file(p).map_err(|e| format!("Không xóa được ảnh: {e}"))?;
    }
    crate::thumbnail::remove_thumbnail(path);
    Ok(())
}

pub fn filter_selected(all_images: &[String], selected: &[String]) -> Vec<String> {
    if selected.is_empty() {
        return all_images.to_vec();
    }

    let mut filtered: Vec<String> = selected
        .iter()
        .filter(|s| all_images.contains(s))
        .cloned()
        .collect();

    if filtered.is_empty() {
        return all_images.to_vec();
    }

    filtered.sort();
    filtered
}

pub fn pick_next(images: &[String], index: &mut usize, random: bool) -> Option<String> {
    if images.is_empty() {
        return None;
    }

    if random {
        let mut rng = rand::thread_rng();
        images.choose(&mut rng).cloned()
    } else {
        let path = images[*index % images.len()].clone();
        *index = (*index + 1) % images.len();
        Some(path)
    }
}

pub fn default_image_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../image")
}

pub fn migrate_bundled_images(gallery_dir: &Path) -> Result<usize, String> {
    crate::config::ensure_image_dir(gallery_dir)?;

    let existing = scan_images(gallery_dir)?;
    if !existing.is_empty() {
        return Ok(0);
    }

    let bundled = default_image_dir();
    if !bundled.exists() {
        return Ok(0);
    }

    let bundled_images = scan_images(&bundled)?;
    let paths: Vec<String> = bundled_images;
    let imported = import_images(gallery_dir, &paths)?;
    Ok(imported.len())
}
