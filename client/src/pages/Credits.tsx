import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export const CreditsPage: React.FC = () => {
  const providers = [
    {
      name: 'Audius',
      badge: 'Phát Full bản quyền',
      desc: 'Mạng lưới phân tán chia sẻ âm nhạc của nghệ sĩ độc lập. Dữ liệu và luồng phát được truy xuất trực tiếp từ các Discovery Node chính thức của Audius.',
      link: 'https://audius.co',
      license: 'Audius Open Protocol',
    },
    {
      name: 'Jamendo',
      badge: 'Phát Full Creative Commons',
      desc: 'Nền tảng âm nhạc miễn phí lớn nhất thế giới cấp phép theo chuẩn Creative Commons (CC-BY, CC-NC). Bản nhạc được phát đầy đủ thông qua Jamendo API.',
      link: 'https://www.jamendo.com',
      license: 'Creative Commons Licenses',
    },
    {
      name: 'YouTube',
      badge: 'IFrame Player API v3',
      desc: 'Tìm kiếm qua YouTube Data API v3 (videoCategoryId=10). Trình phát sử dụng YouTube IFrame Player API chính thức, đảm bảo bản quyền tác giả và quyền hiển thị quảng cáo của người sáng tạo nội dung. Cam kết: Không trích xuất hoặc tải audio từ YouTube.',
      link: 'https://developers.google.com/youtube',
      license: 'YouTube Terms of Service',
    },
    {
      name: 'Deezer',
      badge: 'Metadata & 30s Preview',
      desc: 'Cung cấp siêu dữ liệu bài hát, ảnh bìa album độ phân giải cao và đoạn nghe thử 30 giây phục vụ khám phá âm nhạc qua Deezer Public API.',
      link: 'https://developers.deezer.com',
      license: 'Deezer Developer API Terms',
    },
    {
      name: 'Apple Music / iTunes',
      badge: 'Metadata & 30s Preview',
      desc: 'Cung cấp ảnh bìa độ nét cao và bản nghe thử 30 giây chính thức thông qua iTunes Search API.',
      link: 'https://developer.apple.com',
      license: 'Apple Affiliate & Search API',
    },
    {
      name: 'LRCLIB',
      badge: 'Lời bài hát đồng bộ (LRC)',
      desc: 'Cơ sở dữ liệu lời bài hát mã nguồn mở và cộng đồng lớn nhất, cung cấp thời gian đồng bộ mili-giây từng dòng hát.',
      link: 'https://lrclib.net',
      license: 'Public Community Lyrics DB',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16 pt-4">
      {/* Title */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-xs font-mono text-body dark:text-mute">
          <ShieldCheck className="w-3.5 h-3.5 text-traffic-green" />
          <span>Cam kết minh bạch & Tuân thủ pháp lý</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink dark:text-white">
          Nguồn nhạc & Bản quyền API
        </h1>
        <p className="text-sm text-body dark:text-mute leading-relaxed max-w-2xl">
          Nền tảng <strong>mq</strong> hoạt động dựa trên việc kết nối các giao diện lập trình ứng
          dụng (API) chính thức và mở, hoàn toàn tôn trọng quyền tác giả và chính sách phân phối âm
          nhạc toàn cầu.
        </p>
      </div>

      {/* Terminal Card Specification matching DESIGN.md */}
      <div className="rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-5 space-y-3">
        <div className="flex items-center gap-1.5 pb-2 border-b border-hairline dark:border-hairline-dark">
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-red" />
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-yellow" />
          <span className="w-2.5 h-2.5 rounded-full bg-traffic-green" />
          <span className="ml-2 text-xs font-mono text-mute">mq-compliance-policy.txt</span>
        </div>
        <div className="font-mono text-xs text-body dark:text-mute space-y-1">
          <p className="text-ink dark:text-white font-medium">
            # Nguyên tắc hoạt động kỹ thuật của mq:
          </p>
          <p>1. Không scrape dữ liệu trái phép từ Zing MP3, NhacCuaTui, Spotify hay SoundCloud.</p>
          <p>2. Không trích xuất, rip hoặc lưu trữ luồng âm thanh YouTube lậu.</p>
          <p>3. Chỉ sử dụng YouTube IFrame Player API chuẩn với video ID hợp lệ.</p>
          <p>4. Tệp nhạc Local được tải lên bởi Quản trị viên lưu trữ trong hệ thống lưu trữ có kiểm duyệt.</p>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => (
          <div
            key={p.name}
            className="p-5 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-ink dark:text-white">
                  {p.name}
                </h3>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-charcoal dark:text-mute">
                  {p.badge}
                </span>
              </div>
              <p className="text-xs text-body dark:text-mute leading-relaxed">{p.desc}</p>
            </div>

            <div className="pt-2 border-t border-hairline dark:border-hairline-dark flex items-center justify-between text-xs text-mute">
              <span className="font-mono text-[11px]">{p.license}</span>
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ink dark:text-white hover:underline"
              >
                Website <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
