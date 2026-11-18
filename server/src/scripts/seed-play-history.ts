import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Checking existing play history...');
  const users = await prisma.user.findMany({ select: { id: true } });
  const songs = await prisma.song.findMany({ select: { id: true, playCount: true }, orderBy: { playCount: 'desc' }, take: 50 });

  if (users.length === 0 || songs.length === 0) {
    console.log('⚠️ Not enough users or songs to seed play history.');
    return;
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentCount = await prisma.playHistory.count({
    where: { playedAt: { gte: ninetyDaysAgo } },
  });

  console.log(`Current play history in last 90 days: ${recentCount}`);

  // Generate realistic plays for 90 days
  const playsToInsert: Array<{ userId: string; songId: string; playedAt: Date }> = [];

  const now = Date.now();
  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
    const dayOfWeek = dayDate.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Realistic variation: weekends have 45-75 plays, weekdays have 20-45 plays
    // Add small upward trend for recent days
    const trendBonus = Math.floor((90 - dayOffset) / 5); // 0 to 18
    const basePlays = isWeekend ? 40 + Math.floor(Math.random() * 30) : 18 + Math.floor(Math.random() * 25);
    const dailyPlays = basePlays + trendBonus;

    for (let p = 0; p < dailyPlays; p++) {
      const user = users[Math.floor(Math.random() * users.length)];
      // Favor top played songs
      const songIndex = Math.min(
        songs.length - 1,
        Math.floor(Math.pow(Math.random(), 1.8) * songs.length)
      );
      const song = songs[songIndex];

      // Random time during the day (e.g. 7:00 to 23:59)
      const hour = 7 + Math.floor(Math.random() * 16);
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);

      const playedAt = new Date(dayDate);
      playedAt.setHours(hour, minute, second, 0);

      playsToInsert.push({
        userId: user.id,
        songId: song.id,
        playedAt,
      });
    }
  }

  console.log(`Seeding ${playsToInsert.length} historical play records...`);

  // Batch insert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < playsToInsert.length; i += chunkSize) {
    const chunk = playsToInsert.slice(i, i + chunkSize);
    await prisma.playHistory.createMany({
      data: chunk,
    });
  }

  console.log('✅ Successfully seeded play history records!');
}

main()
  .catch((e) => {
    console.error('Error seeding play history:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
