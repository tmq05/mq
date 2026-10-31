# Kế hoạch Kiến trúc & Phát triển Dự án Website Nghe Nhạc "mq"

Dự án website nghe nhạc trực tuyến **mq** được thiết kế theo phong cách tối giản, hiện đại và chuẩn mực công nghệ theo hướng dẫn của `DESIGN.md` (Ollama Design System): hình học viên thuốc (`rounded-full`), hairline border (1px), bảng màu tương phản đơn sắc đen/trắng, tối ưu trải nghiệm âm nhạc không ngắt quãng (uninterrupted playback) và tích hợp các nguồn phát nhạc chính thức (Audius, Jamendo, YouTube IFrame, Deezer, iTunes, Spotify, Local Upload).

---

## 1. Cấu trúc thư mục Monorepo

```
c:\ManhQuan\mq/
├── DESIGN.md                     # Tài liệu Design Tokens & Specs Ollama
├── PLAN.md                       # Kế hoạch chi tiết kiến trúc
├── docker-compose.yml            # Docker Orchestration (client, server, postgres, redis)
├── package.json                  # Root npm workspace
├── README.md                     # Hướng dẫn cài đặt, cấu hình API key, deploy
├── CHANGELOG.md                  # Nhật ký tính năng & cập nhật
│
├── server/                       # Backend (Node.js, Express, TypeScript, Prisma)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma         # PostgreSQL Schema (với unaccent, full index)
│   │   ├── migrations/
│   │   └── seed.ts               # Seed data: 20 bài, 5 nghệ sĩ, 3 album, 5 thể loại, admin
│   ├── src/
│   │   ├── app.ts                # Khởi tạo Express, middlewares, routes, error handler
│   │   ├── server.ts             # Server entrypoint (HTTP + Graceful shutdown)
│   │   ├── config/               # Env parsing, validation (Zod), logger (Pino)
│   │   ├── middlewares/          # Auth JWT, Role guard, RateLimit, Error, Logging
│   │   ├── models/               # Domain interfaces & Types
│   │   ├── repositories/         # Prisma Database Repositories
│   │   ├── providers/            # Music Provider Layer
│   │   │   ├── music-provider.interface.ts
│   │   │   ├── provider-registry.ts
│   │   │   ├── audius.provider.ts
│   │   │   ├── jamendo.provider.ts
│   │   │   ├── youtube.provider.ts
│   │   │   ├── deezer.provider.ts
│   │   │   ├── itunes.provider.ts
│   │   │   ├── spotify.provider.ts
│   │   │   └── local.provider.ts
│   │   ├── services/             # Business Logic Layer
│   │   │   ├── auth.service.ts
│   │   │   ├── search.service.ts # Song song Promise.allSettled + deduplication + cache
│   │   │   ├── song.service.ts
│   │   │   ├── playlist.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── lyrics.service.ts # LRCLIB integration
│   │   │   └── admin.service.ts
│   │   ├── controllers/          # Request handlers
│   │   ├── routes/               # API Router endpoints
│   │   ├── storage/              # Storage abstraction (Local file / Cloudinary / S3)
│   │   ├── utils/                # Cache helper, unaccent search utils
│   │   └── swagger/              # OpenAPI specs
│   └── tests/                    # Unit tests, integration tests (Vitest / Supertest)
│
└── client/                       # Frontend (React 18, Vite, TypeScript, Tailwind)
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts        # Áp dụng tokens từ DESIGN.md
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api/                  # Axios/Fetch client + React Query hooks
    │   ├── types/                # Unified Track, User, Playlist, Lyrics types
    │   ├── stores/               # Zustand store (player, queue, auth, theme)
    │   ├── player-engine/        # Multi-source Player Engine Architecture
    │   │   ├── player-engine.ts
    │   │   ├── adapters/
    │   │   │   ├── audio-adapter.ts     # HTML5 Audio (Audius, Jamendo, Local, Preview)
    │   │   │   ├── youtube-adapter.ts   # YouTube IFrame API
    │   │   │   └── spotify-adapter.ts   # Spotify Web Playback SDK
    │   │   └── media-session.ts         # Media Session API & Shortcut Manager
    │   ├── components/           # UI Components (Ollama Minimalist Pills & Cards)
    │   │   ├── common/           # Button (pill), Input, Modal, Toast, Skeleton, Badge
    │   │   ├── layout/           # Navbar, Sidebar, BottomNav, Footer
    │   │   ├── player/           # Fixed Player Bar, FullScreen Player, Queue, MiniVideo
    │   │   ├── song/             # SongCard, SongRow, SourceBadge ("Full" / "Preview")
    │   │   ├── lyrics/           # Synchronized Lyrics Viewer
    │   │   └── admin/            # Admin widgets, Metrics, CRUD tables
    │   ├── pages/                # Route pages
    │   │   ├── Home.tsx          # Khám phá, Trending, Mới phát hành, Nhạc Việt
    │   │   ├── Search.tsx        # Tìm kiếm đa nguồn, debounce, filter nguồn & thể loại
    │   │   ├── Library.tsx       # Thư viện cá nhân, Yêu thích, Playlist, Nghệ sĩ
    │   │   ├── PlaylistDetail.tsx
    │   │   ├── ArtistDetail.tsx
    │   │   ├── AlbumDetail.tsx
    │   │   ├── Credits.tsx       # Nguồn nhạc & Bản quyền (Attribution)
    │   │   ├── Auth.tsx          # Đăng ký, Đăng nhập, Quên mật khẩu
    │   │   ├── Profile.tsx
    │   │   └── AdminDashboard.tsx
    │   ├── hooks/
    │   └── utils/
    └── tests/                    # Vitest UI & Playwright E2E tests
```

