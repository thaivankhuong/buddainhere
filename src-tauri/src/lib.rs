mod config;

mod image_data;

mod image_manager;

mod thumbnail;

use config::{
    display_name_from_path, gallery_dir, load_config, new_id, save_config, AppConfig, MusicTrack,
};

use std::path::PathBuf;

use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewWindow, Wry,
};



struct GalleryCache {
    dir: String,
    paths: Vec<String>,
}

struct AppState {
    config: Mutex<AppConfig>,
    current_image: Mutex<Option<String>>,
    image_index: Mutex<usize>,
    gallery_cache: Mutex<Option<GalleryCache>>,
}

struct TrayMenuState {
    pause_item: MenuItem<Wry>,
}

fn pause_menu_label(overlay_enabled: bool) -> &'static str {
    if overlay_enabled {
        "Tạm dừng"
    } else {
        "Tiếp tục"
    }
}

fn sync_pause_menu(app: &AppHandle, overlay_enabled: bool) {
    if let Some(tray_state) = app.try_state::<TrayMenuState>() {
        let _ = tray_state
            .pause_item
            .set_text(pause_menu_label(overlay_enabled));
    }
}



impl AppState {

    fn new() -> Self {

        let gallery = gallery_dir();

        let _ = config::ensure_image_dir(&gallery);

        let _ = image_manager::migrate_bundled_images(&gallery);



        let config = load_config();

        Self {
            config: Mutex::new(config),
            current_image: Mutex::new(None),
            image_index: Mutex::new(0),
            gallery_cache: Mutex::new(None),
        }
    }

    fn invalidate_gallery_cache(&self) {
        *self.gallery_cache.lock().unwrap() = None;
    }

    fn gallery_images(&self, image_dir: &str) -> Result<Vec<String>, String> {
        let mut cache = self.gallery_cache.lock().unwrap();
        let needs_refresh = cache
            .as_ref()
            .map(|entry| entry.dir != image_dir)
            .unwrap_or(true);

        if needs_refresh {
            let paths = image_manager::scan_image_paths(PathBuf::from(image_dir).as_path())?;
            *cache = Some(GalleryCache {
                dir: image_dir.to_string(),
                paths,
            });
        }

        Ok(cache.as_ref().unwrap().paths.clone())
    }
}



fn normalize_config_for_save(config: &mut AppConfig) -> Result<(), String> {
    let gallery = gallery_dir().to_string_lossy().into_owned();
    config.image_dir = gallery;

    let all_images = image_manager::scan_image_paths(gallery_dir().as_path())?;
    if config.selected_images.is_empty() {
        return Ok(());
    }

    config.selected_images = config
        .selected_images
        .iter()
        .filter(|path| all_images.iter().any(|existing| existing == *path))
        .cloned()
        .collect();

    Ok(())
}

fn pick_next_image(state: &AppState) -> Result<String, String> {
    let config = state.config.lock().unwrap().clone();
    config::ensure_image_dir(PathBuf::from(&config.image_dir).as_path())?;

    let all_images = state.gallery_images(&config.image_dir)?;
    let images = image_manager::filter_selected(&all_images, &config.selected_images);



    if images.is_empty() {

        return Err(format!(

            "Không có ảnh trong kho: {}",

            config.image_dir

        ));

    }



    let next = {

        let mut idx = state.image_index.lock().unwrap();

        image_manager::pick_next(&images, &mut idx, config.random_mode)

            .ok_or_else(|| "Không chọn được ảnh".to_string())?

    };



    *state.current_image.lock().unwrap() = Some(next.clone());

    Ok(next)

}



fn emit_config_changed(app: &AppHandle, config: &AppConfig) {
    sync_pause_menu(app, config.overlay_enabled);
    let _ = app.emit("config-changed", config.clone());
}



fn emit_overlay_next(app: &AppHandle) {

    let _ = app.emit("overlay-next", ());

}



#[tauri::command]

fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {

    Ok(state.config.lock().unwrap().clone())

}



#[tauri::command]

fn save_app_config(app: AppHandle, state: State<'_, AppState>, mut config: AppConfig) -> Result<(), String> {
    normalize_config_for_save(&mut config)?;
    config::ensure_image_dir(PathBuf::from(&config.image_dir).as_path())?;
    save_config(&config)?;
    *state.config.lock().unwrap() = config.clone();
    state.invalidate_gallery_cache();
    emit_config_changed(&app, &config);
    Ok(())
}



#[tauri::command]

fn get_images(state: State<'_, AppState>) -> Result<Vec<String>, String> {

    let config = state.config.lock().unwrap().clone();

    image_manager::scan_images(PathBuf::from(&config.image_dir).as_path())

}



