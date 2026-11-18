"use client";

import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { api } from "../../api/client.js";
import { UnifiedArtist, UnifiedTrack } from "../../types/index.js";
import { usePlayerStore } from "../../stores/player-store.js";
import { cleanDisplayTitle, formatArtists } from "../../utils/format.js";
import { Spinner } from "../common/Loading.js";
import "./search-card.css";

export type SearchItemType = "song" | "artist" | "playlist" | "genre";

export interface SearchCardItem {
  id: string;
  title: string;
  sub: string;
  type: SearchItemType;
  url: string;
  coverUrl?: string;
  track?: UnifiedTrack;
  Tile: () => ReactNode;
}

export interface SearchChip {
  id: string;
  label: string;
  from: string;
  to: string;
}

export type SearchCardProps = {
  theme?: "light" | "dark";
  /** The card's corner radius in hero mode */
  corner?: number;
  /** How many items to display */
  rows?: number;
  /** Listen for ⌘K / Ctrl K anywhere on the page */
  shortcut?: boolean;
  /** Mode: "navbar" for floating dropdown from header, "hero" for centered page block */
  mode?: "navbar" | "hero";
  className?: string;
  onOpenChange?: (open: boolean) => void;
};

const ease = [0.23, 1, 0.32, 1] as const; /* strong ease-out */
const easeInOut = [0.65, 0, 0.35, 1] as const;
const morph = { duration: 0.46, ease: [0.45, 0, 0.15, 1] as const };
const smooth = { duration: 0.3, ease: easeInOut };
const glide = { duration: 0.22, ease };
const fade = { duration: 0.16, ease };

/* ---------------------------------------------------------------- Icons */

