export interface ProfileBadgeDefinition {
  id: string;
  title: string;
  desc: string;
  current: number;
  target: number;
  unit: string;
  earned: boolean;
}

export interface ProfileBadgeInput {
  totalPlays: number;
  streakDays: number;
  hoursListened: number;
  playlists: number;
  likes: number;
  following: number;
}

export function computeProfileBadges(input: ProfileBadgeInput): ProfileBadgeDefinition[] {
  const hours = Number((input.hoursListened ?? 0).toFixed(1));

  return [
    {
      id: 'first-listen',
      title: 'Người nghe đầu tiên',
      desc: 'Phát bài hát đầu tiên trên mq',
      current: Math.min(1, input.totalPlays),
      target: 1,
      unit: 'lượt',
      earned: input.totalPlays >= 1,
    },
    {
      id: 'ten-hours',
      title: '10 giờ nghe',
      desc: 'Tích lũy 10 giờ thưởng thức âm nhạc',
      current: Math.min(10, hours),
      target: 10,
      unit: 'giờ',
      earned: hours >= 10,
    },
    {
      id: 'streak-7',
      title: 'Chuỗi 7 ngày',
      desc: 'Nghe nhạc liên tiếp 7 ngày',
      current: Math.min(7, input.streakDays),
      target: 7,
      unit: 'ngày',
      earned: input.streakDays >= 7,
    },
    {
      id: 'first-playlist',
      title: 'Playlist đầu tiên',
      desc: 'Tạo danh sách phát của riêng bạn',
      current: Math.min(1, input.playlists),
      target: 1,
      unit: 'playlist',
      earned: input.playlists >= 1,
    },
    {
      id: 'ten-likes',
      title: 'Người yêu âm nhạc',
      desc: 'Thích 10 bài hát yêu thích',
      current: Math.min(10, input.likes),
      target: 10,
      unit: 'bài',
      earned: input.likes >= 10,
    },
    {
      id: 'five-follows',
      title: 'Fan cứng',
      desc: 'Theo dõi ít nhất 5 nghệ sĩ',
      current: Math.min(5, input.following),
      target: 5,
      unit: 'nghệ sĩ',
      earned: input.following >= 5,
    },
  ];
}
