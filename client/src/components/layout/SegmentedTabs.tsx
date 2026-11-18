import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SEGMENTED_NAV_CONFIG } from './segmented-nav.config.js';
import './segmented-nav.css';

export interface SegmentedTabItem {
  id: string;
  label: string;
  to?: string;
  icon?: React.ReactNode;
}

interface TabRect {
  left: number;
  width: number;
}

interface DragState {
  active: boolean;
  startClientX: number;
  startThumbLeft: number;
  currentLeft: number;
  currentWidth: number;
  nearestIndex: number;
}

export interface SegmentedTabsProps {
  tabs: SegmentedTabItem[];
  activeId: string;
  onChange: (id: string, index: number) => void;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeId,
  onChange,
  ariaLabel = 'Điều hướng tab',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const activeIndex = tabs.findIndex((t) => t.id === activeId);
  const labelsSignature = tabs.map((t) => t.label).join('|');

  const trackRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  const didDragRef = useRef(false);

  const [tabRects, setTabRects] = useState<TabRect[]>([]);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const measureTabs = useCallback(() => {
    const rects = tabs.map((_, idx) => {
      const el = tabRefs.current[idx];
      if (!el) return { left: 0, width: 0 };
      return {
        left: el.offsetLeft,
        width: el.offsetWidth,
      };
    });
    setTabRects(rects);
  }, [tabs]);

  useLayoutEffect(() => {
    measureTabs();
  }, [measureTabs, activeId, labelsSignature]);

