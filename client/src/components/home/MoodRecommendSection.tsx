import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  ListPlus,
  Loader2,
  Play,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { UnifiedTrack } from '../../types/index.js';
import { usePlayerStore } from '../../stores/player-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useAuthModalStore } from '../../stores/auth-modal-store.js';
import { SongRow } from '../song/SongRow.js';
import { SongRowSkeleton } from '../common/Loading.js';

const QUICK_MOODS = [
  { id: 'focus', label: 'Tập trung', prompt: 'Nhạc không lời hoặc lo-fi nhẹ giúp tập trung làm việc, học bài' },
  { id: 'gym', label: 'Tập gym', prompt: 'Nhạc sôi động, beat mạnh tạo động lực tập gym' },
  { id: 'chill', label: 'Thư giãn', prompt: 'Nhạc chill, indie nhẹ nhàng thư giãn cuối ngày' },
  { id: 'sad', label: 'Buồn', prompt: 'Nhạc ballad buồn sâu lắng, tâm trạng' },
  { id: 'happy', label: 'Vui', prompt: 'Nhạc pop vui tươi, tích cực yêu đời' },
  { id: 'romantic', label: 'Lãng mạn', prompt: 'Nhạc tình yêu lãng mạn, ngọt ngào' },
  { id: 'drive', label: 'Lái xe', prompt: 'Nhạc bắt tai, nhịp vừa phải nghe khi lái xe' },
  { id: 'sleep', label: 'Đi ngủ', prompt: 'Nhạc êm dịu, acoustic hoặc piano nhẹ dễ ngủ' },
] as const;

interface MoodRecommendResponse {
  summary: string;
  tracks: UnifiedTrack[];
  prompt: string;
  cached?: boolean;
}

