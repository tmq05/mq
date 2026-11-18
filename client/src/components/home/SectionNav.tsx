import React, { useEffect, useState } from 'react';
import { Flame, Radio, Users, Compass, Disc3 } from 'lucide-react';

export interface HomeSectionItem {
  id: string;
  label: string;
  group: 'listen' | 'explore';
}

export const HOME_SECTIONS: HomeSectionItem[] = [
  { id: 'sec-trending', label: 'Thịnh hành', group: 'listen' },
  { id: 'sec-chart', label: 'Nhạc Việt', group: 'listen' },
  { id: 'sec-artists', label: 'Nghệ sĩ', group: 'explore' },
  { id: 'sec-genres', label: 'Thể loại', group: 'explore' },
  { id: 'sec-albums', label: 'Album', group: 'explore' },
];

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'sec-trending': <Flame className="w-3.5 h-3.5 text-amber-500" />,
  'sec-chart': <Radio className="w-3.5 h-3.5 text-rose-500" />,
  'sec-artists': <Users className="w-3.5 h-3.5 text-traffic-green" />,
  'sec-genres': <Compass className="w-3.5 h-3.5 text-indigo-500" />,
  'sec-albums': <Disc3 className="w-3.5 h-3.5 text-sky-500" />,
};

export const SectionNav: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('sec-trending');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const elements = HOME_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-120px 0px -55% 0px',
        threshold: [0.05, 0.25],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Mục lục nhanh trang Khám phá"
      className="sticky top-14 z-20 py-2 -mx-4 px-4 bg-canvas/85 dark:bg-canvas-dark/85 backdrop-blur-md border-b border-hairline/70 dark:border-hairline-dark/70"
    >
      <div className="flex items-center justify-between gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider text-mute mr-1.5">
            Mục lục:
          </span>
          {HOME_SECTIONS.map((sec) => {
            const isActive = activeId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium whitespace-nowrap transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green ${
                  isActive
                    ? 'bg-ink dark:bg-white text-white dark:text-black shadow-xs'
                    : 'bg-surface-soft/80 dark:bg-surface-dark-soft/80 text-body dark:text-neutral-300 border border-hairline/70 dark:border-hairline-dark/70 hover:border-hairline-strong dark:hover:border-white/25 hover:text-ink dark:hover:text-white'
                }`}
              >
                <span aria-hidden="true">{SECTION_ICONS[sec.id]}</span>
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-3 text-[11px] text-mute shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-traffic-green" />
            Nghe ngay
          </span>
          <span>·</span>
          <span>Khám phá kho nhạc</span>
        </div>
      </div>
    </nav>
  );
};
