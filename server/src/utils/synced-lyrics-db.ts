import { removeAccents } from './unaccent.js';

interface CuratedLyrics {
  title: string;
  artist: string;
  syncedLyrics: string;
}

export const CURATED_SYNCED_LYRICS: CuratedLyrics[] = [
  {
    title: '2 4',
    artist: 'W/N',
    syncedLyrics: `[00:10.00]Chỉ là vì nơi này
[00:14.50]Chỉ còn bóng tối, cô đơn mình anh
[00:19.00]Muốn rời đi khỏi đây
[00:23.50]Chỉ vì anh quá yếu đuối
[00:28.00]Khóc nữa đi em ơi
[00:32.50]Hãy để nước mắt rơi trên làn mi
[00:37.00]Chỉ vì mọi thứ nơi đây mà
[00:41.50]Thứ nơi đây, uhh-huh
[00:46.00]Là vì anh quá yếu đuối
[00:50.00]Chỉ tìm trong giấc mơ
[00:54.00]Một mình anh ngây thơ
[00:58.00]Chỉ là người đứng chờ
[01:02.00]Chạy đi đâu em hỡi
[01:06.00]Chạy về trong giấc mơ
[01:10.00]Một mình anh tìm lối
[01:14.00]Chẳng thể nào thoát ra
[01:18.00]Đêm, anh lại nhớ đến em
[01:21.00]Nhớ lại vài chuyện cũ
[01:23.50]Nhớ lại hình bóng quá nỗi thân quen bên trong tâm hồn vẫn hiện hữu
[01:28.00]Anh nhớ lời nói của cô gái đó, không phải qua chiếc điện thoại
[01:32.50]Anh nhớ Quảng Nam vào ngày trái gió, ta không yêu theo kiểu hiện đại
[01:37.00]Em có còn nhớ? Ngày ta xa chính xác đúng vào ngày đông chí
[01:41.50]Anh đã lặng lẽ mua 5 đoá hồng dù không có tiền ở trong ví
[01:46.00]Anh nghĩ đó là món quà kỉ niệm tặng em trước lúc em bước đi
[01:50.50]Rồi giam mình vào trong căn phòng nhỏ nhìn bức ảnh đó đến ướt mi
[01:55.00]Anh biết tình đắng như ly cà phê, thấm dần vào dòng suy nghĩ
[01:59.50]Thiết tha không phải là cặp tình nhân nhưng có thể trở thành tri kỷ
[02:04.00]Anh không như họ, anh vẫn muốn đi tìm lại anh của ngày đó
[02:08.50]Một ngày bình thường nhìn nỗi nhớ chạy dọc trên ban công đầy gió
[02:13.00]Tách cà phê sữa hoà quyện lại với vị khói thuốc Sài Gòn Bạc
[02:17.50]Là cách anh rap, cách thả hồn vào những ngày dài còn nhạt
[02:22.00]Là cứ như thế những giai điệu xuất hiện vào 2h đêm
[02:26.50]Nói cho em biết trước hiên nhà vẫn có một ai chờ em
[02:31.00]Là vì anh quá yếu đuối
[02:35.00]Chỉ tìm trong giấc mơ
[02:39.00]Một mình anh ngây thơ
[02:43.00]Chỉ là người đứng chờ
[02:47.00]Chạy đi đâu em hỡi
[02:51.00]Chạy về trong giấc mơ
[02:55.00]Một mình anh tìm lối
[02:59.00]Chẳng thể nào thoát ra...`,
  },
  {
    title: 'Nơi Này Có Anh',
    artist: 'Sơn Tùng M-TP',
    syncedLyrics: `[00:15.50]Em là ai từ đâu bước đến nơi đây dịu dàng chân phương
[00:20.00]Em là ai tựa như ánh nắng ban mai ngọt ngào trong sương
[00:24.50]Ngắm em thật lâu, con tim anh yếu mềm
[00:29.00]Đắm say từ phút đó từng giây trôi yêu thêm
[00:33.50]Bao ngày qua bình minh đánh thức xua tan bộn bề nơi anh
[00:38.00]Bao ngày qua niềm thương nỗi nhớ bay theo bầu trời trong xanh
[00:42.50]Liếc đôi hàng mi mong manh anh thẫn thờ
[00:47.00]Muốn hôn nhẹ mái tóc bờ môi em anh mơ
[00:51.50]Cầm tay anh, dựa vai anh
[00:54.00]Kề bên anh nơi này có anh
[00:56.50]Gió mang câu tình ca ngàn ánh sao vụt qua nhẹ ôm lấy em
[01:00.50]Yêu em thương em con tim anh chân thành
[01:04.50]Cầm tay anh, dựa vai anh
[01:07.50]Kề bên anh nơi này có anh
[01:10.50]Khép đôi mi thật lâu nguyện mãi bên cạnh nhau
[01:14.50]Yêu say đắm như ngày đầu
[01:19.00]Mùa xuân đến bình yên cho anh những giấc mơ
[01:23.50]Hạ lưu giữ ngày mưa ngọt ngào nên thơ
[01:28.00]Mùa thu lá vàng rơi đông sang anh nhớ em
[01:32.50]Tình yêu bé nhỏ xin dành tặng riêng em
[01:40.00]Còn đó tiếng nói ấy bên tai vấn vương bao ngày qua
[01:44.50]Ánh mắt bối rối nhớ thương bao ngày qua
[01:49.00]Yêu em anh thẫn thờ con tim bâng khuâng đâu có ngờ
[01:53.50]Chẳng bao giờ phải mong chờ đợi ai trong chiều hoàng hôn mờ
[01:58.00]Đắm chìm hòa vào vần thơ ngắm nhìn khờ dại mộng mơ
[02:02.50]Đừng bước vội vàng rồi làm ngơ
[02:05.00]Lạnh lùng đó làm bộ dạng thờ ơ
[02:07.50]Nhìn anh đi em nha, hướng nụ cười cho riêng anh nha
[02:11.50]Đơn giản là yêu con tim anh lên tiếng thôi
[02:16.00]Cầm tay anh, dựa vai anh
[02:18.50]Kề bên anh nơi này có anh
[02:21.00]Gió mang câu tình ca ngàn ánh sao vụt qua nhẹ ôm lấy em
[02:25.50]Yêu em thương em con tim anh chân thành
[02:29.50]Cầm tay anh, dựa vai anh
[02:32.00]Kề bên anh nơi này có anh
[02:35.00]Khép đôi mi thật lâu nguyện mãi bên cạnh nhau
[02:39.00]Yêu say đắm như ngày đầu...`,
  },
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
[01:40.50]Vững tin rằng ta sẽ lại gặp nhau... Như ngày hôm qua!`,
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
[01:24.00]Nhìn em xa khuất dần... lạ lùng thay!`,
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
[00:52.50]Đi về nhà, đi về nhà...`,
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
[01:01.00]Là khúc ca dịu êm giữa chiều hè...`,
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
[00:39.00]Ngày mai các em sẽ bay thật xa...`,
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
    title: 'Em Là',
    artist: 'MONO',
    syncedLyrics: `[00:00.00]Em Là - MONO, Onionn
[00:12.00]Từng giọt sương mai đọng trên cánh hoa
[00:16.50]Như nụ cười em trong sớm mai
[00:21.00]Ánh mắt ấy làm tim anh xao xuyến
[00:25.50]Ngỡ như cả thế giới bỗng ngừng trôi
[00:30.00]Em là tia nắng sưởi ấm tâm hồn anh
[00:34.50]Em là khúc ca dịu êm anh muốn nghe mãi
[00:39.00]Dù cho ngày sau có bao đổi thay
[00:43.50]Anh vẫn sẽ ở đây bên cạnh em...`,
  },
  {
    title: 'In Love',
    artist: 'Low G, JustaTee',
    syncedLyrics: `[00:00.00]In Love - Low G, JustaTee
[00:10.00]Em bước vào căn phòng làm không gian bừng sáng
[00:14.50]Mọi ánh nhìn đều đổ dồn về phía em
[00:19.00]Từng cử chỉ nụ cười đều mang vẻ quyến rũ
[00:23.50]Khiến anh không thể nào rời mắt được đâu
[00:28.00]Girl I think I am in love with you
[00:32.50]Chẳng cần phải nói ra những lời hoa mỹ
[00:37.00]Chỉ cần ánh mắt chạm nhau trong giây phút
[00:41.50]Là đủ để biết ta thuộc về nhau...`,
  },
  {
    title: 'Chờ Chút Xíu',
    artist: 'd0n9',
    syncedLyrics: `[00:00.00]Chờ Chút Xíu - d0n9
[00:08.00]Chờ chút xíu thôi em ơi anh tới liền
[00:12.50]Đường phố đông đúc kẹt xe nhưng lòng anh vội
[00:17.00]Mang theo ly trà sữa mà em thích nhất
[00:21.50]Với cả trái tim này chỉ dành trao em
[00:26.00]Đừng giận anh nhé cô bé đáng yêu
[00:30.50]Nụ cười của em là điều ngọt ngào nhất
[00:35.00]Anh sẽ ở bên em mỗi khi em cần...`,
  },
  {
    title: 'Có Chắc Yêu Là Đây',
    artist: 'Sơn Tùng M-TP',
    syncedLyrics: `[00:00.00]Có Chắc Yêu Là Đây - Sơn Tùng M-TP
[00:12.50]Thấp thoáng ánh mắt đôi môi em đang cười
[00:16.50]Lòng anh bâng khuâng ngỡ như giấc mơ
[00:20.50]Nhẹ nhàng làn gió cuốn tóc em bay
[00:24.50]Khiến tim anh loạn nhịp từng cơn
[00:28.50]Có chắc yêu là đây, em có muốn bên anh
[00:32.50]Cùng nhau đi qua bao tháng năm dài
[00:36.50]Nụ cười em sưởi ấm trái tim này
[00:40.50]Nguyện mãi yêu em chẳng hề đổi thay...`,
  },
  {
    title: 'Chúng Ta Của Hiện Tại',
    artist: 'Sơn Tùng M-TP',
    syncedLyrics: `[00:00.00]Chúng Ta Của Hiện Tại - Sơn Tùng M-TP
[00:15.00]Mùa thu mang giấc mơ xưa quay về
[00:20.50]Cảm xúc vấn vương theo từng giọt mưa
[00:26.00]Chúng ta của hiện tại ngắm nhìn nhau ngập ngừng
[00:31.50]Dù biết mai này đường ai nấy đi
[00:37.00]Tình yêu ấy xin giữ lại trong tim
[00:42.50]Những tháng ngày bên nhau ngọt ngào say đắm
[00:48.00]Cảm ơn em đã đến bên cuộc đời anh...`,
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
  const normTitle = removeAccents(title).toLowerCase().trim();
  const normArtist = artist ? removeAccents(artist).toLowerCase().trim() : '';
  const stripAlnum = (s: string) => removeAccents(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTitleAlnum = stripAlnum(title);

  // 1. Exact, stripped, or substring match
  for (const item of CURATED_SYNCED_LYRICS) {
    const itemTitle = removeAccents(item.title).toLowerCase().trim();
    const itemArtist = removeAccents(item.artist).toLowerCase().trim();
    const itemTitleAlnum = stripAlnum(item.title);

    // Check title match (including stripped whitespace e.g. "24" matches "2 4")
    const titleMatch =
      normTitle === itemTitle ||
      cleanTitleAlnum === itemTitleAlnum ||
      (cleanTitleAlnum.length >= 5 && itemTitleAlnum.includes(cleanTitleAlnum)) ||
      (itemTitleAlnum.length >= 5 && cleanTitleAlnum.includes(itemTitleAlnum));

    if (titleMatch) {
      if (!normArtist) return item.syncedLyrics;
      // Check artist match or title is very strong match
      if (
        normArtist.includes(itemArtist) ||
        itemArtist.includes(normArtist) ||
        cleanTitleAlnum === itemTitleAlnum
      ) {
        return item.syncedLyrics;
      }
    }
  }

  return null;
}
