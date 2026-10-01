use crate::config::{AppConfig, ImageGroup};
use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Deserialize)]
struct Manifest {
    version: u32,
    groups: Vec<ManifestGroup>,
}

#[derive(Deserialize)]
struct ManifestGroup {
    slug: String,
    name: String,
    images: Vec<ManifestImage>,
}

#[derive(Deserialize)]
struct ManifestImage {
    file: String,
}

pub struct SeededGroup {
    group: ImageGroup,
    paths: Vec<String>,
}

pub struct SeedResult {
    version: u32,
    groups: Vec<SeededGroup>,
}

/// Dev: repo Data/niemphatanvui-app; Prod: bundled resource niemphatanvui/
fn source_dir(app: &AppHandle) -> PathBuf {
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../Data/niemphatanvui-app");
    if dev.join("manifest.json").is_file() {
        return dev;
    }

    app.path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("niemphatanvui")
}

/// Copy ảnh Niệm Phật An Vui vào gallery nếu manifest mới hơn lần seed trước.
/// Ảnh đã có trong gallery (cùng tên) được dùng lại, không copy trùng.
pub fn import_pending(
    app: &AppHandle,
    gallery: &Path,
    seeded_version: u32,
) -> Result<Option<SeedResult>, String> {
    let dir = source_dir(app);
    let manifest_path = dir.join("manifest.json");
    if !manifest_path.is_file() {
        return Ok(None);
    }

    let content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Không đọc được manifest ảnh: {e}"))?;
    let manifest: Manifest = serde_json::from_str(&content)
        .map_err(|e| format!("Manifest ảnh không hợp lệ: {e}"))?;
    if manifest.version <= seeded_version {
        return Ok(None);
    }

    crate::config::ensure_image_dir(gallery)?;

    let mut groups = Vec::new();
    for group in manifest.groups {
        let mut paths = Vec::new();
        for image in &group.images {
            let src = dir.join(&image.file);
            let Some(file_name) = src.file_name() else {
                continue;
            };
            if !src.is_file() {
                continue;
            }

            let dest = gallery.join(file_name);
            if !dest.exists() {
                fs::copy(&src, &dest)
                    .map_err(|e| format!("Không copy được {}: {e}", src.display()))?;
            }
            let _ = crate::thumbnail::ensure_thumbnail(&dest);

            if let Some(path) = dest.to_str() {
                paths.push(path.to_string());
            }
        }

        if !paths.is_empty() {
            groups.push(SeededGroup {
                group: ImageGroup {
                    id: group.slug,
                    name: group.name,
                },
                paths,
            });
        }
    }

    if groups.is_empty() {
        return Ok(None);
    }

    Ok(Some(SeedResult {
        version: manifest.version,
        groups,
    }))
}

/// Nhóm dùng slug làm id ổn định; giữ nguyên tên nhóm và phân loại người dùng đã sửa.
pub fn apply(config: &mut AppConfig, result: SeedResult) {
    let first_group_id = result.groups.first().map(|g| g.group.id.clone());

    for seeded in result.groups {
        let group_id = seeded.group.id.clone();
        if !config.image_groups.iter().any(|g| g.id == group_id) {
            config.image_groups.push(seeded.group);
        }
        for path in seeded.paths {
            config
                .image_group_assignments
                .entry(path)
                .or_insert_with(|| group_id.clone());
        }
    }

    if config.active_image_group_id.is_none() {
        config.active_image_group_id = first_group_id;
    }
    config.niemphatanvui_seeded_version = result.version;
}