const Icon = ({ size, stroke = 2, children }: { size: number; stroke?: number; children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const SearchIcon = (p: { size: number; stroke?: number }) => (
  <Icon {...p}>
    <path d="m21 21-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </Icon>
);

const XIcon = (p: { size: number; stroke?: number }) => (
  <Icon {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

const TrashIcon = (p: { size: number; stroke?: number }) => (
  <Icon {...p}>
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Icon>
);

const RestoreIcon = (p: { size: number; stroke?: number }) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

/* ---------------------------------------------------------------- PinUI Music Tiles */

type Box = [number, number, number, number, number | string, string];
const at = ([left, top, width, height, radius, background]: Box) => ({
  left,
  top,
  width,
  height,
  borderRadius: radius,
  background,
});

function Tile({ face, glow, children }: { face: string; glow: string; children: ReactNode }) {
  return (
    <div className="psearch__tile">
      <div
        className="psearch__tile-art"
        style={{ background: face, boxShadow: `inset 0 1px 1px rgba(255,255,255,.65), 0 6px 14px -6px ${glow}` }}
      >
        {children}
      </div>
    </div>
  );
}

/** Đĩa than Vinyl & Nốt nhạc (Song) */
function SongVinylTile() {
  return (
    <Tile face="linear-gradient(145deg, #1f1f27 0%, #111116 100%)" glow="rgba(249,115,22,.45)">
      <span style={at([6, 6, 64, 64, 999, "radial-gradient(circle, #2a2a35 20%, #15151b 50%, #2a2a35 70%, #111116 100%)"])} />
      <span style={at([16, 16, 44, 44, 999, "transparent"])}>
        <span style={{ position: "absolute", inset: 0, borderRadius: 999, border: "1px dashed rgba(255,255,255,.2)" }} />
      </span>
      <span style={at([25, 25, 26, 26, 999, "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"])} />
      <span style={at([33, 33, 10, 10, 999, "#0d0d12"])} />
    </Tile>
  );
}

/** Nghệ sĩ & Ngôi sao xác minh (Artist) */
function ArtistStarTile() {
  return (
    <Tile face="linear-gradient(140deg, #f6cffc 0%, #d79bf3 50%, #a75be6 100%)" glow="rgba(167,91,230,.55)">
      <span style={at([10, 8, 56, 56, 999, "radial-gradient(circle, rgba(255,255,255,.5) 0%, transparent 70%)"])} />
      <span style={at([22, 20, 32, 32, 999, "rgba(255,255,255,.9)"])}>
        <span style={{ position: "absolute", inset: 4, borderRadius: 999, background: "#8b2fc9" }} />
      </span>
      <span style={at([35, 12, 6, 6, 999, "#ffffff"])} />
      <span style={at([18, 42, 5, 5, 999, "rgba(255,255,255,.9)"])} />
    </Tile>
  );
}

/** Xu hướng & Ngọn lửa thịnh hành (Trending) */
function TrendingFlameTile() {
  return (
    <Tile face="linear-gradient(150deg, #ffd28a 0%, #ffa25c 50%, #f47b36 100%)" glow="rgba(244,123,54,.55)">
      <span style={at([12, 38, 10, 26, 5, "rgba(255,255,255,.8)"])} />
      <span style={at([26, 26, 10, 38, 5, "rgba(255,255,255,.95)"])} />
      <span style={at([40, 16, 10, 48, 5, "#ffffff"])} />
      <span style={at([54, 30, 10, 34, 5, "rgba(255,255,255,.8)"])} />
    </Tile>
  );
}

/** Acoustic & Nhạc mộc (Acoustic) */
function AcousticTile() {
  return (
    <Tile face="linear-gradient(150deg, #9ee98f 0%, #5cd062 55%, #38b54a 100%)" glow="rgba(56,181,74,.55)">
      <span style={at([20, 20, 36, 36, 999, "rgba(255,255,255,.45)"])}>
        <span style={{ position: "absolute", inset: 5, borderRadius: 999, background: "#1f6e2b" }} />
      </span>
      <span style={at([12, 34, 52, 2, 0, "rgba(255,255,255,.8)"])} />
      <span style={at([12, 40, 52, 2, 0, "rgba(255,255,255,.6)"])} />
    </Tile>
  );
}

/** Equalizer & Sóng nhạc số (Waveform) */
function WaveformTile() {
  return (
    <Tile face="linear-gradient(150deg, #7cc0ff 0%, #3d8af5 55%, #2266e3 100%)" glow="rgba(34,102,227,.55)">
      <span style={at([10, 32, 8, 30, 4, "rgba(255,255,255,.6)"])} />
      <span style={at([22, 18, 8, 44, 4, "rgba(255,255,255,.85)"])} />
      <span style={at([34, 12, 8, 50, 4, "#ffffff"])} />
      <span style={at([46, 24, 8, 38, 4, "rgba(255,255,255,.85)"])} />
      <span style={at([58, 36, 8, 26, 4, "rgba(255,255,255,.6)"])} />
    </Tile>
  );
}

/** Thành phần hiển thị Artwork với Fallback vector tile */
function ArtworkRenderer({ item }: { item: SearchCardItem }) {
  const [imgError, setImgError] = useState(false);

  if (item.coverUrl && !imgError) {
    return (
      <div className="psearch__tile">
        <img
          src={item.coverUrl}
          alt={item.title}
          onError={() => setImgError(true)}
          className="w-[42px] h-[42px] rounded-[13px] object-cover shadow-xs border border-black/5 dark:border-white/10 shrink-0"
        />
      </div>
    );
  }

  const TileComponent = item.Tile;
  return <TileComponent />;
}

/* ---------------------------------------------------------------- Gợi ý trong Website mq */

const MQ_SUGGESTIONS: SearchCardItem[] = [
  {
    id: "son-tung",
    title: "Sơn Tùng M-TP",
    sub: "Nghệ sĩ xác minh • V-Pop • 3.2M người theo dõi",
    type: "artist",
    url: "/artists/artist-son-tung-m-tp",
    coverUrl: "https://i.scdn.co/image/ab6761610000e5eb8885185d1e914c51c15c3a13",
    Tile: ArtistStarTile,
  },
  {
    id: "chung-ta-cua-tuong-lai",
    title: "Chúng Ta Của Tương Lai",
    sub: "Sơn Tùng M-TP • Single V-Pop • Thịnh hành #1",
    type: "song",
    url: "/search?q=Chúng Ta Của Tương Lai",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b27351816aa1106ff7fcb136fafc",
    Tile: TrendingFlameTile,
  },
  {
    id: "simp-gai-808",
    title: "Simp Gái 808",
    sub: "Low G • Rap Việt • 161K lượt nghe",
    type: "song",
    url: "/search?q=Simp Gái 808",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2731d66c4676b09e84c90333a14",
    Tile: SongVinylTile,
  },
  {
    id: "vu",
    title: "Vũ.",
    sub: "Bước Qua Nhau, Lạ Lùng • Hoàng tử Indie Việt",
    type: "artist",
    url: "/artists/artist-vu",
    coverUrl: "https://i.scdn.co/image/ab6761610000e5eb2d7150aa7e90e9a85610ab3d",
    Tile: AcousticTile,
  },
  {
    id: "top-1-trong-mat-em",
    title: "TOP 1 (TRONG MẮT EM)",
    sub: "TINH HÀ \"SAY HI\" ft. buitruonglinh • Trending Viral",
    type: "song",
    url: "/search?q=TOP 1 TRONG MẮT EM",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273f70296f8c613e5be8cc184b0",
    Tile: WaveformTile,
  },
  {
    id: "den-vau",
    title: "Đen Vâu",
    sub: "Nấu Ăn Cho Em, Đi Về Nhà • Rap Việt Triết Lý",
    type: "artist",
    url: "/artists/artist-den-vau",
    coverUrl: "https://i.scdn.co/image/ab6761610000e5eb91d2d39877c13427a2651af5",
    Tile: ArtistStarTile,
  },
];

const MQ_CHIPS: SearchChip[] = [
  { id: "vpop", label: "V-Pop", from: "#f39a72", to: "#f7b48c" },
  { id: "rap", label: "Rap Việt", from: "#e2a6f1", to: "#f1cdf7" },
  { id: "indie", label: "Indie Việt", from: "#a9e2a0", to: "#d4f2cd" },
  { id: "nhactre", label: "Nhạc Trẻ", from: "#f7c76a", to: "#fbe0a4" },
  { id: "acoustic", label: "Acoustic", from: "#7ec0fb", to: "#a8d2fb" },
  { id: "remix", label: "Remix EDM", from: "#ff9ebb", to: "#ffd2df" },
];

/* ---------------------------------------------------------------- Hàng gợi ý */

function RecentRow({
  item,
  index,
  active,
  hideDivider,
  onTrack,
  onRemove,
  onSelect,
}: {
  item: SearchCardItem;
  index: number;
  active: boolean;
  hideDivider: boolean;
  onTrack: (id: string, el: HTMLElement) => void;
  onRemove: (id: string) => void;
  onSelect: (item: SearchCardItem) => void;
}) {
  const [tip, setTip] = useState(false);
  const isPresent = useIsPresent();

  useEffect(() => {
    if (!active) setTip(false);
  }, [active]);

  const track = (e: { currentTarget: HTMLElement }) => onTrack(item.id, e.currentTarget);

  return (
    <motion.li
      initial={{ height: 0 }}
      animate={{ height: "auto", transition: smooth }}
      exit={{ height: 0, opacity: 0, transition: { height: smooth, opacity: { duration: 0.16, ease } } }}
      onPointerEnter={track}
      onFocus={track}
      className={`psearch__row${isPresent ? "" : " psearch__row--leaving"}`}
      style={{ zIndex: active ? 3 : 2 }}
    >
      <div className="psearch__divider" style={{ opacity: hideDivider ? 0 : 1 }} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease, delay: 0.08 + index * 0.04 } }}
        className="psearch__row-body"
        onClick={() => onSelect(item)}
      >
        <motion.div animate={{ scale: active ? 1.05 : 1, y: active ? -1 : 0 }} transition={glide}>
          <ArtworkRenderer item={item} />
        </motion.div>

        <div className="psearch__row-text">
          <div className="psearch__row-title">{item.title}</div>
          <div className="psearch__row-sub">{item.sub}</div>
        </div>

        <div className="psearch__remove-slot">
          <motion.button
            type="button"
            aria-label={`Xóa ${item.title}`}
            initial={false}
            animate={{ opacity: active ? 1 : 0, x: active ? 0 : 6 }}
            transition={{ duration: 0.22, ease }}
            whileTap={{ scale: 0.88 }}
            onPointerEnter={() => setTip(true)}
            onPointerLeave={() => setTip(false)}
            onFocus={() => setTip(true)}
            onBlur={() => setTip(false)}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className={`psearch__remove${active ? "" : " psearch__remove--idle"}`}
          >
            <TrashIcon size={15} />
          </motion.button>

          <AnimatePresence>
            {tip && (
              <motion.div
                role="tooltip"
                initial={{ opacity: 0, x: 4, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.18, ease, delay: 0.2 } }}
                exit={{ opacity: 0, x: 2, scale: 0.98, transition: { duration: 0.12, ease } }}
                style={{ originX: 1 }}
                className="psearch__tip"
              >
                Xóa gợi ý
                <span className="psearch__tip-arrow" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.li>
  );
}

/* ---------------------------------------------------------------- Danh sách với sheet trượt */

type Hover = { id: string; top: number; height: number; shown: boolean; jump: boolean };

function RecentList({
  items,
  visible,
  query,
  isSearching,
  onRemove,
  onSelect,
}: {
  items: SearchCardItem[];
  visible: SearchCardItem[];
  query: string;
  isSearching?: boolean;
  onRemove: (id: string) => void;
  onSelect: (item: SearchCardItem) => void;
}) {
  const [hover, setHover] = useState<Hover | null>(null);

  const onTrack = (id: string, el: HTMLElement) => {
    const top = el.offsetTop;
    const height = el.offsetHeight;
    setHover((h) =>
      h && h.shown && h.id === id && h.top === top && h.height === height
        ? h
        : { id, top, height, shown: true, jump: !h || !h.shown },
    );
  };
  const hide = () => setHover((h) => (h && h.shown ? { ...h, shown: false, jump: false } : h));

  const shownId = hover?.shown && visible.some((i) => i.id === hover.id) ? hover.id : null;
  const activeIndex = visible.findIndex((i) => i.id === shownId);
  const still = { duration: 0 };

  return (
    <ul className="psearch__list" onPointerLeave={hide}>
      <motion.div
        aria-hidden
        className="psearch__sheet"
        initial={false}
        animate={{ y: hover?.top ?? 0, height: hover?.height ?? 0, opacity: shownId ? 1 : 0 }}
        transition={{
          y: hover?.jump ? still : glide,
          height: hover?.jump ? still : glide,
          opacity: fade,
        }}
      />

      <AnimatePresence initial={false}>
        {visible.map((item, i) => (
          <RecentRow
            key={item.id}
            item={item}
            index={i}
            active={item.id === shownId}
            hideDivider={activeIndex !== -1 && (i === activeIndex || i === activeIndex + 1)}
            onTrack={onTrack}
            onRemove={(id) => {
              hide();
              onRemove(id);
            }}
            onSelect={onSelect}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {visible.length === 0 && (
          <motion.li
            key={isSearching ? "searching" : "empty"}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={smooth}
            className="psearch__empty"
          >
            {isSearching ? (
              <div className="w-full flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 text-xs text-mute">
                  <Spinner size="xs" />
                  <span>Đang tìm “{query.trim()}”...</span>
                </div>
                <div className="space-y-2.5 px-1" aria-hidden="true">
                  {[0, 1].map((row) => (
                    <div key={row} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-lg bg-neutral-200/70 dark:bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/5 rounded bg-neutral-200/70 dark:bg-white/10" />
                        <div className="h-2.5 w-2/5 rounded bg-neutral-200/50 dark:bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {items.length === 0 && !query.trim()
                  ? "Chưa có tìm kiếm nào gần đây"
                  : `Không tìm thấy gợi ý phù hợp cho “${query.trim()}”`}
              </div>
            )}
          </motion.li>
        )}
      </AnimatePresence>
    </ul>
  );
}

/* ---------------------------------------------------------------- Chips Thể loại */

function CountBadge({ value }: { value: number }) {
  return (
    <span className="psearch__count">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={smooth}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Chips({
  chips,
  setChips,
  onSelectChip,
}: {
  chips: SearchChip[];
  setChips: (next: SearchChip[] | ((list: SearchChip[]) => SearchChip[])) => void;
  onSelectChip: (chip: SearchChip) => void;
}) {
  return (
    <div className="psearch__chips">
      <motion.button
        layout
        type="button"
        transition={smooth}
        whileTap={{ scale: 0.96 }}
        onClick={() => setChips(MQ_CHIPS)}
        aria-label={`Thể loại nhạc, ${chips.length} danh mục. Bấm để khôi phục tất cả`}
        className="psearch__chip psearch__chip--lead"
      >
        <CountBadge value={chips.length} />
        Thể loại
      </motion.button>

      <AnimatePresence mode="popLayout" initial={false}>
        {chips.map((chip) => (
          <motion.div
            key={chip.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={smooth}
            onClick={() => onSelectChip(chip)}
            className="psearch__chip"
            style={{ background: `linear-gradient(90deg,${chip.from} 0%,${chip.to} 100%)` }}
          >
            <motion.button
              type="button"
              aria-label={`Xóa ${chip.label}`}
              whileTap={{ scale: 0.86 }}
              transition={smooth}
              onClick={(e) => {
                e.stopPropagation();
                setChips((list) => list.filter((c) => c.id !== chip.id));
              }}
              className="psearch__chip-x"
            >
              <XIcon size={12} stroke={2.4} />
            </motion.button>
            {chip.label}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const RECENT_SEARCHES_KEY = "mq_recent_searches_v1";
const MAX_RECENT_SEARCHES = 6;

interface StoredRecentItem {
  id: string;
  title: string;
  sub: string;
  type: SearchItemType;
  url: string;
  coverUrl?: string;
  track?: UnifiedTrack;
}

function loadRecentSearches(): SearchCardItem[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.id === "string" && typeof x.title === "string")
      .slice(0, MAX_RECENT_SEARCHES)
      .map((x: StoredRecentItem) => ({
        ...x,
        Tile: x.type === "artist" ? ArtistStarTile : x.type === "playlist" ? TrendingFlameTile : SongVinylTile,
      }));
  } catch {
    return [];
  }
}

function persistRecentSearches(list: SearchCardItem[]) {
  try {
    const serializable: StoredRecentItem[] = list.slice(0, MAX_RECENT_SEARCHES).map((item) => ({
      id: item.id,
      title: item.title,
      sub: item.sub,
      type: item.type,
      url: item.url,
      coverUrl: item.coverUrl,
      track: item.track,
    }));
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(serializable));
  } catch {
    // ignore storage quota errors
  }
}

/* ---------------------------------------------------------------- Component SearchCard */

export default function SearchCard({
  theme = "light",
  corner = 20,
  rows = 4,
  shortcut = true,
  mode = "navbar",
  className = "",
  onOpenChange,
}: SearchCardProps) {
  const navigate = useNavigate();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const count = Math.max(0, Math.min(MQ_SUGGESTIONS.length, Math.round(rows)));
  const startItems = useMemo(() => MQ_SUGGESTIONS.slice(0, count), [count]);

  const [open, setOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<SearchCardItem[]>(() => loadRecentSearches());
  const [items, setItems] = useState<SearchCardItem[]>(startItems);
  const [liveItems, setLiveItems] = useState<SearchCardItem[]>([]);
  const [liveTracks, setLiveTracks] = useState<UnifiedTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chips, setChips] = useState<SearchChip[]>(MQ_CHIPS);
  const [query, setQuery] = useState("");
  const [mac, setMac] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const radius = Math.max(0, Math.min(40, corner));
  const inner = Math.max(0, radius - 6);

  const normalizeText = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();

  const trimmedQuery = query.trim();

  // Tìm kiếm trực tiếp từ /api/search khi người dùng gõ từ khóa
  useEffect(() => {
    if (!open || !trimmedQuery) {
      if (abortRef.current) abortRef.current.abort();
      setLiveItems([]);
      setLiveTracks([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      api
        .get("/search", {
          params: { q: trimmedQuery, type: "all" },
          signal: controller.signal,
        })
        .then((res) => {
          const data = res.data?.data || {};
          const tracks: UnifiedTrack[] = data.tracks || [];
          const artists: UnifiedArtist[] = data.artists || [];

          const normalizeArtistKey = (value: string) =>
            value
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/gi, "d")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");

          const mappedArtists: SearchCardItem[] = artists.slice(0, 4).map((artist) => {
            const artistKey = normalizeArtistKey(artist.name);
            const fallbackCover = tracks.find((t) =>
              t.artists?.some((a) => normalizeArtistKey(a).includes(artistKey))
            )?.coverUrl;
            const followersText =
              typeof artist.followersCount === "number" && artist.followersCount > 0
                ? ` · ${artist.followersCount.toLocaleString("vi-VN")} người theo dõi`
                : "";
            return {
              id: `artist-${artist.id}`,
              title: artist.name,
              sub: `Nghệ sĩ${followersText}`,
              type: "artist",
              url: `/artists/${artist.id}`,
              coverUrl: artist.imageUrl || fallbackCover,
              Tile: ArtistStarTile,
            };
          });

          const mappedTracks: SearchCardItem[] = tracks.slice(0, 5).map((track) => ({
            id: `track-${track.id}`,
            title: cleanDisplayTitle(track.title),
            sub: `${formatArtists(track.artists)}${track.album ? ` • ${track.album}` : ""}`,
            type: "song",
            url: `/search?q=${encodeURIComponent(track.title)}`,
            coverUrl: track.coverUrl,
            track,
            Tile: SongVinylTile,
          }));

          setLiveTracks(tracks);
          setLiveItems([...mappedArtists, ...mappedTracks]);
          setIsSearching(false);
        })
        .catch((err) => {
          if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
          setIsSearching(false);
        });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [open, trimmedQuery]);

  const qNorm = normalizeText(trimmedQuery);
  const activeBaseItems = recentItems.length > 0 ? recentItems : items;
  const localMatches = qNorm
    ? activeBaseItems.filter((i) => normalizeText(`${i.title} ${i.sub}`).includes(qNorm))
    : activeBaseItems;
  const visible = trimmedQuery
    ? liveItems.length > 0
      ? liveItems
      : isSearching
        ? []
        : localMatches
    : activeBaseItems;

  const pushRecentItem = (item: SearchCardItem) => {
    setRecentItems((prev) => {
      const next = [item, ...prev.filter((x) => x.id !== item.id)].slice(0, MAX_RECENT_SEARCHES);
      persistRecentSearches(next);
      return next;
    });
  };

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const handleOpen = () => {
    setOpen(true);
    onOpenChange?.(true);
  };

  /* ⌘K / Ctrl K toàn cục */
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (document.activeElement === inputRef.current) close();
        else {
          handleOpen();
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  /* Bấm ra ngoài để đóng */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (rootRef.current?.contains(target) || target?.closest?.("[data-keep-open]")) return;
      close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const handleItemSelect = (item: SearchCardItem) => {
    pushRecentItem(item);
    close();
    if (item.track) {
      playTrack(item.track, liveTracks.length > 0 ? liveTracks : [item.track]);
      return;
    }
    navigate(item.url);
  };

  const handleChipSelect = (chip: SearchChip) => {
    close();
    navigate(`/search?q=${encodeURIComponent(chip.label)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const targetQuery = query.trim();
      pushRecentItem({
        id: `query-${targetQuery.toLowerCase()}`,
        title: targetQuery,
        sub: "Từ khóa tìm kiếm gần đây",
        type: "song",
        url: `/search?q=${encodeURIComponent(targetQuery)}`,
        Tile: SongVinylTile,
      });
      close();
      navigate(`/search?q=${encodeURIComponent(targetQuery)}`);
    }
  };

  return (
    <>
      {/* Backdrop toàn màn hình khi mở ở chế độ Navbar */}
      {mode === "navbar" &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={close}
            aria-hidden="true"
          />,
          document.body
        )}

      <div
        ref={rootRef}
        className={`psearch ${mode === "navbar" ? "psearch--navbar" : ""} ${
          open ? "psearch--open" : ""
        } ${className}`}
        data-theme={theme}
      >
        <motion.div
          layout
          layoutDependency={open}
          transition={morph}
          onClick={() => {
            if (!open) {
              handleOpen();
              inputRef.current?.focus();
            }
          }}
          className={`psearch__card ${open ? "psearch__card--open" : ""}`}
          style={{ borderRadius: open ? radius : 999 }}
        >
          {/* Hàng tìm kiếm chính */}
          <motion.form
            layout="position"
            layoutDependency={open}
            transition={morph}
            onSubmit={handleSubmit}
            className="psearch__bar"
          >
            <span className="psearch__glass">
              <SearchIcon size={15} stroke={2.2} />
            </span>

            <input
              ref={inputRef}
              value={query}
              onFocus={handleOpen}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (query) setQuery("");
                  else close();
                }
              }}
              placeholder="Tìm bài hát, nghệ sĩ, album..."
              aria-label="Tìm kiếm âm nhạc"
              className="psearch__input"
            />

            <AnimatePresence mode="popLayout" initial={false}>
              {open ? (
                <motion.button
                  key="close"
                  type="button"
                  aria-label={query ? "Xóa truy vấn" : "Đóng"}
                  initial={{ opacity: 0, scale: 0.7, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.7, rotate: -45 }}
                  transition={{ duration: 0.24, ease }}
                  whileTap={{ scale: 0.88 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (query) {
                      setQuery("");
                      inputRef.current?.focus();
                    } else close();
                  }}
                  className="psearch__close"
                >
                  <XIcon size={14} stroke={2.4} />
                </motion.button>
              ) : (
                <motion.kbd
                  key="kbd"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={fade}
                  className="psearch__kbd"
                >
                  {mac ? "⌘K" : "Ctrl K"}
                </motion.kbd>
              )}
            </AnimatePresence>
          </motion.form>

          {/* Phần nội dung gợi ý & thể loại mở rộng */}
          <AnimatePresence mode="popLayout" initial={false}>
            {open && (
              <motion.div
                key="body"
                layout="position"
                layoutDependency={open}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease, delay: 0.1 } }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
                className="psearch__body"
              >
                <div className="psearch__panel" style={{ borderRadius: inner }}>
                  <div className="psearch__head">
                    <span className="psearch__head-label">
                      {trimmedQuery
                        ? "Kết quả tìm kiếm"
                        : recentItems.length > 0
                          ? "Tìm kiếm gần đây"
                          : "Gợi ý & Nổi bật"}
                    </span>
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.button
                        key={activeBaseItems.length ? "clear" : "restore"}
                        type="button"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={smooth}
                        onClick={() => {
                          if (recentItems.length > 0) {
                            setRecentItems([]);
                            persistRecentSearches([]);
                          } else if (items.length) {
                            setItems([]);
                          } else {
                            setItems(startItems);
                            setChips(MQ_CHIPS);
                            setQuery("");
                          }
                        }}
                        className="psearch__action"
                      >
                        {activeBaseItems.length ? (
                          "Xóa tất cả"
                        ) : (
                          <>
                            <RestoreIcon size={12} stroke={2.4} /> Khôi phục
                          </>
                        )}
                      </motion.button>
                    </AnimatePresence>
                  </div>

                  <RecentList
                    items={activeBaseItems}
                    visible={visible}
                    query={query}
                    isSearching={isSearching}
                    onRemove={(id) => {
                      if (recentItems.length > 0) {
                        setRecentItems((list) => {
                          const next = list.filter((x) => x.id !== id);
                          persistRecentSearches(next);
                          return next;
                        });
                      } else {
                        setItems((list) => list.filter((x) => x.id !== id));
                      }
                    }}
                    onSelect={handleItemSelect}
                  />
                  <div className="psearch__foot" />
                </div>

                <Chips chips={chips} setChips={setChips} onSelectChip={handleChipSelect} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}

export { SearchCard };
