import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up existing data
  await prisma.playHistory.deleteMany();
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.playlistSong.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.song.deleteMany();
  await prisma.album.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // 1. Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@mq.vn',
      passwordHash: adminPasswordHash,
      name: 'Admin MQ',
      role: Role.ADMIN,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: 'user@mq.vn',
      passwordHash: userPasswordHash,
      name: 'Trần Mạnh Quân',
      role: Role.USER,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    },
  });

  console.log('✅ Users created:', { admin: admin.email, demoUser: demoUser.email });

  // 2. Genres
  const genresData = [
    { name: 'V-Pop', slug: 'v-pop', imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80' },
    { name: 'Indie Việt', slug: 'indie-viet', imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80' },
    { name: 'Rap / Hip-Hop', slug: 'rap-hiphop', imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80' },
    { name: 'R&B / Soul', slug: 'r-and-b', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80' },
    { name: 'Lo-Fi Chill', slug: 'lo-fi-chill', imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80' },
  ];

  const genres = await Promise.all(
    genresData.map((g) => prisma.genre.create({ data: g }))
  );
  console.log(`✅ ${genres.length} Genres created`);

  // 3. Artists
  const artistsData = [
    {
      name: 'Sơn Tùng M-TP',
      bio: 'Ca sĩ, nhạc sĩ, nhà sản xuất âm nhạc hàng đầu Việt Nam.',
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Đen Vâu',
      bio: 'Rapper mộc mạc với những lời thơ sâu lắng chạm vào tâm hồn người nghe.',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Vũ.',
      bio: 'Hoàng tử Indie Việt Nam với chất giọng trầm ấm và những bản tình ca da diết.',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Bích Phương',
      bio: 'Nữ ca sĩ với phong cách biến hóa đa dạng từ Ballad đến Pop hiện đại.',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'HIEUTHUHAI',
      bio: 'Rapper trẻ triển vọng với phong cách bảnh bao, âm nhạc lôi cuốn.',
      imageUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80',
    },
  ];

  const artists = await Promise.all(
    artistsData.map((a) => prisma.artist.create({ data: a }))
  );
  console.log(`✅ ${artists.length} Artists created`);

  // 4. Albums
  const albumsData = [
    {
      title: 'Chúng Ta Của Hiện Tại',
      artistId: artists[0].id,
      releaseDate: new Date('2020-12-20'),
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    },
    {
      title: 'Bảo Tàng Của Nuối Tiếc',
      artistId: artists[2].id,
      releaseDate: new Date('2024-09-27'),
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    },
    {
      title: 'Ai Cũng Phải Bắt Đầu Từ Đâu Đó',
      artistId: artists[4].id,
      releaseDate: new Date('2023-10-15'),
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    },
  ];

  const albums = await Promise.all(
    albumsData.map((al) => prisma.album.create({ data: al }))
  );
  console.log(`✅ ${albums.length} Albums created`);

  // Sample synced LRC Lyrics for testing
  const sampleSyncedLyrics = `[00:00.00]Giai điệu bắt đầu ngân vang trên mq
[00:05.00]Từng giọt thanh âm rơi êm ái giữa đêm muộn
[00:12.00]Những suy tư gửi vào không gian lắng đọng
[00:18.00]Lời ca dịu dàng xua tan bao âu lo ngày qua
[00:25.00]Hãy để trái tim được hòa nhịp cùng giai điệu
[00:32.00]Bình yên sẽ trở về bên khung cửa sổ
[00:40.00]mq - Âm nhạc không ngắt quãng`;

  // 5. 20 Local Songs
  const songsData = [
    {
      source: 'local',
      sourceId: 'local-song-01',
      title: 'Chúng Ta Của Hiện Tại',
      artists: ['Sơn Tùng M-TP'],
      artistId: artists[0].id,
      album: 'Chúng Ta Của Hiện Tại',
      albumId: albums[0].id,
      genreId: genres[0].id,
      durationMs: 301000,
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'Z8pMSslQpKM',
      streamUrl: '/api/songs/local-song-01/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1542,
    },
    {
      source: 'local',
      sourceId: 'local-song-02',
      title: 'Lạc Trôi',
      artists: ['Sơn Tùng M-TP'],
      artistId: artists[0].id,
      album: 'Sơn Tùng M-TP Collection',
      genreId: genres[0].id,
      durationMs: 232000,
      coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'Llw9Q6akRo4',
      streamUrl: '/api/songs/local-song-02/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 2890,
    },
    {
      source: 'local',
      sourceId: 'local-song-03',
      title: 'Có Chắc Yêu Là Đây',
      artists: ['Sơn Tùng M-TP'],
      artistId: artists[0].id,
      genreId: genres[0].id,
      durationMs: 202000,
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: '6t-MjBazs3o',
      streamUrl: '/api/songs/local-song-03/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1980,
    },
    {
      source: 'local',
      sourceId: 'local-song-04',
      title: 'Nấu Ăn Cho Em',
      artists: ['Đen Vâu', 'PiaLinh'],
      artistId: artists[1].id,
      genreId: genres[2].id,
      durationMs: 254000,
      coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'ukHK1GVyr0I',
      streamUrl: '/api/songs/local-song-04/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 3410,
    },
    {
      source: 'local',
      sourceId: 'local-song-05',
      title: 'Trốn Tìm',
      artists: ['Đen Vâu', 'MTV Band'],
      artistId: artists[1].id,
      genreId: genres[2].id,
      durationMs: 247000,
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'Ws-QlpSltr8',
      streamUrl: '/api/songs/local-song-05/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 2750,
    },
    {
      source: 'local',
      sourceId: 'local-song-06',
      title: 'Đi Về Nhà',
      artists: ['Đen Vâu', 'JustaTee'],
      artistId: artists[1].id,
      genreId: genres[2].id,
      durationMs: 200000,
      coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'vTJdVE_gjI0',
      streamUrl: '/api/songs/local-song-06/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 4200,
    },
    {
      source: 'local',
      sourceId: 'local-song-07',
      title: 'Bảo Tàng Của Nuối Tiếc',
      artists: ['Vũ.'],
      artistId: artists[2].id,
      album: 'Bảo Tàng Của Nuối Tiếc',
      albumId: albums[1].id,
      genreId: genres[1].id,
      durationMs: 228000,
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: '4Q2LT8X2cM8',
      streamUrl: '/api/songs/local-song-07/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1890,
    },
    {
      source: 'local',
      sourceId: 'local-song-08',
      title: 'Bước Qua Mùa Cô Đơn',
      artists: ['Vũ.'],
      artistId: artists[2].id,
      genreId: genres[1].id,
      durationMs: 280000,
      coverUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'YCYbLEC9jNE',
      streamUrl: '/api/songs/local-song-08/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 3120,
    },
    {
      source: 'local',
      sourceId: 'local-song-09',
      title: 'Lạ Lùng',
      artists: ['Vũ.'],
      artistId: artists[2].id,
      genreId: genres[1].id,
      durationMs: 261000,
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'F5tS5m86bOI',
      streamUrl: '/api/songs/local-song-09/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 4890,
    },
    {
      source: 'local',
      sourceId: 'local-song-10',
      title: 'Đi Đu Đưa Đi',
      artists: ['Bích Phương'],
      artistId: artists[3].id,
      genreId: genres[0].id,
      durationMs: 219000,
      coverUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'ZF3b1nK-TjM',
      streamUrl: '/api/songs/local-song-10/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 2670,
    },
    {
      source: 'local',
      sourceId: 'local-song-11',
      title: 'Bùa Yêu',
      artists: ['Bích Phương'],
      artistId: artists[3].id,
      genreId: genres[0].id,
      durationMs: 243000,
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'FkOt19CUC30',
      streamUrl: '/api/songs/local-song-11/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 3780,
    },
    {
      source: 'local',
      sourceId: 'local-song-12',
      title: 'Nâng Chén Tiêu Sầu',
      artists: ['Bích Phương'],
      artistId: artists[3].id,
      genreId: genres[0].id,
      durationMs: 205000,
      coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'sU8G7Q4rUA4',
      streamUrl: '/api/songs/local-song-12/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1950,
    },
    {
      source: 'local',
      sourceId: 'local-song-13',
      title: 'Không Thể Say',
      artists: ['HIEUTHUHAI'],
      artistId: artists[4].id,
      album: 'Ai Cũng Phải Bắt Đầu Từ Đâu Đó',
      albumId: albums[2].id,
      genreId: genres[2].id,
      durationMs: 215000,
      coverUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'd6pgocXnK8U',
      streamUrl: '/api/songs/local-song-13/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 2900,
    },
    {
      source: 'local',
      sourceId: 'local-song-14',
      title: 'Ngủ Một Mình',
      artists: ['HIEUTHUHAI', 'Negav'],
      artistId: artists[4].id,
      genreId: genres[2].id,
      durationMs: 198000,
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: '1OJQdxT6WHE',
      streamUrl: '/api/songs/local-song-14/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 4120,
    },
    {
      source: 'local',
      sourceId: 'local-song-15',
      title: 'Giờ Thì Ai Cười',
      artists: ['HIEUTHUHAI'],
      artistId: artists[4].id,
      album: 'Ai Cũng Phải Bắt Đầu Từ Đâu Đó',
      albumId: albums[2].id,
      genreId: genres[2].id,
      durationMs: 188000,
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'R6p6c-feIqw',
      streamUrl: '/api/songs/local-song-15/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1670,
    },
    {
      source: 'local',
      sourceId: 'local-song-16',
      title: 'Hương Mùa Hè',
      artists: ['Vũ.', 'Hoàng Dũng', 'Orange'],
      genreId: genres[1].id,
      durationMs: 240000,
      coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: '7gKkWpU-v78',
      streamUrl: '/api/songs/local-song-16/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1420,
    },
    {
      source: 'local',
      sourceId: 'local-song-17',
      title: 'Nàng Thơ',
      artists: ['Hoàng Dũng'],
      genreId: genres[1].id,
      durationMs: 252000,
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'Zzn9-ATB9aU',
      streamUrl: '/api/songs/local-song-17/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 3880,
    },
    {
      source: 'local',
      sourceId: 'local-song-18',
      title: 'Những Lời Hứa Bỏ Quên',
      artists: ['Vũ.'],
      artistId: artists[2].id,
      album: 'Bảo Tàng Của Nuối Tiếc',
      albumId: albums[1].id,
      genreId: genres[1].id,
      durationMs: 215000,
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'h6RONxjPBf4',
      streamUrl: '/api/songs/local-song-18/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1250,
    },
    {
      source: 'local',
      sourceId: 'local-song-19',
      title: 'Bao Tiền Một Mớ Bình Yên',
      artists: ['14 Casper', 'Bon Nghiêm'],
      genreId: genres[4].id,
      durationMs: 224000,
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: 'b_d65e2qXlY',
      streamUrl: '/api/songs/local-song-19/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 2310,
    },
    {
      source: 'local',
      sourceId: 'local-song-20',
      title: 'Đôi Mươi',
      artists: ['Hoàng Dũng'],
      genreId: genres[1].id,
      durationMs: 210000,
      coverUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
      playbackType: 'youtube',
      embedId: '7C2zLQSZ98A',
      streamUrl: '/api/songs/local-song-20/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1780,
    },
      playbackType: 'audio',
      streamUrl: '/api/songs/local-song-20/stream',
      lyrics: sampleSyncedLyrics,
      isFullLength: true,
      playCount: 1780,
    },
  ];

  const songs = await Promise.all(
    songsData.map((s) => prisma.song.create({ data: s }))
  );
  console.log(`✅ ${songs.length} Songs created`);

  // 6. Sample Playlists
  const playlist1 = await prisma.playlist.create({
    data: {
      title: 'Top Hits Việt Nam',
      description: 'Tuyển tập những ca khúc nổi bật nhất trên mq',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      userId: demoUser.id,
      isPublic: true,
      songs: {
        create: [
          { songId: songs[0].id, order: 0 },
          { songId: songs[3].id, order: 1 },
          { songId: songs[6].id, order: 2 },
          { songId: songs[12].id, order: 3 },
        ],
      },
    },
  });

  const playlist2 = await prisma.playlist.create({
    data: {
      title: 'Giai Điệu Thư Giãn',
      description: 'Âm hưởng êm đềm cho những buổi tối tĩnh lặng',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
      userId: demoUser.id,
      isPublic: true,
      songs: {
        create: [
          { songId: songs[7].id, order: 0 },
          { songId: songs[8].id, order: 1 },
          { songId: songs[17].id, order: 2 },
          { songId: songs[18].id, order: 3 },
        ],
      },
    },
  });

  console.log('✅ Sample Playlists created:', [playlist1.title, playlist2.title]);

  // 7. Likes & History
  await prisma.like.create({
    data: {
      userId: demoUser.id,
      songId: songs[0].id,
    },
  });
  await prisma.like.create({
    data: {
      userId: demoUser.id,
      songId: songs[6].id,
    },
  });
  await prisma.follow.create({
    data: {
      userId: demoUser.id,
      artistId: artists[0].id,
    },
  });
  await prisma.playHistory.create({
    data: {
      userId: demoUser.id,
      songId: songs[0].id,
    },
  });

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