---

## 2. Sơ đồ Database (PostgreSQL + Prisma)

Bật extension `unaccent` để tìm kiếm tiếng Việt không dấu:
```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### Các Entity Chính:
1. **User**: `id`, `email` (unique), `passwordHash`, `name`, `avatarUrl`, `role` (USER | ADMIN), `isLocked`, `createdAt`, `updatedAt`.
2. **RefreshToken**: `id`, `token` (hash/uuid), `userId`, `expiresAt`, `revokedAt`.
3. **Song/Track**:
   - `id`: UUID (Primary Key).
   - `source`: Enum (`local`, `audius`, `jamendo`, `youtube`, `deezer`, `itunes`, `spotify`).
   - `sourceId`: String (ID gốc từ bên thứ 3 hoặc local).
   - `title`: String.
   - `artists`: String[] hoặc quan hệ Artist.
   - `album`: String (tên album).
   - `coverUrl`: String.
   - `durationMs`: Integer.
   - `playbackType`: Enum (`audio`, `youtube`, `spotify`, `preview`).
   - `streamUrl`: String (chỉ lưu cho bài local, nguồn ngoài lấy fresh qua `getStreamInfo`).
   - `embedId`: String (chẳng hạn videoId YouTube).
   - `previewUrl`: String (URL mp3 demo 30s).
   - `isFullLength`: Boolean.
   - `lyrics`: Text (LRC hoặc plaintext nếu có).
   - `playCount`: Integer (mặc định 0).
   - `genreId`: UUID (foreign key tới Genre).
   - Unique index: `@@unique([source, sourceId])`.
   - Index: `title`, `artists`, `source`, `createdAt`.
4. **Artist**: `id`, `name`, `bio`, `imageUrl`, `source`, `sourceId`, `createdAt`.
5. **Album**: `id`, `title`, `coverUrl`, `releaseDate`, `artistId`, `createdAt`.
6. **Genre**: `id`, `name` (unique), `slug`, `imageUrl`.
7. **Playlist**: `id`, `title`, `description`, `coverUrl`, `isPublic`, `userId`, `createdAt`, `updatedAt`.
8. **PlaylistSong**: `id`, `playlistId`, `songId`, `order`, `addedAt`, `@@unique([playlistId, songId])`.
9. **Like**: `id`, `userId`, `songId`, `createdAt`, `@@unique([userId, songId])`.
10. **Follow**: `id`, `userId`, `artistId`, `createdAt`, `@@unique([userId, artistId])`.
11. **PlayHistory**: `id`, `userId`, `songId`, `playedAt`.

---

## 3. Kiến trúc Provider & Đa nguồn

| Provider | Khả năng phát | Nguồn stream | Quota / API Key | Ghi chú pháp lý & Attribution |
|---|---|---|---|---|
| **Audius** | Full Track | Audius Discovery Host stream URL | Miễn phí, không giới hạn | Attribution: Audius decentralized network |
| **Jamendo** | Full Track | Official Jamendo CDN MP3 | Client ID miễn phí | Attribution: Jamendo / Creative Commons |
| **YouTube** | Full Video/Audio qua IFrame | YouTube IFrame Player API | Data API v3 (10k units/ngày) | Nhúng player chuẩn, không rip audio, cache mạnh |
| **Deezer** | Metadata & 30s Preview | Deezer public API CDN | Không cần key | Làm giàu thông tin & preview dự phòng |
| **iTunes** | Metadata & 30s Preview | Apple iTunes Search API | Không cần key | High-res cover art, preview 30s |
| **Spotify** | Metadata / Preview / SDK | Web Playback SDK (Premium) / Preview | Client ID / Secret | Chuẩn OAuth PKCE & Web API |
| **Local** | Full Track | HTTP Range Streaming (`/api/songs/:id/stream`) | Server storage | Nhạc bản quyền do Admin tự quản trị |

---

## 4. Trình phát `PlayerEngine` Đa nguồn

- **Pattern**: Adapter Pattern + Strategy Pattern.
- `PlayerEngine` quản lý state tập trung: `currentTrack`, `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `repeatMode` (`off` | `all` | `one`), `isShuffle`, `queue`, `history`.
- Khi chuyển đổi giữa các bài có `playbackType` khác nhau (ví dụ từ HTML5 Audio sang YouTube IFrame hoặc ngược lại):
  1. Hủy / ngắt tiếng adapter hiện tại ngay lập tức.
  2. Khởi tạo adapter tương ứng cho bài mới.
  3. Duy trì mức volume và trạng thái play tự nhiên, không bao giờ xảy ra tình trạng "2 bài phát đè lên nhau".
  4. Quản lý dọn dẹp bộ nhớ (cleanup event listeners, unbind iframe) tránh memory leak.
  5. Fallback tự động: Nếu bài YouTube bị chặn nhúng hoặc stream URL lỗi, tìm kiếm bài hát tương đương trên Deezer/Audius/Jamendo hoặc hạ cấp sang preview và gửi thông báo Toast.

---

## 5. UI/UX theo `DESIGN.md` (Ollama Design Tokens)

- Nền trang: `#ffffff` (Canvas), `#fafafa` (Surface Soft), `#171717` (Surface Dark).
- Chế độ Dark: Canvas `#0a0a0a`, Surface `#171717`, Card `#121212`, Hairline `#262626`.
- Button & Pill: `rounded-full` (`9999px`), padding `8px 20px`, height `36px` (`button-primary`: đen trên nền trắng, trắng trên nền đen).
- Card: `rounded-xl` (`12px`), border hairline `1px solid #e5e5e5` (`dark:border-neutral-800`).
- Typography: SF Pro Rounded / Nunito cho display headings (trọng lượng 500-600), Inter cho body, Monospace cho tags & shortcuts.
- Không dùng bóng đổ lòe loẹt hay gradient màu mè; chú trọng typography, khoảng cách thoáng đãng (`spacing.section = 88px` / `64px`), đường nét tối giản và thanh lịch.
