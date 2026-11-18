import 'dotenv/config';
import { prisma } from '../config/prisma.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { itunesProvider } from '../providers/itunes.provider.js';

async function main() {
  const songs = await prisma.song.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const targets = songs.filter(
    (s) => !s.coverUrl || s.coverUrl.includes('images.unsplash.com')
  );

  console.log(`Found ${targets.length} song(s) needing real cover art (out of ${songs.length}).`);

  let updated = 0;
  for (const song of targets) {
    const artist = song.artists?.[0] || '';
    const query = `${song.title} ${artist}`.trim();
    let newCover: string | null = null;

    try {
      const spRes = await spotifyProvider.search(query, 'track');
      const spTrack = spRes.tracks?.[0];
      if (spTrack?.coverUrl && !spTrack.coverUrl.includes('images.unsplash.com')) {
        newCover = spTrack.coverUrl;
      }
    } catch {
      // ignore
    }

    if (!newCover) {
      try {
        const itRes = await itunesProvider.search(query, 'track');
        const itTrack = itRes.tracks?.[0];
        if (itTrack?.coverUrl && !itTrack.coverUrl.includes('images.unsplash.com')) {
          newCover = itTrack.coverUrl;
        }
      } catch {
        // ignore
      }
    }

    if (!newCover && song.embedId && song.embedId.length === 11) {
      newCover = `https://i.ytimg.com/vi/${song.embedId}/hqdefault.jpg`;
    }

    if (newCover) {
      await prisma.song.update({
        where: { id: song.id },
        data: { coverUrl: newCover },
      });
      updated++;
      console.log(`✅ Updated cover: "${song.title}" -> ${newCover}`);
    } else {
      console.log(`⚠️ No cover found for: "${song.title}"`);
    }
  }

  console.log(`\nDone. Updated ${updated}/${targets.length} song cover(s).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
