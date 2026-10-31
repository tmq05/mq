# mq — Nền tảng nghe nhạc trực tuyến tối giản & liền mạch

<p align="center">
  <img src="client/public/logo.svg" width="80" height="80" alt="mq logo" />
</p>

**mq** là website nghe nhạc trực tuyến được xây dựng theo phong cách thiết kế tối giản, tài liệu hóa của **Ollama Design System** (`DESIGN.md`): hình học viên thuốc (`rounded-full`), hairline border (1px), không gradient màu mè, bảng màu đen/trắng tương phản cao và trình phát đa nguồn không ngắt quãng (uninterrupted playback across page transitions).

---

## 🌟 Tính năng nổi bật

1. **Trình phát đa nguồn (`PlayerEngine`)**:
   - Kiến trúc Adapter thông minh: `HtmlAudioAdapter` (MP3/FLAC/Audio Range stream) và `YouTubeAdapter` (YouTube IFrame Player API).
   - Chuyển đổi giữa các nguồn mượt mà, không bao giờ bị chồng tiếng.
   - Nhạc phát liên tục không bị gián đoạn khi chuyển trang (SPA router).
   - Hàng đợi (Queue) quản lý trực quan, hỗ trợ xáo bài (Shuffle), lặp lại (Off / All / One).
   - Phím tắt tiện lợi: `Space` (Play/Pause), `Mũi tên Trái/Phải` (Tua ±5s), `Mũi tên Lên/Xuống` (Âm lượng), `M` (Bật/Tắt tiếng), `L` (Bật/Tắt lời bài hát).
   - Tích hợp chuẩn **Media Session API** (hiển thị bìa album, điều khiển tai nghe/bàn phím Bluetooth).

2. **Tìm kiếm tổng hợp & Siêu kho nhạc**:
   - Tích hợp các nhà cung cấp âm nhạc chính thức:
     - **mq Local**: Nhạc bản quyền do quản trị viên tuyển chọn và tải lên, hỗ trợ HTTP 206 Partial Content Range streaming.
     - **Audius**: Phát Full track thông qua mạng lưới Audius Discovery Node.
     - **Jamendo**: Phát Full track theo giấy phép Creative Commons.
     - **Deezer** & **Apple Music / iTunes**: Cung cấp ảnh bìa độ nét cao và bản nghe thử 30 giây.
     - **YouTube**: Phát chuẩn YouTube IFrame API (không tải audio, bảo vệ quota API và tuân thủ bản quyền).
   - Tìm kiếm song song `Promise.allSettled`, tự động loại bỏ trùng lặp (Deduplication) ưu tiên nguồn Full length.
   - Hỗ trợ tìm kiếm tiếng Việt không dấu nhờ PostgreSQL `unaccent`.
   - Cơ chế bộ đệm Redis (với in-memory fallback thông minh khi chạy local).

3. **Lời bài hát đồng bộ (Synchronized Lyrics - LRC)**:
   - Tích hợp API **LRCLIB** lấy lời đồng bộ mili-giây.
   - Highlight dòng đang hát theo thời gian thực và click dòng bất kỳ để tua bài hát tức thì.

4. **Thư viện cá nhân & Quản lý Playlist**:
   - Yêu thích (Like), tạo/sửa/xóa Playlist cá nhân.
   - Tìm và thêm bài hát từ bất kỳ nguồn nào vào playlist của riêng bạn.
   - Lịch sử nghe nhạc 50 bài gần nhất.

5. **Bảng điều khiển Quản trị (Admin Dashboard)**:
   - Thống kê thời gian thực: Người dùng, số bài hát, tổng lượt nghe, biểu đồ cột lượt nghe 7 ngày qua.
   - Quản lý tài khoản: Phân quyền `USER` / `ADMIN`, Khóa / Mở khóa người dùng.
   - CRUD bài hát Local: Tải lên tệp âm thanh MP3/FLAC và ảnh bìa album trực tiếp qua Multer.
   - Giám sát trạng thái hoạt động và quota của từng API bên thứ ba.

