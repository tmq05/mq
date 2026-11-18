import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Heart, Repeat, Repeat1, Shuffle } from 'lucide-react';

const SPRING_POP = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 22,
  mass: 0.7,
};

/** Icon Trái tim với hiệu ứng nảy spring & vòng sáng tỏa nhẹ khi bấm Yêu thích */
export const AnimatedHeartIcon: React.FC<{
  liked: boolean;
  className?: string;
}> = ({ liked, className = 'w-4 h-4' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <span className="relative inline-flex items-center justify-center">
      <AnimatePresence>
        {liked && !shouldReduceMotion && (
          <motion.span
            key="heart-burst"
            aria-hidden="true"
            initial={{ scale: 0.5, opacity: 0.75 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 rounded-full border-2 border-red-500 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <motion.span
        key={liked ? 'liked' : 'unliked'}
        initial={shouldReduceMotion ? false : liked ? { scale: 0.72 } : { scale: 0.88 }}
        animate={
          shouldReduceMotion
            ? { scale: 1 }
            : liked
              ? { scale: [0.72, 1.32, 0.94, 1] }
              : { scale: 1 }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : liked
              ? { duration: 0.38, ease: [0.32, 0.72, 0, 1] }
              : SPRING_POP
        }
        className="inline-flex items-center justify-center"
      >
        <Heart className={`${className} ${liked ? 'fill-current' : ''}`} />
      </motion.span>
    </span>
  );
};

/** Nút Phát ngẫu nhiên (Shuffle) đổi màu xanh lá khi bật + hiệu ứng nảy khi click */
export const ShuffleControlButton: React.FC<{
  active: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}> = ({ active, onClick, size = 'sm' }) => {
  const shouldReduceMotion = useReducedMotion();
  const pad = size === 'md' ? 'p-2' : 'p-1.5';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.84 }}
      transition={SPRING_POP}
      aria-pressed={active}
      title={active ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
      aria-label="Phát ngẫu nhiên"
      className={`relative ${pad} rounded-pill transition-colors duration-200 cursor-pointer ${
        active
          ? 'text-traffic-green bg-traffic-green/12 hover:bg-traffic-green/20'
          : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-surface-soft/70 dark:hover:bg-white/10'
      }`}
    >
      <motion.span
        key={active ? 'shuffle-on' : 'shuffle-off'}
        initial={shouldReduceMotion ? false : { scale: 0.85, rotate: active ? -14 : 10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : SPRING_POP}
        className="inline-flex items-center justify-center"
      >
        <Shuffle className="w-4 h-4" />
      </motion.span>

      <AnimatePresence>
        {active && (
          <motion.span
            key="shuffle-dot"
            aria-hidden="true"
            initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-traffic-green"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};

/** Nút Lặp lại (Repeat: off -> all -> one) đổi màu xanh lá khi bật + hiệu ứng xoay/nảy khi click */
export const RepeatControlButton: React.FC<{
  mode: 'off' | 'all' | 'one';
  onClick: () => void;
  size?: 'sm' | 'md';
}> = ({ mode, onClick, size = 'sm' }) => {
  const shouldReduceMotion = useReducedMotion();
  const active = mode !== 'off';
  const pad = size === 'md' ? 'p-2' : 'p-1.5';

  const label =
    mode === 'off'
      ? 'Lặp lại: Tắt (bấm để lặp tất cả)'
      : mode === 'all'
        ? 'Lặp lại: Tất cả (bấm để lặp 1 bài)'
        : 'Lặp lại: 1 bài (bấm để tắt)';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.84 }}
      transition={SPRING_POP}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={`relative ${pad} rounded-pill transition-colors duration-200 cursor-pointer ${
        active
          ? 'text-traffic-green bg-traffic-green/12 hover:bg-traffic-green/20'
          : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-surface-soft/70 dark:hover:bg-white/10'
      }`}
    >
      <motion.span
        key={mode}
        initial={shouldReduceMotion ? false : { scale: 0.78, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : SPRING_POP}
        className="inline-flex items-center justify-center"
      >
        {mode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
      </motion.span>

      <AnimatePresence>
        {active && (
          <motion.span
            key="repeat-dot"
            aria-hidden="true"
            initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-traffic-green"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};
