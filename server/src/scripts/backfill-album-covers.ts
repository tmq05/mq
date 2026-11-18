import { PrismaClient } from '@prisma/client';
import { ALBUMS_CATALOG } from '../utils/albums-data.js';

const prisma = new PrismaClient();

async function backfillAlbumCovers() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('====================================================');
  console.log(`🎶 mq Album Cover Backfill Script ${isDryRun ? '[DRY RUN MODE]' : '[LIVE UPDATE MODE]'}`);
  console.log('====================================================\n');

  // Build catalog lookup map by lowercase normalized title
  const catalogMap = new Map<string, string>();
  ALBUMS_CATALOG.forEach((cat) => {
    if (cat.coverUrl) {
      catalogMap.set(cat.title.toLowerCase().trim(), cat.coverUrl);
    }
  });

  const albums = await prisma.album.findMany({
    include: {
      artist: true,
      songs: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          embedId: true,
        },
      },
    },
  });

  console.log(`Found ${albums.length} album(s) in PostgreSQL database.\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const album of albums) {
    const normalizedTitle = album.title.toLowerCase().trim();

    // 1. Check catalog match
    const catalogCover = catalogMap.get(normalizedTitle);

    // 2. Check song covers in album
    const songWithCover = album.songs.find((s) => s.coverUrl && s.coverUrl.trim().length > 0);
    const songCover = songWithCover?.coverUrl;

    // 3. Check YouTube embed thumbnail
    const songWithEmbed = album.songs.find(
      (s) => typeof s.embedId === 'string' && s.embedId.length === 11
    );
    const ytThumb = songWithEmbed?.embedId
      ? `https://i.ytimg.com/vi/${songWithEmbed.embedId}/hqdefault.jpg`
      : undefined;

    // 4. Check artist image
    const artistImg = album.artist?.imageUrl;

    // Determine target cover using priority: Catalog verified > Song cover > YouTube thumb > Artist image
    const targetCover = catalogCover || songCover || ytThumb || artistImg;

    if (!targetCover) {
      console.log(`⚠️  [NO COVER FOUND] Album "${album.title}" (ID: ${album.id}) - No fallback found.`);
      skippedCount++;
      continue;
    }

    // Check if album already has this exact cover
    if (album.coverUrl === targetCover) {
      console.log(`⏭️  [UP TO DATE] Album "${album.title}" already has cover: ${targetCover}`);
      skippedCount++;
      continue;
    }

    if (isDryRun) {
      console.log(`🔍 [DRY RUN] Would update Album "${album.title}":`);
      console.log(`    Current: ${album.coverUrl || '(empty)'}`);
      console.log(`    Target:  ${targetCover}\n`);
    } else {
      await prisma.album.update({
        where: { id: album.id },
        data: { coverUrl: targetCover },
      });
      console.log(`✅ [UPDATED] Album "${album.title}":`);
      console.log(`    From: ${album.coverUrl || '(empty)'}`);
      console.log(`    To:   ${targetCover}\n`);
    }

    updatedCount++;
  }

  // Also backfill any songs in DB that belong to an album but have null/broken coverUrl
  console.log('--- Checking DB songs for missing coverUrl ---');
  const songsWithoutCover = await prisma.song.findMany({
    where: {
      OR: [{ coverUrl: null }, { coverUrl: '' }],
    },
    include: { albumRef: true },
  });

  console.log(`Found ${songsWithoutCover.length} song(s) missing coverUrl.`);
  let updatedSongsCount = 0;

  for (const song of songsWithoutCover) {
    let resolvedCover: string | undefined;

    if (song.albumRef?.coverUrl) {
      resolvedCover = song.albumRef.coverUrl;
    } else if (song.album) {
      resolvedCover = catalogMap.get(song.album.toLowerCase().trim());
    } else if (song.embedId && song.embedId.length === 11) {
      resolvedCover = `https://i.ytimg.com/vi/${song.embedId}/hqdefault.jpg`;
    }

    if (resolvedCover) {
      if (isDryRun) {
        console.log(`🔍 [DRY RUN] Would update Song "${song.title}" coverUrl -> ${resolvedCover}`);
      } else {
        await prisma.song.update({
          where: { id: song.id },
          data: { coverUrl: resolvedCover },
        });
        console.log(`✅ [UPDATED] Song "${song.title}" coverUrl -> ${resolvedCover}`);
      }
      updatedSongsCount++;
    }
  }

  console.log('\n====================================================');
  console.log(`Summary:`);
  console.log(`- Albums updated: ${updatedCount} ${isDryRun ? '(dry-run)' : ''}`);
  console.log(`- Albums skipped: ${skippedCount}`);
  console.log(`- Songs updated:  ${updatedSongsCount} ${isDryRun ? '(dry-run)' : ''}`);
  console.log('====================================================');
}

backfillAlbumCovers()
  .catch((err) => {
    console.error('Fatal error during backfill:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

