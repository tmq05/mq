# CHANGELOG — mq Music Streaming Platform

Tất cả các thay đổi và tính năng trong quá trình xây dựng hệ thống **mq** được ghi nhận chi tiết dưới đây.

---

## [1.0.0] - 2026-10-31

### ✨ Tính năng đã thêm (Features Added)
- **Thiết kế theo chuẩn DESIGN.md (Ollama Design Tokens)**:
  - Bảng màu đơn sắc đối lập cao: Canvas `#ffffff` / `#0a0a0a`, Surface `#fafafa` / `#171717`.
  - Hình học viên thuốc (`rounded-full`) cho tất cả nút bấm, thanh tìm kiếm, nhãn tag và traffic-light dots.
  - Card bo góc 12px (`rounded-xl`) với viền hairline 1px siêu mỏng.
  - Chuyển đổi Dark Mode / Light Mode mượt mà và lưu trạng thái vào LocalStorage.
- **Trình phát đa nguồn (`PlayerEngine`)**:
  - Hỗ trợ kiến trúc Adapter Pattern: `HtmlAudioAdapter` và `YouTubeAdapter`.
  - Cơ chế cô lập âm thanh: ngắt tiếng adapter cũ trước khi phát adapter mới, triệt tiêu 100% tình trạng chồng tiếng.
  - Trình phát cố định ở đáy trang không ngắt tiếng khi người dùng chuyển trang (Uninterrupted SPA playback).
  - Hàng đợi (Queue) hiển thị bài hát kế tiếp, xóa bài, xóa danh sách.
  - Chế độ lặp lại (Off / All / One) và xáo trộn (Shuffle).
  - Tích hợp **Media Session API** hiển thị ảnh bìa, tên bài hát và điều khiển qua tai nghe/bàn phím.
  - Phím tắt toàn cục: `Space` (Play/Pause), `Mũi tên` (Tua/Âm lượng), `M` (Mute), `L` (Lời bài hát).
  - Cửa sổ xem video mini (`MiniVideo`) với header 3 chấm đỏ/vàng/xanh chuẩn terminal card.
- **Tìm kiếm tổng hợp & Siêu kho nhạc**:
  - Tích hợp 6 Music Providers: Audius, Jamendo, YouTube, Deezer, Apple Music, Local.
  - Thực thi song song bằng `Promise.allSettled` kèm timeout 5 giây cho mỗi provider.
  - Thuật toán Deduplication thông minh dựa trên độ tương đồng chuỗi và thời lượng, ưu tiên bài hát phát Full length.
  - Hỗ trợ tìm kiếm tiếng Việt không dấu nhờ PostgreSQL `unaccent`.
  - Bộ đệm Redis với fallback tự động sang In-memory cache khi Redis ngoại tuyến.
  - Cơ chế bảo vệ Quota YouTube Data API (cache mạnh, chỉ gọi khi yêu cầu hoặc khi nguồn khác thiếu kết quả).
- **Lời bài hát đồng bộ (LRCLIB Integration)**:
  - Tự động lấy lời bài hát LRC từ dịch vụ LRCLIB.
  - Hiển thị dòng đang hát nổi bật theo thời gian thực (Active highlighting).
  - Tự động cuộn theo nhịp hát và cho phép click vào bất kỳ dòng nào để tua đến đoạn đó.
- **Thư viện & Playlist cá nhân**:
  - Yêu thích (Like) và lưu trữ bài hát.
  - Tạo, sửa, xóa playlist cá nhân (chế độ Công khai / Riêng tư).
  - Tìm và thêm bài hát từ bất kỳ nguồn nhạc nào vào playlist.
  - Lưu và xem lịch sử nghe nhạc gần đây.
- **Quản trị hệ thống (Admin Dashboard)**:
  - Biểu đồ lượt nghe 7 ngày qua và các chỉ số tổng quan (Users, Songs, Plays, Playlists).
  - Quản lý người dùng: Khóa/Mở khóa tài khoản, phân quyền `USER` / `ADMIN`.
  - Tải lên tệp âm thanh MP3/FLAC và ảnh bìa album trực tiếp vào máy chủ qua Multer.
  - Giám sát trạng thái hoạt động và quota của các Provider.
- **Bản quyền & Tuân thủ pháp lý**:
  - Trang "Nguồn nhạc & Bản quyền" ghi nhận attribution rõ ràng cho từng API.
  - Cam kết không scrape dữ liệu lậu, không rip audio từ YouTube.
- **Tài liệu & Đóng gói**:
  - Tích hợp tài liệu Swagger / OpenAPI tại `/api/docs`.
  - Bộ file Dockerfile cho Client, Server và `docker-compose.yml` khởi chạy toàn bộ 4 container (Postgres, Redis, Server, Client).

### 🐛 Lỗi và Tình huống biên đã được xử lý (Fixes & Edge Cases Resolved)
1. **Lỗi xác thực cơ sở dữ liệu PostgreSQL cục bộ**:
   - Khởi tạo cluster PostgreSQL chuyên biệt trên port 5433 với mã hóa UTF-8 và kích hoạt extension `unaccent`, đảm bảo kiểm thử và phát triển mượt mà trên môi trường Windows.
2. **Lỗi Range Request khi Stream nhạc cục bộ**:
   - Đã xử lý đầy đủ header `Range: bytes=start-end`, phản hồi mã `206 Partial Content`, `Content-Range`, `Accept-Ranges: bytes` và dọn dẹp file descriptor khi client đóng kết nối.
3. **Lỗi chồng tiếng giữa YouTube và HTML Audio**:
   - Xử lý tại `PlayerEngine`: mỗi khi chuyển đổi bài hát giữa 2 nguồn khác nhau, adapter cũ bị `destroy()` và dừng ngay lập tức trước khi khởi tạo adapter mới.
4. **Lỗi Window is not defined trong môi trường kiểm thử (SSR/Vitest)**:
   - Đã thêm kiểm tra `typeof window !== 'undefined'` cho trình lắng nghe phím tắt và adapter.
5. **Lỗi TypeScript strict `noUnusedLocals`**:
   - Đã tinh chỉnh và dọn dẹp toàn bộ các import và biến không sử dụng trong client.
6. **Lỗi ngắt nhạc khi điều hướng trang**:
   - Di chuyển toàn bộ audio state lên Zustand store và đặt `PlayerBar` ngoài `Routes` của React Router, giúp phát nhạc xuyên suốt khi chuyển route.
