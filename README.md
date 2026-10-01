# BuddaInHere

Ứng dụng desktop Windows hiển thị **widget ảnh Phật** trên màn hình — luôn nổi trên các cửa sổ khác, không che hết desktop. Kèm **Kinh Pháp Cú**, nhạc nền, hẹn giờ và phím tắt toàn cục.

> An lạc trong từng khoảnh khắc.

---

## Tải và cài đặt (người dùng)

### Yêu cầu hệ thống

| Hạng mục | Chi tiết |
|----------|----------|
| Hệ điều hành | **Windows 10 / 11** (64-bit) |
| Dung lượng | ~500 MB trống (tùy bộ ảnh đã chọn) |
| Quyền | Không cần quyền Administrator để cài |

### Bước 1 — Tải bản cài

1. Mở trang [**Releases**](https://github.com/thaivankhuong/buddainhere/releases) trên GitHub.
2. Chọn bản phát hành mới nhất (ví dụ `v0.1.0`).
3. Trong phần **Assets**, tải một trong hai file:
   - **`BuddaInHere_x.x.x_x64-setup.exe`** — trình cài NSIS (khuyên dùng)
   - **`BuddaInHere_x.x.x_x64_en-US.msi`** — gói MSI (dùng khi triển khai qua Group Policy)

> Nếu chưa có bản Release, xem mục [Tự build từ mã nguồn](#tự-build-từ-mã-nguồn) bên dưới.

### Bước 2 — Cài đặt

1. Chạy file `.exe` hoặc `.msi` vừa tải.
2. Làm theo hướng dẫn trên màn hình (Next → Install → Finish).
3. Ứng dụng khởi chạy nền — biểu tượng xuất hiện ở **khay hệ thống** (góc dưới phải, cạnh đồng hồ).

### Bước 3 — Lần chạy đầu

1. **Click trái** biểu tượng khay hệ thống → hiện ảnh Phật tiếp theo trên màn hình.
2. **Click phải** biểu tượng → mở menu:
   - **Ảnh tiếp theo** — chuyển sang ảnh kế
   - **Tạm dừng / Tiếp tục** — bật/tắt overlay
   - **Cài đặt** — mở cửa sổ cấu hình
   - **Thoát** — đóng ứng dụng
3. Lần đầu mở **Cài đặt**, app tự nhập bộ ảnh mẫu (Niệm Phật An Vui + ảnh Tịnh Độ) vào thư viện.

---

## Cách sử dụng

### Khay hệ thống

| Thao tác | Kết quả |
|----------|---------|
| Click trái | Hiện ảnh tiếp theo |
| Click phải → Cài đặt | Mở giao diện cấu hình |
| Click phải → Tạm dừng | Tắt overlay (ảnh biến mất) |
| Click phải → Thoát | Thoát hoàn toàn |

### Tab **Cài đặt**

- **Màn hình hiển thị** — chọn màn hình (hỗ trợ đa màn hình).
- **Vị trí hiển thị** — góc hoặc giữa màn hình.
- **Hiệu ứng & Chu kỳ** — animation vào/ra, thời gian hiện/ẩn, bật overlay, chế độ ngẫu nhiên.
- **Phím tắt** — gán phím toàn cục (tạm dừng, tiếp tục, ảnh kế, bật/tắt overlay).
- **Hẹn giờ hiển thị** — chỉ hiện overlay trong khung giờ đã đặt.
- **Âm thanh** — thêm file nhạc nền, bật/tắt và chỉnh âm lượng.

Nhấn **Lưu** ở cuối cửa sổ để áp dụng thay đổi.

### Tab **Kinh Pháp Cú**

- Học và ôn **423 câu Kinh Pháp Cú** kèm minh họa.
- Chế độ học theo mục tiêu hàng ngày hoặc xem ngẫu nhiên.
- Bật/tắt hiển thị kinh cùng ảnh Phật trên overlay.

### Tab **Kho hình ảnh**

- Duyệt, chọn/bỏ chọn ảnh hiển thị.
- Quản lý **nhóm ảnh** (Tịnh Độ, Niệm Phật An Vui, v.v.).
- Thêm ảnh từ máy tính vào thư viện.

---

## Cách hoạt động

```
Khởi động (nền, khay hệ thống)
        │
        ▼
┌───────────────────┐
│  Scheduler nội bộ   │◄── hẹn giờ / chu kỳ hiện-ẩn
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     ┌─────────────────┐
│  Cửa sổ overlay    │────►│  Ảnh Phật +     │
│  (trong suốt,      │     │  Kinh Pháp Cú   │
│   always-on-top)   │     │  (tuỳ chọn)     │
└───────────────────┘     └─────────────────┘
          ▲
          │ phím tắt / click khay / sự kiện "ảnh kế"
```

- **Overlay** là cửa sổ trong suốt, không chiếm toàn màn hình — bạn vẫn làm việc bình thường.
- **Cấu hình** lưu tại `%APPDATA%\BuddaInHere\config.json`.
- **Thư viện ảnh** lưu tại `%APPDATA%\BuddaInHere\images\`.
- Ảnh gốc đóng gói trong installer; lần đầu chạy được copy vào thư mục người dùng.

---

## Xử lý sự cố

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Không thấy biểu tượng khay hệ thống | Mở **Settings → Personalization → Taskbar → Other system tray icons** → bật BuddaInHere |
| Windows SmartScreen cảnh báo | Chọn **More info → Run anyway** (bản chưa ký số) |
| Overlay không hiện | Mở Cài đặt → bật **Bật overlay** → Lưu |
| Phím tắt không hoạt động | Kiểm tra xung đột với app khác; thử gán phím khác trong Cài đặt |
| Thiếu ảnh sau khi cài | Mở Cài đặt → tab Kho hình ảnh → kiểm tra nhóm ảnh đang bật |

---

## Tự build từ mã nguồn

Dành cho developer hoặc khi chưa có bản Release.

### Yêu cầu

- [Node.js](https://nodejs.org/) 20+
- [Rust stable](https://rustup.rs/) (`rustup default stable`)
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (cho Windows)
- Windows 10/11

### Các bước

```powershell
# 1. Clone repo
git clone https://github.com/thaivankhuong/buddainhere.git
cd buddainhere

# 2. Cài dependency
npm install

# 3. Tải bộ ảnh Niệm Phật An Vui (bắt buộc trước khi build release)
npm run download:niemphatanvui

# 4. Chạy dev
npm run tauri dev

# 5. Build installer (output trong src-tauri/target/release/bundle/)
npm run tauri build
```

File cài đặt nằm tại:

```
src-tauri/target/release/bundle/nsis/BuddaInHere_*_x64-setup.exe
src-tauri/target/release/bundle/msi/BuddaInHere_*_x64_en-US.msi
```

---

## Phát hành bản mới (maintainer)

1. Cập nhật `version` trong `package.json` và `src-tauri/tauri.conf.json` / `Cargo.toml`.
2. Commit và push lên `main`.
3. Tạo tag và push:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

4. GitHub Actions tự build và đăng file cài lên [Releases](https://github.com/thaivankhuong/buddainhere/releases).

Hoặc chạy thủ công: tab **Actions → Release → Run workflow**.

---

## Cấu trúc dự án

| Thư mục / file | Mô tả |
|----------------|-------|
| `src/` | Giao diện React (Cài đặt, Overlay, Kinh Pháp Cú) |
| `src-tauri/` | Backend Rust (Tauri, tray, overlay, cấu hình) |
| `Data/kinhphapcu/` | Ảnh minh họa Kinh Pháp Cú |
| `Data/niemphatanvui-app/` | Ảnh Phật thu gọn (tải bằng script) |
| `image/` | Ảnh mẫu Tịnh Độ đóng gói sẵn |
| `scripts/download-niemphatanvui.mjs` | Script tải ảnh từ niemphatanvui.vn |

---

## Giấy phép & nguồn ảnh

- Mã nguồn: dự án LotusDharma.
- Ảnh Phật chất lượng cao: [niemphatanvui.vn](https://www.niemphatanvui.vn/hinh-phat-chat-luong-cao) — tôn trọng bản quyền và điều khoản sử dụng của nguồn.