export const MoodRecommendSection: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { playTrack, addToQueue } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();

  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [result, setResult] = useState<MoodRecommendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [queuedFeedback, setQueuedFeedback] = useState(false);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [savedPlaylistFeedback, setSavedPlaylistFeedback] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchRecommendations = async (promptText: string, refresh = false) => {
    const trimmed = promptText.trim().slice(0, 200);
    if (!trimmed) return;

    setLastPrompt(trimmed);
    setIsLoading(true);
    setErrorMsg(null);
    setSavedPlaylistFeedback(false);
    setQueuedFeedback(false);

    try {
      const res = await api.post('/ai/mood-recommend', {
        prompt: trimmed,
        limit: 8,
        refresh,
      });
      setResult(res.data as MoodRecommendResponse);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          'Không thể kết nối AI gợi ý lúc này. Vui lòng thử lại sau.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleMoodTrigger = (e: Event) => {
      const custom = e as CustomEvent<{ prompt?: string; focusOnly?: boolean }>;
      document.getElementById('sec-mood')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      if (custom.detail?.prompt) {
        setSelectedMoodId(null);
        setPromptInput(custom.detail.prompt.slice(0, 200));
        fetchRecommendations(custom.detail.prompt);
      } else {
        window.setTimeout(() => inputRef.current?.focus(), 300);
      }
    };

    window.addEventListener('mq:mood-recommend', handleMoodTrigger);
    return () => window.removeEventListener('mq:mood-recommend', handleMoodTrigger);
  }, []);

  const handleChipClick = (mood: (typeof QUICK_MOODS)[number]) => {
    setSelectedMoodId(mood.id);
    setPromptInput(mood.label);
    fetchRecommendations(mood.prompt);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isLoading) return;
    setSelectedMoodId(null);
    fetchRecommendations(promptInput);
  };

  const handlePlayAll = () => {
    if (!result?.tracks?.length) return;
    playTrack(result.tracks[0], result.tracks);
  };

  const handleAddAllToQueue = () => {
    if (!result?.tracks?.length) return;
    result.tracks.forEach((t) => addToQueue(t));
    setQueuedFeedback(true);
    window.setTimeout(() => setQueuedFeedback(false), 2000);
  };

  const handleSaveAsPlaylist = async () => {
    if (!result?.tracks?.length || isSavingPlaylist) return;
    if (!isAuthenticated) {
      openAuthModal({
        title: 'Lưu playlist tâm trạng',
        message: 'Đăng nhập để lưu danh sách bài hát gợi ý bởi AI thành playlist của riêng bạn.',
        iconType: 'playlist',
      });
      return;
    }

    setIsSavingPlaylist(true);
    try {
      const shortTitle = `Tâm trạng: ${lastPrompt.slice(0, 32)}`;
      await api.post('/playlists', {
        title: shortTitle,
        description: result.summary,
        isPublic: true,
        tracks: result.tracks,
      });
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['profile-playlists'] });
      setSavedPlaylistFeedback(true);
      window.setTimeout(() => setSavedPlaylistFeedback(false), 2500);
    } catch {
      setErrorMsg('Không thể lưu playlist lúc này. Vui lòng thử lại.');
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  return (
    <motion.section
      id="sec-mood"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="space-y-4 scroll-mt-28 rounded-3xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card p-5 sm:p-6 shadow-subtle"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline dark:border-hairline-dark pb-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-traffic-green shrink-0" />
          <div>
            <h2 className="font-display font-bold text-xl text-ink dark:text-white">
              Hôm nay bạn thế nào?
            </h2>
            <p className="text-xs text-mute font-sans">
              Chọn nhanh tâm trạng hoặc mô tả cảm xúc để AI chọn nhạc từ kho mq
            </p>
          </div>
        </div>
      </div>

      {/* 8 Quick Mood Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_MOODS.map((mood) => {
          const isSelected = selectedMoodId === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleChipClick(mood)}
              className={`px-3.5 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer active:scale-[0.97] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green ${
                isSelected
                  ? 'bg-traffic-green text-black border-traffic-green font-semibold shadow-xs'
                  : 'bg-surface-soft/75 dark:bg-surface-dark-soft/75 border-hairline dark:border-hairline-dark text-ink dark:text-neutral-200 hover:border-traffic-green/60 hover:text-emerald-600 dark:hover:text-traffic-green'
              }`}
            >
              {mood.label}
            </button>
          );
        })}
      </div>

      {/* Free-text Prompt Form */}
      <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            maxLength={200}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ví dụ: Tôi buồn, muốn nghe nhạc Trịnh chậm..."
            aria-label="Nhập tâm trạng hoặc hoạt động nghe nhạc"
            className="w-full h-10 pl-4 pr-14 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white placeholder-mute focus:outline-none focus:border-traffic-green focus:ring-2 focus:ring-traffic-green/20 transition-all font-sans"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-mute tabular-nums pointer-events-none">
            {promptInput.length}/200
          </span>
        </div>

        <button
          type="submit"
          disabled={!promptInput.trim() || isLoading}
          className="h-10 px-5 rounded-pill bg-ink dark:bg-white text-white dark:text-black text-xs font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang gợi ý...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Gợi ý nhạc</span>
            </>
          )}
        </button>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div role="status" aria-busy="true" className="pt-2 space-y-3">
          <span className="sr-only">Đang tạo danh sách nhạc theo tâm trạng bằng AI</span>
          <SongRowSkeleton count={5} />
        </div>
      )}

      {/* Error State */}
      {!isLoading && errorMsg && (
        <div className="p-4 rounded-2xl border border-rose-300/60 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {lastPrompt && (
            <button
              type="button"
              onClick={() => fetchRecommendations(lastPrompt, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-ink dark:text-white hover:border-traffic-green cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          )}
        </div>
      )}

      {/* Result State */}
      {!isLoading && !errorMsg && result && (
        <div className="pt-2 space-y-4">
          <div className="p-3.5 rounded-2xl bg-traffic-green/8 border border-traffic-green/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-ink dark:text-neutral-100 font-medium leading-relaxed">
              “{result.summary}”
            </p>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {result.tracks.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handlePlayAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-traffic-green text-black text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Phát tất cả</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddAllToQueue}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-xs font-medium text-ink dark:text-white hover:border-traffic-green/60 transition-colors cursor-pointer"
                  >
                    {queuedFeedback ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-traffic-green" />
                        <span>Đã thêm hàng đợi</span>
                      </>
                    ) : (
                      <>
                        <ListPlus className="w-3.5 h-3.5" />
                        <span>Thêm vào hàng đợi</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAsPlaylist}
                    disabled={isSavingPlaylist}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-xs font-medium text-ink dark:text-white hover:border-traffic-green/60 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savedPlaylistFeedback ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-traffic-green" />
                        <span>Đã lưu playlist</span>
                      </>
                    ) : isSavingPlaylist ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Lưu thành playlist</span>
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => fetchRecommendations(lastPrompt, true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-canvas dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-xs font-medium text-mute hover:text-ink dark:hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Gợi ý lại</span>
              </button>
            </div>
          </div>

          {result.tracks.length === 0 ? (
            <div className="py-8 text-center text-xs text-mute">
              Không tìm thấy bài hát phù hợp trong kho nhạc. Hãy thử mô tả ngắn gọn hơn nhé!
            </div>
          ) : (
            <div className="divide-y divide-hairline/40 dark:divide-hairline-dark/40">
              {result.tracks.map((track, idx) => (
                <SongRow
                  key={track.id}
                  track={track}
                  index={idx}
                  queueContext={result.tracks}
                  hideAlbum
                />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
};
