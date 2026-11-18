import 'dotenv/config';
import { prisma } from '../config/prisma.js';
import { ARTISTS_CATALOG } from '../utils/artists-data.js';

async function main() {
  // 1. Clean up leftover test artists
  const deleted = await prisma.artist.deleteMany({
    where: { name: 'Test Artist Vitest' },
  });
  console.log('Deleted leftover test artists:', deleted.count);

  // 2. Sync ARTISTS_CATALOG to DB
  let created = 0;
  let updated = 0;
  for (const a of ARTISTS_CATALOG) {
    const existing = await prisma.artist.findFirst({
      where: {
        OR: [
          { id: a.id },
          { name: { equals: a.name, mode: 'insensitive' } },
        ],
      },
    });
    if (!existing) {
      await prisma.artist.create({
        data: {
          id: a.id,
          name: a.name,
          bio: a.bio,
          imageUrl: a.imageUrl,
          isVerified: true,
          source: 'catalog',
          sourceId: a.spotifyId || null,
        },
      });
      created++;
    } else {
      await prisma.artist.update({
        where: { id: existing.id },
        data: {
          bio: existing.bio || a.bio,
          imageUrl: existing.imageUrl || a.imageUrl,
          isVerified: true,
          sourceId: existing.sourceId || a.spotifyId || null,
        },
      });
      updated++;
    }
  }
  const total = await prisma.artist.count();
  console.log('Sync complete:', { created, updated, total });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
