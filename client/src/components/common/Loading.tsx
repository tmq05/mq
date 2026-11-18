import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { LOADING_CONFIG } from './loading.config.js';
import { Button } from './Button.js';
import './loading.css';

// ============================================================================
// 1. Skeleton Primitives
// ============================================================================
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  circle?: boolean;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  radius,
  circle = false,
  className = '',
}) => {
  const style: React.CSSProperties = {
    width,
    height,
    borderRadius: circle ? '9999px' : radius,
  };

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`mq-skeleton ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
    />
  );
};

// ============================================================================
// 2. Spinner (cho nút bấm, tải thêm, lời bài hát...)
// ============================================================================
export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tone?: 'accent' | 'current';
  label?: string;
  className?: string;
}

const SPINNER_SIZES: Record<NonNullable<SpinnerProps['size']>, string> = {
  xs: 'w-3.5 h-3.5 border-[2px]',
  sm: 'w-4 h-4 border-[2px]',
  md: 'w-6 h-6 border-[2.5px]',
  lg: 'w-8 h-8 border-[3px]',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'sm',
  tone = 'accent',
  label,
  className = '',
}) => {
  return (
    <span
      role="status"
      aria-label={label || 'Đang tải'}
      className={`mq-spinner ${SPINNER_SIZES[size]} ${
        tone === 'current' ? 'mq-spinner--current' : ''
      } ${className}`}
    >
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
};

// ============================================================================
// 3. TopLoadingBar (thanh tiến trình 2-3px dưới header)
// ============================================================================
export const TopLoadingBar: React.FC = () => {
  const location = useLocation();
  const isFetching = useIsFetching();
  const shouldReduceMotion = useReducedMotion();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const startBar = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);

    setVisible(true);
    setProgress(18);

    // Chạy nhanh đến ~80% rồi chậm dần
    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev < 65) return prev + 12;
        if (prev < 82) return prev + 4;
        if (prev < 92) return prev + 0.8;
        return prev;
      });
    }, 140);
  };

  const finishBar = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
  };

  // Kích hoạt nhẹ khi đổi route
  useEffect(() => {
    startBar();
    const done = window.setTimeout(() => {
      if (isFetching === 0) finishBar();
    }, 220);
    return () => window.clearTimeout(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Đồng bộ theo React Query đang fetch
  useEffect(() => {
    if (isFetching > 0) {
      if (!visible) startBar();
    } else if (visible) {
      finishBar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.22 } }}
          className="fixed top-14 left-0 right-0 z-40 h-[2.5px] pointer-events-none overflow-hidden"
        >
          <div
            className="mq-topbar h-full w-full"
            style={{
              transform: `scaleX(${Math.max(0.04, progress / 100)})`,
              transition: shouldReduceMotion
                ? 'none'
                : 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// 4. BlurUpImage (ảnh nền trung tính + hiện dần rõ nét)
// ============================================================================
export interface BlurUpImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

export const BlurUpImage: React.FC<BlurUpImageProps> = ({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  onLoad,
  onError,
  ...rest
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-surface-soft dark:bg-surface-dark-soft ${wrapperClassName}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setLoaded(true);
          onError?.(e);
        }}
        className={`${className} transition-all duration-300 ${
          loaded || shouldReduceMotion
            ? 'opacity-100 blur-0 scale-100'
            : 'opacity-0 blur-[12px] scale-[1.03]'
        }`}
        {...rest}
      />
    </div>
  );
};

// ============================================================================
// 5. LoadingRegion (Delay anti-flash, min display 400ms, 10s timeout + Retry)
// ============================================================================
export interface LoadingRegionProps {
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  skeleton: React.ReactNode;
  loadingLabel?: string;
  errorTitle?: string;
  errorDescription?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoadingRegion: React.FC<LoadingRegionProps> = ({
  isLoading,
  isError = false,
  onRetry,
  skeleton,
  loadingLabel = 'Đang tải dữ liệu...',
  errorTitle = 'Không tải được dữ liệu',
  errorDescription = 'Kết nối bị gián đoạn hoặc phản hồi quá lâu. Vui lòng thử lại.',
  children,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    let delayTimer: number | null = null;
    let minTimer: number | null = null;
    let timeoutTimer: number | null = null;

    if (isLoading && !isError) {
      setTimedOut(false);
      delayTimer = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setShowSkeleton(true);
      }, LOADING_CONFIG.delayShowMs);

      timeoutTimer = window.setTimeout(() => {
        setTimedOut(true);
        setShowSkeleton(false);
      }, LOADING_CONFIG.timeoutMs);
    } else {
      if (showSkeleton && shownAtRef.current) {
        const elapsed = Date.now() - shownAtRef.current;
        const remaining = Math.max(0, LOADING_CONFIG.minDisplayMs - elapsed);
        minTimer = window.setTimeout(() => {
          setShowSkeleton(false);
          shownAtRef.current = null;
        }, remaining);
      } else {
        setShowSkeleton(false);
        shownAtRef.current = null;
      }
    }

    return () => {
      if (delayTimer) window.clearTimeout(delayTimer);
      if (minTimer) window.clearTimeout(minTimer);
      if (timeoutTimer) window.clearTimeout(timeoutTimer);
    };
  }, [isLoading, isError, showSkeleton]);

  const showErrorState = isError || timedOut;
  const activeKey = showErrorState ? 'error' : showSkeleton ? 'skeleton' : isLoading ? 'pending' : 'content';

  return (
    <div
      aria-busy={isLoading && !showErrorState}
      className={className}
    >
      {isLoading && !showErrorState && (
        <div role="status" className="sr-only">
          {loadingLabel}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeKey === 'skeleton' && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: shouldReduceMotion ? 0 : 0.16 } }}
            exit={{
              opacity: 0,
              transition: { duration: shouldReduceMotion ? 0 : LOADING_CONFIG.skeletonFadeOutMs / 1000 },
            }}
          >
            {skeleton}
          </motion.div>
        )}

        {activeKey === 'error' && (
          <motion.div
            key="error"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: LOADING_CONFIG.contentSlidePx }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: shouldReduceMotion ? 0 : 0.25, ease: LOADING_CONFIG.easing },
            }}
            className="py-16 px-4 text-center space-y-3"
          >
            <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-ink dark:text-white">
              {errorTitle}
            </h3>
            <p className="text-xs text-mute max-w-sm mx-auto">{errorDescription}</p>
            {onRetry && (
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setTimedOut(false);
                    onRetry();
                  }}
                  icon={<RotateCw className="w-3.5 h-3.5" />}
                >
                  Thử lại
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {activeKey === 'content' && (
          <motion.div
            key="content"
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: LOADING_CONFIG.contentSlidePx }
            }
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: shouldReduceMotion ? 0 : LOADING_CONFIG.contentFadeInMs / 1000,
                ease: LOADING_CONFIG.easing,
              },
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// 6. Stagger Helper cho nội dung thật sau khi tải xong
// ============================================================================
export const LoadingStaggerItem: React.FC<{
  index?: number;
  children: React.ReactNode;
  className?: string;
}> = ({ index = 0, children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: LOADING_CONFIG.contentSlidePx }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: LOADING_CONFIG.contentFadeInMs / 1000,
              delay: Math.min(index * (LOADING_CONFIG.contentStaggerMs / 1000), 0.32),
              ease: LOADING_CONFIG.easing,
            }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// 7. Các Skeleton mẫu theo từng trang / thành phần
// ============================================================================
export const SongRowSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 6,
  className = '',
}) => {
  const titleWidths = ['72%', '58%', '84%', '64%', '76%', '52%'];
  const artistWidths = ['46%', '38%', '52%', '40%', '48%', '34%'];

  return (
    <div className={`space-y-1.5 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-transparent"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-3.5 rounded-md" width={titleWidths[idx % titleWidths.length]} />
              <Skeleton className="h-2.5 rounded-md" width={artistWidths[idx % artistWidths.length]} />
            </div>
          </div>
          <Skeleton className="w-10 h-3 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{
  count?: number;
  circle?: boolean;
  columnsClassName?: string;
}> = ({
  count = 6,
  circle = false,
  columnsClassName = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4',
}) => {
  const widths = ['85%', '70%', '90%', '62%', '78%', '68%'];
  return (
    <div className={columnsClassName} aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-2.5">
          <Skeleton className={`w-full aspect-square ${circle ? 'rounded-full' : 'rounded-card'}`} />
          <Skeleton className="h-3.5 rounded-md" width={widths[idx % widths.length]} />
          <Skeleton className="h-2.5 rounded-md" width="50%" />
        </div>
      ))}
    </div>
  );
};