6. **Bản quyền & Pháp lý**:
   - Trang "Nguồn nhạc & Bản quyền" ghi nhận attribution cho Audius, Jamendo, Deezer, Apple, YouTube, LRCLIB.

---

## 🛠 Công nghệ

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Query (@tanstack/react-query), React Router v6, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Pino Logger, Zod validation, JWT, bcryptjs, Multer.
- **Database**: PostgreSQL 16 (extension `unaccent`).
- **Cache**: Redis 7 (với In-memory fallback).
- **Đóng gói**: Docker & docker-compose.

---

## 🚀 Hướng dẫn cài đặt & Chạy Local

### Yêu cầu tiên quyết:
- Node.js >= 18.x
- PostgreSQL (hoặc dùng Docker)

### 1. Cài đặt dependencies
Tại thư mục gốc:
```bash
npm install
```

### 2. Cấu hình biến môi trường
Sao chép `.env.example` thành `.env` trong thư mục `server/`:
```bash
cp server/.env.example server/.env
```

### 3. Khởi tạo Database & Seed dữ liệu mẫu
```bash
cd server
npx prisma db push
npx tsx prisma/seed.ts
```

> **Dữ liệu mẫu đã tạo sẵn:**
> - Tài khoản Admin: `admin@mq.vn` / `admin123`
> - Tài khoản User: `user@mq.vn` / `user123`
> - 20 bài hát Local Việt Nam (kèm lời bài hát LRC đồng bộ)
> - 5 nghệ sĩ, 3 album, 5 thể loại, 2 playlist mẫu

### 4. Chạy môi trường phát triển (Dev)
Tại thư mục gốc:
```bash
# Chạy đồng thời cả server và client
npm run dev
```
- Client chạy tại: `http://localhost:3000`
- API Backend chạy tại: `http://localhost:5000`
- Swagger API Docs: `http://localhost:5000/api/docs`

---

## 🐳 Chạy bằng Docker (Khuyến nghị cho Production)

Toàn bộ hệ thống gồm Frontend, Backend, PostgreSQL và Redis có thể khởi động chỉ bằng 1 lệnh:
```bash
docker-compose up --build -d
```
Truy cập `http://localhost:3000` để bắt đầu nghe nhạc.

---

## 🔑 Hướng dẫn lấy API Key của các dịch vụ bên thứ ba

### 1. Jamendo API (Miễn phí)
1. Đăng ký tài khoản tại [Jamendo Developer Portal](https://developer.jamendo.com).
2. Tạo một ứng dụng mới và copy `Client ID`.
3. Điền vào file `.env`: `JAMENDO_CLIENT_ID=your_client_id` (đã có sẵn client ID demo).

### 2. YouTube Data API v3 (Tùy chọn)
1. Truy cập [Google Cloud Console](https://console.cloud.google.com).
2. Tạo project và bật **YouTube Data API v3**.
3. Vào tab **Credentials** và tạo API Key.
4. Điền vào file `.env`: `YOUTUBE_API_KEY=your_google_api_key`.

### 3. Spotify Web API (Tùy chọn)
1. Truy cập [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Tạo App và lấy `Client ID` và `Client Secret`.
3. Điền vào file `.env`:
   ```env
   SPOTIFY_ENABLED=true
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```

---

## 🚢 Hướng dẫn Deploy

### 1. Deploy Frontend (Vercel / Netlify)
- **Vercel**:
  1. Kết nối kho lưu trữ GitHub.
  2. Chọn Root Directory: `client`.
  3. Build Command: `npm run build`.
  4. Output Directory: `dist`.
  5. Thêm biến môi trường: `VITE_API_URL=https://your-backend-domain.com`.

### 2. Deploy Backend (Render / Railway)
- **Railway**:
  1. Chọn "New Project" -> "Deploy from GitHub repo".
  2. Thêm dịch vụ PostgreSQL và Redis từ kho plugin của Railway.
  3. Chọn thư mục `server/`.
  4. Gán các biến môi trường: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`.