#[tauri::command]

fn get_gallery_images(state: State<'_, AppState>) -> Result<Vec<String>, String> {

    get_images(state)

}



#[tauri::command]

fn get_current_image(state: State<'_, AppState>) -> Result<Option<String>, String> {

    Ok(state.current_image.lock().unwrap().clone())

}



#[tauri::command]

fn next_image(state: State<'_, AppState>) -> Result<String, String> {

    pick_next_image(&state)

}



#[tauri::command]

fn next_image_data_url(state: State<'_, AppState>) -> Result<String, String> {
    let path = pick_next_image(&state)?;
    image_data::to_data_url(&path)
}

#[tauri::command]
fn next_image_display_path(state: State<'_, AppState>) -> Result<String, String> {
    let path = pick_next_image(&state)?;
    let display_path = thumbnail::ensure_display_image(PathBuf::from(&path).as_path())?;
    display_path
        .to_str()
        .map(String::from)
        .ok_or_else(|| "Đường dẫn ảnh hiển thị không hợp lệ".to_string())
}

#[tauri::command]
fn next_image_display_data_url(state: State<'_, AppState>) -> Result<String, String> {
    let path = pick_next_image(&state)?;
    let display_path = thumbnail::ensure_display_image(PathBuf::from(&path).as_path())?;
    let display_str = display_path
        .to_str()
        .ok_or_else(|| "Đường dẫn ảnh hiển thị không hợp lệ".to_string())?;
    image_data::to_data_url(display_str)
}



#[derive(serde::Serialize)]

#[serde(rename_all = "camelCase")]

struct GalleryThumbnail {

    path: String,

    data_url: String,

}



#[tauri::command]
fn get_image_data_url(path: String) -> Result<String, String> {
    image_data::to_data_url(&path)
}

#[tauri::command]
fn get_image_thumbnail(path: String) -> Result<String, String> {
    thumbnail::to_thumbnail_data_url(&path)
}

#[tauri::command]
fn get_music_data_url(path: String) -> Result<String, String> {
    image_data::to_audio_data_url(&path)
}

#[tauri::command]
fn get_gallery_thumbnails(state: State<'_, AppState>) -> Result<Vec<GalleryThumbnail>, String> {
    let images = get_images(state)?;
    let mut thumbnails = Vec::with_capacity(images.len());
    for path in images {
        if let Ok(data_url) = thumbnail::to_thumbnail_data_url(&path) {
            thumbnails.push(GalleryThumbnail { path, data_url });
        }
    }
    Ok(thumbnails)
}



#[tauri::command]

fn import_images(state: State<'_, AppState>, paths: Vec<String>) -> Result<Vec<String>, String> {

    let config = state.config.lock().unwrap().clone();

    let gallery = PathBuf::from(&config.image_dir);

    let imported = image_manager::import_images(&gallery, &paths)?;
    state.invalidate_gallery_cache();
    Ok(imported)
}



#[tauri::command]

fn remove_image(app: AppHandle, state: State<'_, AppState>, path: String) -> Result<(), String> {

    image_manager::remove_image(&path)?;
    state.invalidate_gallery_cache();

    let mut config = state.config.lock().unwrap().clone();

    config.selected_images.retain(|p| p != &path);
    config.image_group_assignments.remove(&path);

    save_config(&config)?;

    *state.config.lock().unwrap() = config.clone();

    emit_config_changed(&app, &config);

    Ok(())

}



#[tauri::command]
fn import_music(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    display_name: Option<String>,
) -> Result<MusicTrack, String> {
    let music_dir = config::ensure_music_dir()?;
    let imported_path = image_manager::import_music(&music_dir, &path)?;

    let track = MusicTrack {
        id: new_id(),
        path: imported_path,
        display_name: display_name
            .filter(|n| !n.trim().is_empty())
            .unwrap_or_else(|| display_name_from_path(&path)),
    };

    let mut config = state.config.lock().unwrap().clone();
    if config.active_music_id.is_none() {
        config.active_music_id = Some(track.id.clone());
    }
    config.music_tracks.push(track.clone());
    save_config(&config)?;
    *state.config.lock().unwrap() = config.clone();
    emit_config_changed(&app, &config);

    Ok(track)
}

#[tauri::command]
fn remove_music_track(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut config = state.config.lock().unwrap().clone();
    let track = config
        .music_tracks
        .iter()
        .find(|t| t.id == id)
        .cloned()
        .ok_or_else(|| "Không tìm thấy track nhạc".to_string())?;

    image_manager::remove_music(&track.path)?;
    config.music_tracks.retain(|t| t.id != id);
    if config.active_music_id.as_deref() == Some(id.as_str()) {
        config.active_music_id = config.music_tracks.first().map(|t| t.id.clone());
    }
    save_config(&config)?;
    *state.config.lock().unwrap() = config.clone();
    emit_config_changed(&app, &config);
    Ok(())
}