  useEffect(() => {
    const handleResize = () => measureTabs();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && innerRef.current) {
      ro = new ResizeObserver(() => measureTabs());
      ro.observe(innerRef.current);
      tabRefs.current.forEach((el) => {
        if (el) ro?.observe(el);
      });
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => measureTabs());
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [measureTabs]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const track = trackRef.current;
    const activeEl = tabRefs.current[activeIndex];
    if (!track || !activeEl) return;

    // Chỉ cuộn ngang bên trong track, tuyệt đối không làm cuộn dọc trang
    const elLeft = activeEl.offsetLeft;
    const elRight = elLeft + activeEl.offsetWidth;
    const viewLeft = track.scrollLeft;
    const viewRight = viewLeft + track.clientWidth;

    if (elLeft < viewLeft) {
      track.scrollTo({
        left: Math.max(0, elLeft - 8),
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
    } else if (elRight > viewRight) {
      track.scrollTo({
        left: elRight - track.clientWidth + 8,
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
    }
  }, [activeIndex, shouldReduceMotion]);

  const findNearestTabIndex = useCallback(
    (thumbLeft: number, thumbWidth: number): number => {
      if (tabRects.length === 0) return 0;
      const thumbCenter = thumbLeft + thumbWidth / 2;
      let bestIdx = 0;
      let minDist = Infinity;
      tabRects.forEach((r, idx) => {
        const center = r.left + r.width / 2;
        const dist = Math.abs(thumbCenter - center);
        if (dist < minDist) {
          minDist = dist;
          bestIdx = idx;
        }
      });
      return bestIdx;
    },
    [tabRects]
  );

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    didDragRef.current = false;
    setPressedIndex(index);

    const startRect =
      activeIndex >= 0 && tabRects[activeIndex]
        ? tabRects[activeIndex]
        : tabRects[index] || { left: 0, width: 0 };

    const startClientX = e.clientX;
    const innerWidth = innerRef.current?.scrollWidth || 0;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      if (!didDragRef.current && Math.abs(deltaX) > SEGMENTED_NAV_CONFIG.dragThresholdPx) {
        didDragRef.current = true;
      }
      if (!didDragRef.current) return;

      const maxLeft = Math.max(0, innerWidth - startRect.width);
      const rawLeft = startRect.left + deltaX;
      const clampedLeft = Math.max(0, Math.min(maxLeft, rawLeft));
      const nearestIdx = findNearestTabIndex(clampedLeft, startRect.width);
      const targetWidth = tabRects[nearestIdx]?.width || startRect.width;

      setDragState({
        active: true,
        startClientX,
        startThumbLeft: startRect.left,
        currentLeft: clampedLeft,
        currentWidth: targetWidth,
        nearestIndex: nearestIdx,
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      setPressedIndex(null);

      if (didDragRef.current) {
        const deltaX = upEvent.clientX - startClientX;
        const maxLeft = Math.max(0, innerWidth - startRect.width);
        const clampedLeft = Math.max(0, Math.min(maxLeft, startRect.left + deltaX));
        const snapIndex = findNearestTabIndex(clampedLeft, startRect.width);
        setDragState(null);

        if (snapIndex >= 0 && tabs[snapIndex]) {
          if (snapIndex !== activeIndex) {
            onChange(tabs[snapIndex].id, snapIndex);
          }
          tabRefs.current[snapIndex]?.focus({ preventScroll: true });
        }
        setTimeout(() => {
          didDragRef.current = false;
        }, 50);
      } else {
        setDragState(null);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let targetIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      targetIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = tabs.length - 1;
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(tabs[currentIndex].id, currentIndex);
      return;
    }

    if (targetIndex !== null) {
      e.preventDefault();
      tabRefs.current[targetIndex]?.focus();
      onChange(tabs[targetIndex].id, targetIndex);
    }
  };

  const displayIndex = dragState?.active ? dragState.nearestIndex : activeIndex;
  const activeRect = activeIndex >= 0 ? tabRects[activeIndex] : undefined;
  const thumbLeft = dragState?.active ? dragState.currentLeft : (activeRect?.left ?? 0);
  const thumbWidth = dragState?.active ? dragState.currentWidth : (activeRect?.width ?? 0);
  const showThumb = (dragState?.active || activeIndex >= 0) && thumbWidth > 0;
  const isPressing = pressedIndex !== null;

  return (
    <nav
      ref={trackRef}
      className={`seg-nav ${size === 'sm' ? 'seg-nav--sm' : ''} ${fullWidth ? 'w-full' : ''} ${className}`}
      aria-label={ariaLabel}
    >
      <div
        ref={innerRef}
        role="tablist"
        aria-label={ariaLabel}
        className={`seg-nav__inner ${fullWidth ? 'w-full' : ''}`}
      >
        <motion.div
          aria-hidden="true"
          className="seg-nav__thumb"
          style={size === 'sm' ? { height: '26px' } : undefined}
          initial={false}
          animate={{
            x: thumbLeft,
            width: thumbWidth,
            opacity: showThumb ? 1 : 0,
            scale: !shouldReduceMotion && isPressing ? SEGMENTED_NAV_CONFIG.pressScale : 1,
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : dragState?.active
                ? {
                    x: { duration: 0 },
                    width: { duration: 0.2, ease: SEGMENTED_NAV_CONFIG.iosEasing },
                    scale: { duration: 0.14, ease: SEGMENTED_NAV_CONFIG.iosEasing },
                    opacity: { duration: 0.15 },
                  }
                : {
                    x: SEGMENTED_NAV_CONFIG.spring,
                    width: SEGMENTED_NAV_CONFIG.spring,
                    scale: { duration: 0.18, ease: SEGMENTED_NAV_CONFIG.iosEasing },
                    opacity: { duration: 0.2 },
                  }
          }
        />

        {tabs.map((tab, index) => {
          const isSelected = displayIndex === index;
          const isBeingPressed = !shouldReduceMotion && pressedIndex === index;
          const commonProps = {
            ref: (el: HTMLElement | null) => {
              tabRefs.current[index] = el;
            },
            role: 'tab' as const,
            'aria-selected': isSelected,
            tabIndex: activeIndex === index || (activeIndex < 0 && index === 0) ? 0 : -1,
            onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, index),
            onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
            className: `seg-nav__tab ${fullWidth ? 'flex-1' : ''}`,
            style: {
              transform: isBeingPressed ? `scale(${SEGMENTED_NAV_CONFIG.pressScale})` : 'scale(1)',
            },
          };

          const labelContent = (
            <span className="inline-flex items-center gap-1.5">
              {tab.icon && <span className="shrink-0 flex items-center">{tab.icon}</span>}
              <span className="seg-nav__tab-label" data-text={tab.label}>
                {tab.label}
              </span>
            </span>
          );

          if (tab.to) {
            return (
              <Link
                key={tab.id}
                to={tab.to}
                draggable={false}
                onClick={(e) => {
                  if (didDragRef.current) {
                    e.preventDefault();
                  }
                }}
                {...commonProps}
              >
                {labelContent}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (!didDragRef.current && tab.id !== activeId) {
                  onChange(tab.id, index);
                }
              }}
              {...commonProps}
            >
              {labelContent}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/**
 * Hook tính hướng chuyển động (+1 nếu tab mới bên phải, -1 nếu bên trái, 0 nếu giữ nguyên)
 */
export function useTabDirection(tabs: Array<{ id: string }>, activeId: string): number {
  const currentIdx = tabs.findIndex((t) => t.id === activeId);
  const prevIdxRef = useRef<number>(currentIdx);
  const direction =
    currentIdx !== -1 &&
    prevIdxRef.current !== -1 &&
    currentIdx !== prevIdxRef.current
      ? currentIdx > prevIdxRef.current
        ? 1
        : -1
      : 0;

  useEffect(() => {
    prevIdxRef.current = currentIdx;
  }, [currentIdx]);

  return direction;
}

/**
 * Wrapper chuyển nội dung theo hướng tab (fade + slide nhẹ ~260ms, hỗ trợ prefers-reduced-motion)
 */
export const SegmentedTabContent: React.FC<{
  activeKey: string;
  direction: number;
  children: React.ReactNode;
  className?: string;
}> = ({ activeKey, direction, children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`overflow-x-clip ${className}`}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={activeKey}
          custom={direction}
          initial={{
            opacity: shouldReduceMotion ? 1 : 0,
            x:
              shouldReduceMotion || direction === 0
                ? 0
                : direction * SEGMENTED_NAV_CONFIG.contentSlidePx,
          }}
          animate={{
            opacity: 1,
            x: 0,
            transition: shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: SEGMENTED_NAV_CONFIG.durationContentMs / 1000,
                  ease: SEGMENTED_NAV_CONFIG.iosEasing,
                },
          }}
          exit={{
            opacity: shouldReduceMotion ? 1 : 0,
            x:
              shouldReduceMotion || direction === 0
                ? 0
                : -direction * SEGMENTED_NAV_CONFIG.contentSlidePx,
            transition: shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: 0.14,
                  ease: SEGMENTED_NAV_CONFIG.iosEasing,
                },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
