use rand::Rng;

use serde::{Deserialize, Serialize};

use std::collections::HashMap;

use std::fs;

use std::path::{Path, PathBuf};



#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]

#[serde(rename_all = "camelCase")]

pub enum ImagePosition {

    TopLeft,

    TopCenter,

    TopRight,

    CenterLeft,

    Center,

    CenterRight,

    BottomLeft,

    BottomCenter,

    BottomRight,

}



impl Default for ImagePosition {

    fn default() -> Self {

        Self::Center

    }

}



#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]

#[serde(rename_all = "camelCase")]

pub enum AnimationIn {

    FadeIn,

    SlideInTop,

    SlideInBottom,

    SlideInLeft,

    SlideInRight,

    ZoomIn,

    ZoomInRotate,

    BounceIn,

    BlurIn,

    FlipInX,

    FlipInY,

    ScaleUp,

}



impl Default for AnimationIn {

    fn default() -> Self {

        Self::FadeIn

    }

}



#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]

#[serde(rename_all = "camelCase")]

pub enum AnimationOut {

    FadeOut,

    SlideOutTop,

    SlideOutBottom,

    SlideOutLeft,

    SlideOutRight,

    ZoomOut,

    ZoomOutRotate,

    BounceOut,

    BlurOut,

    FlipOutX,

    FlipOutY,

    ScaleDown,

}



impl Default for AnimationOut {

    fn default() -> Self {

        Self::FadeOut

    }

}



#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]

#[serde(rename_all = "camelCase")]

pub struct ImageGroup {

    pub id: String,

    pub name: String,

}



#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]

#[serde(rename_all = "camelCase")]

pub struct MusicTrack {

    pub id: String,

    pub path: String,

    pub display_name: String,

}



#[derive(Debug, Clone, Serialize, Deserialize)]

#[serde(rename_all = "camelCase")]

pub struct AppConfig {

    pub image_dir: String,

    #[serde(default = "default_visible_secs")]

    pub visible_secs: u64,

    #[serde(default = "default_hidden_secs")]

    pub hidden_secs: u64,

    #[serde(default = "default_fade_ms")]

    pub fade_ms: u64,

    pub random_mode: bool,

    #[serde(default = "default_overlay_enabled")]

    pub overlay_enabled: bool,

    #[serde(default)]

    pub image_position: ImagePosition,

    #[serde(default)]

    pub animation_in: AnimationIn,

    #[serde(default)]

    pub animation_out: AnimationOut,

    #[serde(default)]

    pub selected_images: Vec<String>,

    #[serde(default)]

    pub music_enabled: bool,

    #[serde(default)]

    pub music_path: Option<String>,

    #[serde(default = "default_music_volume")]

    pub music_volume: f64,

    #[serde(default)]

    pub image_groups: Vec<ImageGroup>,

    #[serde(default)]

    pub image_group_assignments: HashMap<String, String>,

    #[serde(default)]

    pub music_tracks: Vec<MusicTrack>,

    #[serde(default)]

    pub active_music_id: Option<String>,

}



fn default_visible_secs() -> u64 {

    10

}



fn default_hidden_secs() -> u64 {

    10

}



fn default_fade_ms() -> u64 {

    1500

}



fn default_overlay_enabled() -> bool {

    true

}



fn default_music_volume() -> f64 {

    0.5

}



pub fn new_id() -> String {

    let mut rng = rand::thread_rng();

    format!("{:x}{:x}", rng.gen::<u32>(), rng.gen::<u32>())

}



pub fn display_name_from_path(path: &str) -> String {

    Path::new(path)

        .file_stem()

        .and_then(|s| s.to_str())

        .unwrap_or("Nhạc")

        .to_string()

}



pub fn app_data_dir() -> PathBuf {

    dirs::data_dir()

        .unwrap_or_else(|| PathBuf::from("."))

        .join("BuddaInHere")

}



pub fn gallery_dir() -> PathBuf {

    app_data_dir().join("gallery")

}



pub fn music_dir() -> PathBuf {

    app_data_dir().join("music")

}



pub fn thumb_dir() -> PathBuf {

    app_data_dir().join("thumbs")

}



pub fn display_dir() -> PathBuf {

    app_data_dir().join("display")

}



impl Default for AppConfig {

    fn default() -> Self {

        Self {

            image_dir: gallery_dir().to_string_lossy().into_owned(),

            visible_secs: default_visible_secs(),

            hidden_secs: default_hidden_secs(),

            fade_ms: default_fade_ms(),

            random_mode: true,

            overlay_enabled: default_overlay_enabled(),

            image_position: ImagePosition::default(),

            animation_in: AnimationIn::default(),

            animation_out: AnimationOut::default(),

            selected_images: Vec::new(),

            music_enabled: false,

            music_path: None,

            music_volume: default_music_volume(),

            image_groups: Vec::new(),

            image_group_assignments: HashMap::new(),

            music_tracks: Vec::new(),

            active_music_id: None,

        }

    }

}



pub fn config_path() -> PathBuf {

    app_data_dir().join("config.json")

}



fn migrate_config(config: &mut AppConfig) {

    if config.music_tracks.is_empty() {

        if let Some(ref old_path) = config.music_path {

            if Path::new(old_path).exists() {

                let id = new_id();

                config.music_tracks.push(MusicTrack {

                    id: id.clone(),

                    path: old_path.clone(),

                    display_name: display_name_from_path(old_path),

                });

                config.active_music_id = Some(id);

            }

        }

    }

    config.music_path = None;



    config

        .image_group_assignments

        .retain(|path, group_id| {

            Path::new(path).exists() && config.image_groups.iter().any(|g| g.id == *group_id)

        });

}



pub fn load_config() -> AppConfig {

    let path = config_path();

    let default = AppConfig::default();



    let mut config = if !path.exists() {

        default.clone()

    } else {

        fs::read_to_string(&path)

            .ok()

            .and_then(|content| serde_json::from_str(&content).ok())

            .unwrap_or_else(|| default.clone())

    };



    let gallery = gallery_dir().to_string_lossy().into_owned();
    let mut dir_changed = false;
    if config.image_dir != gallery {
        config.image_dir = gallery;
        dir_changed = true;
    }

    let had_legacy_music = config.music_path.is_some();
    migrate_config(&mut config);

    if !path.exists() || dir_changed || had_legacy_music {
        let _ = save_config(&config);
    }



    config

}



pub fn save_config(config: &AppConfig) -> Result<(), String> {

    let path = config_path();

    if let Some(parent) = path.parent() {

        fs::create_dir_all(parent)

            .map_err(|e| format!("Không tạo được thư mục cấu hình: {e}"))?;

    }

    let content = serde_json::to_string_pretty(config)

        .map_err(|e| format!("Không serialize config: {e}"))?;

    fs::write(&path, content).map_err(|e| format!("Không lưu config: {e}"))

}



pub fn ensure_image_dir(dir: &Path) -> Result<(), String> {

    if !dir.exists() {

        fs::create_dir_all(dir).map_err(|e| format!("Không tạo thư mục ảnh: {e}"))?;

    }

    Ok(())

}



pub fn ensure_music_dir() -> Result<PathBuf, String> {

    let dir = music_dir();

    ensure_image_dir(&dir)?;

    Ok(dir)

}


