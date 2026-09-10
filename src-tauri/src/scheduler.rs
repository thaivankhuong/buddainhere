use crate::image_manager;
use crate::wallpaper;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

pub struct Scheduler {
    running: Arc<AtomicBool>,
    handle: Mutex<Option<thread::JoinHandle<()>>>,
}

impl Scheduler {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            handle: Mutex::new(None),
        }
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        if let Ok(mut handle) = self.handle.lock() {
            if let Some(join) = handle.take() {
                let _ = join.join();
            }
        }
    }

    pub fn start(
        &self,
        image_dir: PathBuf,
        interval_secs: u64,
        random: bool,
        current_wallpaper: Arc<Mutex<Option<String>>>,
        image_index: Arc<Mutex<usize>>,
    ) {
        self.stop();
        self.running.store(true, Ordering::SeqCst);

        let running = Arc::clone(&self.running);
        let join = thread::spawn(move || {
            while running.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_secs(interval_secs.max(1)));
                if !running.load(Ordering::SeqCst) {
                    break;
                }

                let images = match image_manager::scan_images(&image_dir) {
                    Ok(images) => images,
                    Err(_) => continue,
                };

                let next = {
                    let mut idx = image_index.lock().unwrap();
                    image_manager::pick_next(&images, &mut idx, random)
                };

                if let Some(path) = next {
                    if wallpaper::set_wallpaper(&path).is_ok() {
                        *current_wallpaper.lock().unwrap() = Some(path);
                    }
                }
            }
        });

        *self.handle.lock().unwrap() = Some(join);
    }
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new()
    }
}
