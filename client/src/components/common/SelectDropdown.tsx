import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { DROPDOWN_CONFIG } from './dropdown.config.js';
import './dropdown.css';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectDropdownProps<T extends string | number = string> {
  options: Array<SelectOption<T>>;
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  menuMinWidth?: number;
}

// Bộ điều phối toàn cục: chỉ một dropdown mở tại một thời điểm
const openListeners = new Set<(openId: string | null) => void>();
function broadcastOpenDropdown(id: string | null) {
  openListeners.forEach((listener) => listener(id));
}

export function SelectDropdown<T extends string | number = string>({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  size = 'sm',
  disabled = false,
  ariaLabel,
  className = '',
  menuMinWidth,
}: SelectDropdownProps<T>) {
  const instanceId = useId();
  const listboxId = `dd-listbox-${instanceId}`;
  const shouldReduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [flashingValue, setFlashingValue] = useState<T | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'bottom' | 'top';
  }>({ top: 0, left: 0, width: 180, placement: 'bottom' });

  const [sheetRect, setSheetRect] = useState<{ top: number; height: number; visible: boolean }>({
    top: 0,
    height: 32,
    visible: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const typeaheadRef = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
    buffer: '',
    timer: null,
  });

  const selectedIndex = useMemo(
    () => options.findIndex((o) => String(o.value) === String(value)),
    [options, value]
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const longestLabel = useMemo(() => {
    let best = placeholder;
    for (const o of options) {
      if (o.label.length > best.length) best = o.label;
    }
    return best;
  }, [options, placeholder]);

  // Đăng ký lắng nghe khi dropdown khác mở -> tự đóng dropdown này
  useEffect(() => {
    const onOtherOpen = (activeId: string | null) => {
      if (activeId !== instanceId && open) {
        setOpen(false);
      }
    };
    openListeners.add(onOtherOpen);
    return () => {
      openListeners.delete(onOtherOpen);
    };
  }, [instanceId, open]);

  // Tính toán vị trí thông minh (tự lật lên trên & chống tràn ngang)
  const updatePosition = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setIsMobile(vw < DROPDOWN_CONFIG.mobileBreakpointPx);

    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(
      DROPDOWN_CONFIG.maxHeightPx + 16,
      Math.max(48, options.length * 36 + 14)
    );
    const panelWidth = Math.max(rect.width, menuMinWidth || 168);

    const spaceBelow = vh - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const placement: 'bottom' | 'top' =
      spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';

    const top =
      placement === 'bottom'
        ? rect.bottom + DROPDOWN_CONFIG.offsetPx
        : rect.top - DROPDOWN_CONFIG.offsetPx;

    let left = rect.left;
    if (left + panelWidth > vw - 12) {
      left = Math.max(12, rect.right - panelWidth);
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left, width: panelWidth, placement });
  }, [options.length, menuMinWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open, updatePosition]);

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Đóng khi nhấn Esc toàn cục
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  // Cập nhật thanh highlight trượt tới mục đang hover / focus
  useLayoutEffect(() => {
    if (!open || highlightedIndex < 0) {
      setSheetRect((prev) => ({ ...prev, visible: false }));
      return;
    }
    const el = itemRefs.current[highlightedIndex];
    if (!el) return;
    setSheetRect({
      top: el.offsetTop,
      height: el.offsetHeight,
      visible: true,
    });
    if (keyboardNav) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [open, highlightedIndex, keyboardNav]);

  const openMenu = useCallback(
    (initialHighlight?: number) => {
      if (disabled) return;
      broadcastOpenDropdown(instanceId);
      setOpen(true);
      const idx =
        initialHighlight !== undefined
          ? initialHighlight
          : selectedIndex >= 0
            ? selectedIndex
            : 0;
      setHighlightedIndex(idx);
    },
    [disabled, instanceId, selectedIndex]
  );

  const handleSelectOption = useCallback(
    (opt: SelectOption<T>) => {
      if (opt.disabled) return;
      setFlashingValue(opt.value);
      onChange(opt.value);
      setTimeout(() => {
        setFlashingValue(null);
        setOpen(false);
        triggerRef.current?.focus();
      }, shouldReduceMotion ? 0 : 95);
    },
    [onChange, shouldReduceMotion]
  );

  // Điều hướng bàn phím + gõ chữ cái nhảy nhanh (Typeahead)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setKeyboardNav(true);
        openMenu(selectedIndex >= 0 ? selectedIndex : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKeyboardNav(true);
        openMenu(options.length - 1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKeyboardNav(true);
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, options.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKeyboardNav(true);
      setHighlightedIndex((prev) => (prev - 1 + options.length) % Math.max(1, options.length));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setKeyboardNav(true);
      setHighlightedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setKeyboardNav(true);
      setHighlightedIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlightedIndex >= 0 && options[highlightedIndex]) {
        handleSelectOption(options[highlightedIndex]);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Typeahead search
      const buf = (typeaheadRef.current.buffer + e.key.toLowerCase()).trim();
      typeaheadRef.current.buffer = buf;
      if (typeaheadRef.current.timer) clearTimeout(typeaheadRef.current.timer);
      typeaheadRef.current.timer = setTimeout(() => {
        typeaheadRef.current.buffer = '';
      }, DROPDOWN_CONFIG.typeaheadTimeoutMs);

      const matchIdx = options.findIndex((o) =>
        o.label.toLowerCase().startsWith(buf)
      );
      if (matchIdx >= 0) {
        setKeyboardNav(true);
        setHighlightedIndex(matchIdx);
      }
    }
  };

  const sizeClasses =
    size === 'xs'
      ? 'h-7 px-2.5 text-[11px] gap-1.5'
      : size === 'sm'
        ? 'h-8 px-3 text-xs gap-2'
        : 'h-9 px-3.5 text-xs sm:text-sm gap-2';

  const activeDescendantId =
    open && highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined;

  const listContent = (
    <div
      ref={listRef}
      className="dd-list"
      style={{ maxHeight: isMobile ? '50vh' : DROPDOWN_CONFIG.maxHeightPx }}
      onPointerLeave={() => {
        if (!keyboardNav) setSheetRect((prev) => ({ ...prev, visible: false }));
      }}
    >
      {/* Thanh highlight trượt mượt kiểu macOS/iOS */}
      <motion.div
        aria-hidden="true"
        className="dd-highlight-sheet"
        initial={false}
        animate={{
          y: sheetRect.top,
          height: sheetRect.height,
          opacity: sheetRect.visible ? 1 : 0,
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.16, ease: DROPDOWN_CONFIG.easing }
        }
      />

      {options.map((opt, idx) => {
        const isSelected = String(opt.value) === String(value);
        const isHighlighted = highlightedIndex === idx;
        const isFlashing = flashingValue !== null && String(flashingValue) === String(opt.value);
        const staggerDelay = shouldReduceMotion
          ? 0
          : Math.min(
              DROPDOWN_CONFIG.maxTotalStaggerMs,
              idx * DROPDOWN_CONFIG.staggerDelayMs
            ) / 1000;

        return (
          <motion.button
            key={String(opt.value)}
            id={`${listboxId}-opt-${idx}`}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={opt.disabled}
            data-selected={isSelected}
            data-highlighted={isHighlighted}
            data-keyboard-focus={keyboardNav && isHighlighted}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{
              opacity: isFlashing ? [1, 0.5, 1] : 1,
              y: 0,
              transition: shouldReduceMotion
                ? { duration: 0.1 }
                : {
                    duration: 0.18,
                    ease: DROPDOWN_CONFIG.easing,
                    delay: isFlashing ? 0 : staggerDelay,
                  },
            }}
            onPointerEnter={() => {
              setKeyboardNav(false);
              setHighlightedIndex(idx);
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectOption(opt);
            }}
            className="dd-item w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="truncate">{opt.label}</span>
            {isSelected && (
              <Check
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: 'var(--dd-accent)' }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <>
      <motion.button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        disabled={disabled}
        whileTap={
          disabled || shouldReduceMotion
            ? undefined
            : { scale: DROPDOWN_CONFIG.pressScale }
        }
        onClick={() => {
          setKeyboardNav(false);
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={handleKeyDown}
        className={`dd-trigger inline-flex items-center justify-between max-w-full font-sans font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses} ${className}`}
      >
        <span className="relative flex-1 min-w-0 text-left overflow-hidden">
          <span
            aria-hidden="true"
            className="block invisible h-0 overflow-hidden whitespace-nowrap select-none pointer-events-none max-w-[240px]"
          >
            {longestLabel}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={selectedOption ? String(selectedOption.value) : 'placeholder'}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
              transition={{
                duration: shouldReduceMotion
                  ? 0.05
                  : DROPDOWN_CONFIG.durationTriggerMs / 1000 / 1.5,
                ease: DROPDOWN_CONFIG.easing,
              }}
              className="block truncate"
              style={{
                color: selectedOption ? undefined : 'var(--dd-trigger-placeholder)',
              }}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </motion.span>
          </AnimatePresence>
        </span>

        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.05 }
              : {
                  duration: DROPDOWN_CONFIG.durationTriggerMs / 1000,
                  ease: DROPDOWN_CONFIG.easing,
                }
          }
          className="inline-flex items-center justify-center shrink-0 opacity-70"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </motion.button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open &&
              (isMobile ? (
                <div key="dd-mobile-portal" className="fixed inset-0 z-[120]">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.18 } }}
                    exit={{ opacity: 0, transition: { duration: 0.14 } }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                    onClick={() => setOpen(false)}
                  />
                  <motion.div
                    ref={panelRef}
                    id={listboxId}
                    role="listbox"
                    aria-label={ariaLabel || placeholder}
                    initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : {
                            y: 0,
                            transition: {
                              duration: DROPDOWN_CONFIG.durationOpenMs / 1000,
                              ease: DROPDOWN_CONFIG.easing,
                            },
                          }
                    }
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : {
                            y: '100%',
                            transition: {
                              duration: DROPDOWN_CONFIG.durationCloseMs / 1000,
                              ease: DROPDOWN_CONFIG.easing,
                            },
                          }
                    }
                    className="dd-panel fixed inset-x-0 bottom-0 z-[121] rounded-t-2xl rounded-b-none p-3 pb-6"
                  >
                    <div className="w-10 h-1 rounded-full bg-neutral-400/40 mx-auto mb-3" />
                    {ariaLabel && (
                      <div className="px-2.5 pb-2 text-xs font-semibold opacity-60">
                        {ariaLabel}
                      </div>
                    )}
                    {listContent}
                  </motion.div>
                </div>
              ) : (
                <motion.div
                  key="dd-desktop-portal"
                  ref={panelRef}
                  id={listboxId}
                  role="listbox"
                  aria-label={ariaLabel || placeholder}
                  style={{
                    position: 'fixed',
                    top: coords.top,
                    left: coords.left,
                    minWidth: coords.width,
                    maxWidth: 'calc(100vw - 24px)',
                    zIndex: 120,
                    transformOrigin:
                      coords.placement === 'bottom' ? 'top center' : 'bottom center',
                    ...(coords.placement === 'top'
                      ? { translateY: '-100%' }
                      : {}),
                  }}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: coords.placement === 'bottom' ? -8 : 8,
                          scale: 0.96,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: shouldReduceMotion
                      ? { duration: 0.12 }
                      : {
                          duration: DROPDOWN_CONFIG.durationOpenMs / 1000,
                          ease: DROPDOWN_CONFIG.easing,
                        },
                  }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: coords.placement === 'bottom' ? -6 : 6,
                          scale: 0.96,
                          transition: {
                            duration: DROPDOWN_CONFIG.durationCloseMs / 1000,
                            ease: DROPDOWN_CONFIG.easing,
                          },
                        }
                  }
                  className="dd-panel"
                >
                  {listContent}
                </motion.div>
              ))}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
