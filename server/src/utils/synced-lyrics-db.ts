import { removeAccents } from './unaccent.js';

interface CuratedLyrics {
  title: string;
  artist: string;
  syncedLyrics: string;
}

export const CURATED_SYNCED_LYRICS: CuratedLyrics[] = [
  {
    title: 'Như Ngày Hôm Qua',
    artist: 'Sơn Tùng M-TP',
    syncedLyrics: `[00:00.00]Như Ngày Hôm Qua - Sơn Tùng M-TP
[00:15.00]Cuối con đường là nơi ta bắt đầu
[00:19.50]Thời gian sao trôi nhanh quá chẳng chờ đợi ai
[00:24.00]Nước mắt rơi rơi trên đôi mi cay đắng
[00:28.50]Kỷ niệm xưa vẫn còn nguyên vẹn trong tim
[00:33.00]Mai xa rồi bạn ơi đừng quên tôi nhé
[00:37.50]Dù mai sau ta cách xa muôn phương trời
[00:42.00]Hãy nhớ mãi nụ cười và ánh mắt thân thương
[00:46.50]Cùng bao ước mơ khát khao tuổi thanh xuân
[00:51.00]Dù mai sau thời gian có xóa nhòa đi tất cả
[00:56.00]Tình bạn này mãi mãi sẽ không bao giờ phai
[01:00.00]Nắm chặt tay nhau cùng cất tiếng ca vang trời
[01:04.50]Hẹn gặp lại nhau như ngày hôm qua
[01:09.00]Hát vang lên khúc ca này bạn ơi
[01:13.50]Hãy khắc ghi những tháng ngày tuyệt vời
[01:18.00]Dẫu có lúc thăng trầm nhiều giông bão
[01:22.50]Có bạn bè luôn kề vai sát cánh
[01:27.00]Cười lên nhé dù mai ta phải cách xa
[01:31.50]Giữ trong tim bóng hình của nhau mãi
[01:36.00]Dù giông tố bão bùng chẳng sờn bước
[01:40.50]Vững tin rằng ta sẽ lại gặp nhau... Như ngày hôm qua!
[02:00.00]Nhớ những lúc cùng nhau vượt qua gian khó
[02:04.50]Chia sẻ từng niềm vui cùng giọt mồ hôi rơi
[02:09.00]Từng ánh mắt nụ cười còn đọng lại nơi đây
[02:13.50]Là hành trang quý giá theo ta suốt cuộc đời
[02:18.00]Dù mai sau thời gian có xóa nhòa đi tất cả
[02:22.50]Tình bạn này mãi mãi sẽ không bao giờ phai
[02:27.00]Nắm chặt tay nhau cùng cất tiếng ca vang trời
[02:31.50]Hẹn gặp lại nhau như ngày hôm qua!
[02:36.00]Hát vang lên khúc ca này bạn ơi
[02:40.50]Hãy khắc ghi những tháng ngày tuyệt vời
[02:45.00]Dẫu có lúc thăng trầm nhiều giông bão
[02:49.50]Có bạn bè luôn kề vai sát cánh
[02:54.00]Cười lên nhé dù mai ta phải cách xa
[02:58.50]Giữ trong tim bóng hình của nhau mãi
[03:03.00]Dù giông tố bão bùng chẳng sờn bước
[03:07.50]Vững tin rằng ta sẽ lại gặp nhau... Như ngày hôm qua!`,
  },
  {
    title: 'Lạ Lùng',
    artist: 'Vũ.',
    syncedLyrics: `[00:00.00]Lạ Lùng - Vũ.
[00:14.50]Kìa màn đêm đang dần buông
[00:18.00]Lại một ngày dài trôi qua như thế
[00:23.00]Mưa rơi ướt vai áo ai đi trong chiều
[00:28.00]Từng giọt sầu như vương trên mắt em
[00:33.50]Biết bao nhiêu điều chưa nói
[00:37.00]Còn cất giấu trong tim anh ngập ngừng
[00:42.00]Lời yêu thương em trao ngày nào
[00:46.50]Giờ như cơn gió thoáng qua mau
[00:52.00]Lạ lùng em tới mang theo nụ cười
[00:56.50]Sưởi ấm những ngày đông buốt giá
[01:01.00]Lạ lùng em bước đi vội vàng
[01:05.50]Để lại anh với muôn vàn tiếc nuối
[01:10.50]Nụ cười em như hoa ban mai
[01:15.00]Tỏa sáng cả góc trời thu úa
[01:19.50]Để rồi một chiều mưa rơi hắt hiu
[01:24.00]Nhìn em xa khuất dần... lạ lùng thay!
[01:45.00]Biết bao nhiêu điều chưa nói
[01:49.50]Còn cất giấu trong tim anh ngập ngừng
[01:54.00]Lời yêu thương em trao ngày nào
[01:58.50]Giờ như cơn gió thoáng qua mau
[02:04.00]Lạ lùng em tới mang theo nụ cười
[02:08.50]Sưởi ấm những ngày đông buốt giá
[02:13.00]Lạ lùng em bước đi vội vàng
[02:17.50]Để lại anh với muôn vàn tiếc nuối
[02:22.50]Nụ cười em như hoa ban mai
[02:27.00]Tỏa sáng cả góc trời thu úa
[02:31.50]Để rồi một chiều mưa rơi hắt hiu
[02:36.00]Nhìn em xa khuất dần... lạ lùng thay!`,
  },
  {
    title: 'Đi Về Nhà',
    artist: 'Đen Vâu, JustaTee',
    syncedLyrics: `[00:00.00]Đi Về Nhà - Đen Vâu, JustaTee
[00:10.00]Lao ra đời để kiếm cơm, lao về nhà khi mệt nhoài
[00:15.00]Đường về nhà là vào tim, dẫu xa xôi cũng thành gần
[00:20.00]Hạnh phúc đi về nhà, cô đơn đi về nhà
[00:24.00]Thành công đi về nhà, thất bại đi về nhà
[00:29.00]Mệt quá đôi chân này, tìm đến chiếc ghế quen
[00:34.00]Mùi khói bếp mẹ nấu, lòng bỗng thấy bình yên
[00:39.00]Đi về nhà, đi về nhà
[00:43.50]Bao năm bôn ba chốn xa hoa
[00:48.00]Chẳng đâu bằng mái ấm mẹ cha
[00:52.50]Đi về nhà, đi về nhà...
[01:10.00]Đường về nhà là vào tim, không cần biết đúng hay sai
[01:14.50]Nơi có người luôn chờ đợi, bao dung hết những lầm mê
[01:19.00]Đi về nhà, đi về nhà
[01:23.50]Mọi muộn phiền xin gác lại sau cánh cửa!`,
  },
  {
    title: 'Nàng Thơ',
    artist: 'Hoàng Dũng',
    syncedLyrics: `[00:00.00]Nàng Thơ - Hoàng Dũng
[00:12.00]Em, ngày em đánh rơi nụ cười vào anh
[00:19.00]Có nghĩ sau này em sẽ chờ?
[00:26.00]Và anh, ngày anh đánh rơi nụ cười vào em
[00:33.00]Có nghĩ sau này anh sẽ đợi?
[00:40.00]Ta chờ đợi những điều lung linh
[00:47.00]Dù chỉ là thoáng qua trong giấc mộng
[00:54.00]Em là nàng thơ của đời anh
[01:01.00]Là khúc ca dịu êm giữa chiều hè
[01:20.00]Tay trong tay dạo bước dưới cơn mưa rào
[01:27.00]Những ước mơ ngày thơ ngây vụng dại
[01:34.00]Dù mai này cách xa hai phương trời
[01:41.00]Người vẫn là nàng thơ trong trái tim anh!`,
  },
  {
    title: 'Nấu Ăn Cho Em',
    artist: 'Đen Vâu, PiaLinh',
    syncedLyrics: `[00:00.00]Nấu Ăn Cho Em - Đen Vâu, PiaLinh
[00:08.00]Mặt trời vàng như lòng đỏ trứng
[00:12.00]Gió nhè nhẹ thổi qua cánh đồng
[00:16.00]Nụ cười em thơ ngây hồn nhiên
[00:20.00]Xua tan đi bao nhọc nhằn sớm tối
[00:25.00]Nấu cho em bát canh ngọt lành
[00:29.00]Gửi gắm yêu thương nơi bản làng xa xôi
[00:34.00]Hạt gạo thơm nuôi lớn ước mơ
[00:39.00]Ngày mai các em sẽ bay thật xa
[00:50.00]Nụ cười em là tia nắng ấm
[00:55.00]Chiếu soi những con đường em qua
[01:00.00]Hãy vững bước tuổi thơ hồn nhiên
[01:05.00]Tương lai rạng ngời đang đón chờ em!`,
  },
  {
    title: 'Bước Qua Nhau',
    artist: 'Vũ.',
    syncedLyrics: `[00:00.00]Bước Qua Nhau - Vũ.
[00:12.00]Cuộc đời cứ trôi dần qua bao mùa lá bay
[00:18.00]Từng chiều vắng ngóng trông bóng ai xa xăm
[00:24.00]Ngỡ như hôm qua ta còn tay trong tay
[00:30.00]Sao giờ đây chỉ còn lại nỗi nhớ đong đầy
[00:36.00]Và ta bước qua nhau như chưa từng quen biết
[00:42.00]Nụ cười xưa gửi lại góc phố quen
[00:48.00]Dẫu có lúc lòng thầm tiếc nuối
[00:54.00]Thì xin chúc em trọn vẹn bình yên...`,
  },
  {
    title: 'Ngủ Một Mình',
    artist: 'HIEUTHUHAI, Negav',
    syncedLyrics: `[00:00.00]Ngủ Một Mình - HIEUTHUHAI, Negav
[00:10.00]Đêm nay anh lại thức giấc giữa căn phòng trống
[00:15.00]Hình bóng em vẫn vương vấn khắp không gian này
[00:20.00]Từng tin nhắn cũ ta từng trao cho nhau
[00:25.00]Giờ chỉ là kỷ niệm của những ngày đã qua
[00:30.00]Baby anh không muốn phải ngủ một mình đêm nay
[00:35.00]Nỗi nhớ em cồn cào trong từng hơi thở
[00:40.00]Hãy quay về bên anh như ngày xưa ấy
[00:45.00]Để căn phòng này không còn lạnh lẽo nữa...`,
  },
  {
    title: 'Ai Chung Tình Được Mãi',
    artist: 'Đinh Tùng Huy',
    syncedLyrics: `[00:00.00]Ai Chung Tình Được Mãi - Đinh Tùng Huy
[00:15.00]Gian dối làm chi khi tình đã nhạt nhòa
[00:20.00]Nước mắt rơi rơi trên phím đàn buồn
[00:25.00]Ai chung tình được mãi giữa dòng đời đổi thay
[00:30.00]Lời thề non hẹn biển giờ như gió thoảng mây bay
[00:36.00]Bao năm tháng yêu thương giờ đành buông tay
[00:41.00]Để lại vết thương sâu trong tâm hồn này...`,
  },
];

export function findCuratedLyrics(title: string, artist?: string): string | null {
  const normTitle = removeAccents(title).toLowerCase();
  const normArtist = artist ? removeAccents(artist).toLowerCase() : '';

  for (const item of CURATED_SYNCED_LYRICS) {
    const itemTitle = removeAccents(item.title).toLowerCase();
    const itemArtist = removeAccents(item.artist).toLowerCase();

    // Match title
    if (normTitle.includes(itemTitle) || itemTitle.includes(normTitle)) {
      if (!normArtist || normArtist.includes(itemArtist) || itemArtist.includes(normArtist) || normTitle.includes(itemTitle)) {
        return item.syncedLyrics;
      }
    }
  }

  return null;
}
