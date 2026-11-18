import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { EXPANDABLE_GRID_CONFIG } from './expandable-grid.config.js';
import './expandable-grid.css';

export interface ExpandableExtraGridProps<T> {
  /** ID dùng cho aria-controls */
  id: string;
  /** Trạng thái đang mở rộng hay thu gọn */
  expanded: boolean;
  /** Danh sách các phần tử ẩn cần mở rộng thêm */
  items: T[];
  /** Class CSS của lưới (VD: grid grid-cols-2 ...) */
  gridClassName: string;
  /** Khoảng đệm phía trên nối tiếp với lưới ban đầu (VD: pt-4 hoặc pt-5) */
  topSpacingClass?: string;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function ExpandableExtraGrid<T>({
  id,
  expanded,
  items,
  gridClassName,
  topSpacingClass = 'pt-4',
  keyExtractor,
  renderItem,
}: ExpandableExtraGridProps<T>) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion
          ? 0
          : EXPANDABLE_GRID_CONFIG.staggerDelayMs / 1000,
        delayChildren: shouldReduceMotion ? 0 : 0.04,
      },
    },
    exit: {
      transition: {
        staggerChildren: shouldReduceMotion
          ? 0
          : EXPANDABLE_GRID_CONFIG.staggerReverseDelayMs / 1000,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : EXPANDABLE_GRID_CONFIG.cardSlideY,
      scale: shouldReduceMotion ? 1 : EXPANDABLE_GRID_CONFIG.cardInitialScale,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: shouldReduceMotion
        ? { duration: 0.12 }
        : {
            duration: EXPANDABLE_GRID_CONFIG.durationCardMs / 1000,
            ease: EXPANDABLE_GRID_CONFIG.easing,
          },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : EXPANDABLE_GRID_CONFIG.cardSlideY * 0.7,
      scale: shouldReduceMotion ? 1 : EXPANDABLE_GRID_CONFIG.cardInitialScale,
      transition: shouldReduceMotion
        ? { duration: 0.1 }
        : {
            duration: 0.2,
            ease: EXPANDABLE_GRID_CONFIG.easing,
          },
    },
  };

  return (
    <AnimatePresence initial={false}>
      {expanded && items.length > 0 && (
        <motion.div
          id={id}
          key="extra-grid"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: shouldReduceMotion
              ? { duration: 0.15 }
              : {
                  height: {
                    duration: EXPANDABLE_GRID_CONFIG.durationHeightMs / 1000,
                    ease: EXPANDABLE_GRID_CONFIG.easing,
                  },
                  opacity: { duration: 0.2, ease: 'easeOut' },
                },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: shouldReduceMotion
              ? { duration: 0.12 }
              : {
                  height: {
                    duration: EXPANDABLE_GRID_CONFIG.durationHeightMs / 1000,
                    ease: EXPANDABLE_GRID_CONFIG.easing,
                    delay: Math.min(0.16, (items.length * EXPANDABLE_GRID_CONFIG.staggerReverseDelayMs) / 1000 * 0.45),
                  },
                  opacity: { duration: 0.22, ease: 'easeIn', delay: 0.08 },
                },
          }}
          className="overflow-hidden"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`${topSpacingClass} ${gridClassName}`}
          >
            {items.map((item, idx) => (
              <motion.div
                key={keyExtractor(item, idx)}
                variants={itemVariants}
                className="will-change-transform"
              >
                {renderItem(item, idx)}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface ExpandMoreButtonProps {
  expanded: boolean;
  controlsId: string;
  collapsedLabel: string;
  expandedLabel?: string;
  onToggle: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

export const ExpandMoreButton: React.FC<ExpandMoreButtonProps> = ({
  expanded,
  controlsId,
  collapsedLabel,
  expandedLabel = 'Thu gọn',
  onToggle,
  buttonRef,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      aria-expanded={expanded}
      aria-controls={controlsId}
      onClick={onToggle}
      whileTap={
        shouldReduceMotion
          ? undefined
          : { scale: EXPANDABLE_GRID_CONFIG.buttonPressScale }
      }
      transition={{ duration: 0.14, ease: EXPANDABLE_GRID_CONFIG.easing }}
      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-pill bg-surface-soft dark:bg-surface-dark-soft hover:bg-neutral-200/90 dark:hover:bg-neutral-700/80 text-xs font-semibold text-neutral-800 dark:text-neutral-200 border border-hairline dark:border-hairline-dark shadow-sm hover:shadow transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink dark:focus-visible:ring-white"
    >
      <span className="relative inline-flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={expanded ? 'less' : 'more'}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{
              duration: shouldReduceMotion
                ? 0.05
                : EXPANDABLE_GRID_CONFIG.durationButtonMs / 1000 / 1.5,
              ease: EXPANDABLE_GRID_CONFIG.easing,
            }}
            className="whitespace-nowrap"
          >
            {expanded ? expandedLabel : collapsedLabel}
          </motion.span>
        </AnimatePresence>
      </span>

      <motion.span
        aria-hidden="true"
        animate={{ rotate: expanded ? 180 : 0 }}
        transition={
          shouldReduceMotion
            ? { duration: 0.05 }
            : {
                duration: EXPANDABLE_GRID_CONFIG.durationButtonMs / 1000,
                ease: EXPANDABLE_GRID_CONFIG.easing,
              }
        }
        className="inline-flex items-center justify-center shrink-0"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </motion.span>
    </motion.button>
  );
};
