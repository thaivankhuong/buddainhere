# BuddaInHere

App desktop Windows tự đổi wallpaper ảnh Phật A Di Đà và Tây Phương Cực Lạc.

## Yêu cầu

- Node.js 18+
- Rust stable (`rustup default stable`)
- Windows 10/11

## Chạy dev

```bash
npm install
npm run tauri dev
```

## Tính năng Phase 1

- System tray với menu (Ảnh tiếp theo, Tạm dừng, Cài đặt, Thoát)
- Đổi wallpaper desktop qua Windows API
- Scheduler tự động đổi ảnh theo interval
- UI cài đặt chọn thư mục ảnh, interval, chế độ ngẫu nhiên
- Ảnh mẫu trong `public/images/`

## Cấu trúc

- `src-tauri/src/wallpaper.rs` — Windows API đổi wallpaper
- `src-tauri/src/image_manager.rs` — scan và chọn ảnh
- `src-tauri/src/scheduler.rs` — timer nền
- `src-tauri/src/config.rs` — lưu cấu hình tại `%APPDATA%/BuddaInHere/config.json`
- `src/components/TraySettings.tsx` — UI cài đặt