#[tauri::command]
fn rename_music_track(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    display_name: String,
) -> Result<MusicTrack, String> {
    let name = display_name.trim();
    if name.is_empty() {
        return Err("Tên nhạc không được để trống".to_string());
    }

    let mut config = state.config.lock().unwrap().clone();
    let track = config
        .music_tracks
        .iter_mut()
        .find(|t| t.id == id)
        .ok_or_else(|| "Không tìm thấy track nhạc".to_string())?;

    track.display_name = name.to_string();
    let updated = track.clone();
    save_config(&config)?;
    *state.config.lock().unwrap() = config.clone();
    emit_config_changed(&app, &config);
    Ok(updated)
}



fn setup_overlay_window(window: &WebviewWindow) -> tauri::Result<()> {

    window.set_always_on_top(true)?;

    window.set_decorations(false)?;

    window.set_shadow(false)?;

    let _ = window.set_title("");

    window.set_ignore_cursor_events(true)?;

    Ok(())

}



fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let overlay_enabled = app.state::<AppState>().config.lock().unwrap().overlay_enabled;

    let next_item = MenuItem::with_id(app, "next", "Ảnh tiếp theo", true, None::<&str>)?;

    let pause_item = MenuItem::with_id(
        app,
        "pause",
        pause_menu_label(overlay_enabled),
        true,
        None::<&str>,
    )?;
    app.manage(TrayMenuState {
        pause_item: pause_item.clone(),
    });

    let settings_item = MenuItem::with_id(app, "settings", "Cài đặt", true, None::<&str>)?;

    let quit_item = MenuItem::with_id(app, "quit", "Thoát", true, None::<&str>)?;

    let separator = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(

        app,

        &[&next_item, &pause_item, &separator, &settings_item, &quit_item],

    )?;



    let icon = app

        .default_window_icon()

        .ok_or(tauri::Error::FailedToReceiveMessage)?

        .clone();



    let _tray = TrayIconBuilder::new()

        .icon(icon)

        .tooltip("BuddaInHere")

        .menu(&menu)

        .show_menu_on_left_click(false)

        .on_menu_event(|app, event| {

            let state = app.state::<AppState>();

            match event.id().as_ref() {

                "next" => emit_overlay_next(app),

                "pause" => {
                    let mut config = state.config.lock().unwrap().clone();
                    config.overlay_enabled = !config.overlay_enabled;
                    let _ = save_config(&config);
                    *state.config.lock().unwrap() = config.clone();
                    emit_config_changed(app, &config);
                    if config.overlay_enabled {
                        emit_overlay_next(app);
                    }
                }

                "settings" => {

                    if let Some(window) = app.get_webview_window("main") {

                        let _ = window.show();

                        let _ = window.unminimize();

                        let _ = window.set_focus();

                    }

                }

                "quit" => {

                    app.exit(0);

                }

                _ => {}

            }

        })

        .on_tray_icon_event(|tray, event| {

            if let TrayIconEvent::Click {

                button: MouseButton::Left,

                button_state: MouseButtonState::Up,

                ..

            } = event

            {

                emit_overlay_next(tray.app_handle());

            }

        })

        .build(app)?;



    Ok(())

}



#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub fn run() {

    tauri::Builder::default()

        .plugin(tauri_plugin_opener::init())

        .plugin(tauri_plugin_dialog::init())

        .manage(AppState::new())

        .invoke_handler(tauri::generate_handler![

            get_config,

            save_app_config,

            get_images,

            get_gallery_images,

            get_current_image,

            next_image,

            next_image_data_url,

            next_image_display_path,

            next_image_display_data_url,

            get_image_data_url,

            get_image_thumbnail,

            get_music_data_url,

            get_gallery_thumbnails,

            import_images,

            remove_image,

            import_music,
            remove_music_track,
            rename_music_track,

        ])

        .on_window_event(|window, event| {

            if window.label() == "main" {

                if let tauri::WindowEvent::CloseRequested { api, .. } = event {

                    api.prevent_close();

                    let _ = window.hide();

                }

            }

        })

        .setup(|app| {

            build_tray(app.handle())?;



            if let Some(window) = app.get_webview_window("main") {

                let _ = window.hide();

            }



            if let Some(overlay) = app.get_webview_window("overlay") {

                setup_overlay_window(&overlay)?;

            }



            Ok(())

        })

        .run(tauri::generate_context!())

        .expect("error while running tauri application");

}


