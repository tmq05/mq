import { prisma } from '../config/prisma.js';

const EXACT_YOUTUBE_MAP: Record<string, string> = {
  'local-song-01': 'Z8pMSslQpKM', // Chúng Ta Của Hiện Tại
  'local-song-02': 'Llw9Q6akRo4', // Lạc Trôi
  'local-song-03': '6t-MjBazs3o', // Có Chắc Yêu Là Đây
  'local-song-04': 'ukHK1GVyr0I', // Nấu Ăn Cho Em
  'local-song-05': 'Ws-QlpSltr8', // Trốn Tìm
  'local-song-06': 'vTJdVE_gjI0', // Đi Về Nhà
  'local-song-07': '4Q2LT8X2cM8', // Bảo Tàng Của Nuối Tiếc
  'local-song-08': 'YCYbLEC9jNE', // Bước Qua Mùa Cô Đơn
  'local-song-09': 'F5tS5m86bOI', // Lạ Lùng
  'local-song-10': 'ZF3b1nK-TjM', // Đi Đu Đưa Đi
  'local-song-11': 'FkOt19CUC30', // Bùa Yêu
  'local-song-12': 'sU8G7Q4rUA4', // Nâng Chén Tiêu Sầu
  'local-song-13': 'd6pgocXnK8U', // Không Thể Say
  'local-song-14': '1OJQdxT6WHE', // Ngủ Một Mình
  'local-song-15': 'R6p6c-feIqw', // Giờ Thì Ai Cười
  'local-song-16': '7gKkWpU-v78', // Hương Mùa Hè
  'local-song-17': 'Zzn9-ATB9aU', // Nàng Thơ
  'local-song-18': 'h6RONxjPBf4', // Những Lời Hứa Bỏ Quên
  'local-song-19': 'b_d65e2qXlY', // Bao Tiền Một Mớ Bình Yên
  'local-song-20': '7C2zLQSZ98A', // Đôi Mươi
};

async function main() {
  console.log('Updating 20 local songs with exact full-length YouTube IDs...');
  for (const [sourceId, embedId] of Object.entries(EXACT_YOUTUBE_MAP)) {
    const updated = await prisma.song.updateMany({
      where: { sourceId },
      data: {
        playbackType: 'youtube',
        embedId,
        isFullLength: true,
      },
    });
    console.log(`Updated ${sourceId} => embedId: ${embedId} (count: ${updated.count})`);
  }
  console.log('✅ Done updating local songs in DB.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