export const ArtistSkeleton: React.FC = () => (
  <div className="space-y-10 pb-12" aria-hidden="true">
    {/* Header / Hero giống hệt ArtistDetail */}
    <div className="relative rounded-card border border-hairline dark:border-hairline-dark bg-surface-soft/50 dark:bg-surface-dark-soft/40 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
      <Skeleton circle className="w-32 h-32 md:w-52 md:h-52 shrink-0" />
      <div className="flex-1 w-full space-y-4 text-center md:text-left">
        <Skeleton className="h-3 w-28 mx-auto md:mx-0 rounded-full" />
        <Skeleton className="h-10 md:h-12 w-3/5 mx-auto md:mx-0 rounded-xl" />
        <Skeleton className="h-3.5 w-44 mx-auto md:mx-0 rounded-md" />
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>

    {/* Bài hát nổi bật */}
    <div className="space-y-4">
      <Skeleton className="h-6 w-44 rounded-lg" />
      <SongRowSkeleton count={6} />
    </div>

    {/* Album / Đĩa đơn */}
    <div className="space-y-4">
      <Skeleton className="h-6 w-40 rounded-lg" />
      <CardSkeleton
        count={4}
        columnsClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      />
    </div>
  </div>
);

export const AlbumDetailSkeleton: React.FC = () => (
  <div className="space-y-8 pb-12" aria-hidden="true">
    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 p-6 rounded-card border border-hairline dark:border-hairline-dark bg-surface-soft/40 dark:bg-surface-dark-soft/30">
      <Skeleton className="w-44 h-44 md:w-52 md:h-52 rounded-card shrink-0" />
      <div className="flex-1 w-full space-y-3 text-center md:text-left">
        <Skeleton className="h-3 w-20 mx-auto md:mx-0 rounded-full" />
        <Skeleton className="h-9 w-2/3 mx-auto md:mx-0 rounded-xl" />
        <Skeleton className="h-3.5 w-48 mx-auto md:mx-0 rounded-md" />
        <div className="flex justify-center md:justify-start gap-2.5 pt-2">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
    <SongRowSkeleton count={7} />
  </div>
);

