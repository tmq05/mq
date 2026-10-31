import { prisma } from '../config/prisma.js';

const NEW_ARTISTS = [
  {
    name: 'Hoàng Dũng',
    bio: 'Chàng nhạc sĩ mộng mơ với những bản tình ca lắng đọng, người chắp cánh cho Nàng Thơ, Yếu Đuối.',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    songTitles: ['Nàng Thơ', 'Đôi Mươi'],
  },
  {
    name: 'SOOBIN',
    bio: 'Hoàng tử R&B/Pop Việt Nam với giọng hát điêu luyện, phong cách thời thượng và khả năng sáng tác đỉnh cao.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    songTitles: [],
  },
  {
    name: 'Vũ Cát Tường',
    bio: 'Nghệ sĩ, nhạc sĩ tiên phong với tư duy âm nhạc tự do, giàu xúc cảm và đầy tính sáng tạo.',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    songTitles: [],
  },
  {
    name: 'JayKii',
    bio: 'Ca sĩ tài năng sở hữu chất giọng trầm ấm, tác giả của các bản hit Ballad cảm xúc.',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    songTitles: [],
  },
  {
    name: 'Hòa Minzy',
    bio: 'Nữ ca sĩ sở hữu giọng hát nội lực, truyền cảm hứng văn hóa dân gian Việt Nam qua từng tác phẩm.',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
    songTitles: [],
  },
  {
    name: 'Phan Mạnh Quỳnh',
    bio: 'Nhạc sĩ tài hoa của những giai điệu mộc mạc, lời ca triết lý và sâu thẳm trong lòng khán giả.',
    imageUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80',
    songTitles: [],
  },
  {
    name: 'Tăng Duy Tân',
    bio: 'Nhà sản xuất, ca sĩ với những ca khúc bắt tai, viral hàng trăm triệu lượt nghe tại Việt Nam và quốc tế.',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80',
    songTitles: [],
  },
];

async function main() {
  console.log('Seeding extra Vietnamese artists...');

  for (const item of NEW_ARTISTS) {
    const existing = await prisma.artist.findFirst({
      where: { name: item.name },
    });

    let artistId = existing?.id;
    if (!existing) {
      const created = await prisma.artist.create({
        data: {
          name: item.name,
          bio: item.bio,
          imageUrl: item.imageUrl,
          source: 'local',
        },
      });
      artistId = created.id;
      console.log(`Created artist: ${item.name} (${artistId})`);
    } else {
      await prisma.artist.update({
        where: { id: existing.id },
        data: { bio: item.bio, imageUrl: item.imageUrl },
      });
      console.log(`Updated artist: ${item.name}`);
    }

    // Link songs if any
    for (const title of item.songTitles) {
      await prisma.song.updateMany({
        where: { title },
        data: { artistId },
      });
    }
  }

  console.log('✅ Done seeding artists.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