export const GenreDetailSkeleton: React.FC = () => (
  <div className="space-y-8 pb-12" aria-hidden="true">
    <div className="p-6 md:p-8 rounded-card border border-hairline dark:border-hairline-dark bg-surface-soft/40 dark:bg-surface-dark-soft/30 space-y-3">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-10 w-1/2 rounded-xl" />
      <Skeleton className="h-3.5 w-72 rounded-md" />
      <div className="pt-2">
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
    </div>
    <SongRowSkeleton count={8} />
  </div>
);

export const SearchSkeleton: React.FC = () => (
  <div className="space-y-8 pt-2" aria-hidden="true">
    <div className="space-y-3">
      <Skeleton className="h-4 w-28 rounded-md" />
      <CardSkeleton
        count={4}
        circle
        columnsClassName="grid grid-cols-2 sm:grid-cols-4 gap-4"
      />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-32 rounded-md" />
      <SongRowSkeleton count={6} />
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-2 py-2" aria-hidden="true">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl">
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 rounded-md" width={idx % 2 === 0 ? '68%' : '54%'} />
          <Skeleton className="h-2.5 rounded-md" width="38%" />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2.5 p-4" aria-hidden="true">
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-4 py-1.5">
        <Skeleton className="h-3.5 w-8 rounded-md shrink-0" />
        <Skeleton className="h-3.5 flex-1 rounded-md" />
        <Skeleton className="h-3.5 w-28 rounded-md shrink-0" />
        <Skeleton className="h-3.5 w-16 rounded-md shrink-0" />
      </div>
    ))}
  </div>
);
