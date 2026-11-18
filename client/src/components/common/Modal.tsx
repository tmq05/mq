import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { X } from 'lucide-react';
import { MODAL_CONFIG } from './modal.config.js';
import './modal.css';

// ============================================================================
// Global Modal Stack & Scroll Lock Coordinator
// ============================================================================
let modalStack: string[] = [];
const stackListeners = new Set<() => void>();
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';
let lastPointerPoint: { x: number; y: number; time: number } | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastPointerPoint = { x: e.clientX, y: e.clientY, time: Date.now() };
    },
    { capture: true, passive: true }
  );
}

function notifyStack() {
  stackListeners.forEach((cb) => cb());
}

function pushModalToStack(id: string) {
  if (!modalStack.includes(id)) {
    const wasEmpty = modalStack.length === 0;
    modalStack = [...modalStack, id];
    if (wasEmpty && typeof document !== 'undefined') {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      savedBodyOverflow = document.body.style.overflow;
      savedBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    notifyStack();
  }
}

function removeModalFromStack(id: string) {
  if (modalStack.includes(id)) {
    modalStack = modalStack.filter((item) => item !== id);
    if (modalStack.length === 0 && typeof document !== 'undefined') {
      document.body.style.overflow = savedBodyOverflow;
      document.body.style.paddingRight = savedBodyPaddingRight;
    }
    notifyStack();
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
    (el) => el.offsetParent !== null || el.getAttribute('role') === 'dialog'
  );
}

// ============================================================================
// Modal Component
// ============================================================================
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  hideHeader?: boolean;
  shakeKey?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  closeOnOverlayClick = true,
  hideHeader = false,
  shakeKey = 0,
  footer,
  children,
  className = '',
  bodyClassName = '',
}) => {
  const modalId = useId();
  const titleId = `mq-modal-title-${modalId}`;
  const shouldReduceMotion = useReducedMotion();

  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [stackSnapshot, setStackSnapshot] = useState<string[]>(modalStack);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MODAL_CONFIG.mobileBreakpointPx : false
  );
  const [transformOrigin, setTransformOrigin] = useState<string>('center center');
  const [isShaking, setIsShaking] = useState(false);

  // Theo dõi modal stack (hỗ trợ modal lồng nhau)
  useEffect(() => {
    const sync = () => setStackSnapshot([...modalStack]);
    stackListeners.add(sync);
    return () => {
      stackListeners.delete(sync);
    };
  }, []);

  // Đăng ký / gỡ khỏi stack khi open thay đổi
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      pushModalToStack(modalId);

      // Tính transform-origin gần vị trí nút bấm vừa click (nếu vừa click trong vòng 350ms)
      if (
        lastPointerPoint &&
        Date.now() - lastPointerPoint.time < 350 &&
        typeof window !== 'undefined'
      ) {
        const xPct = Math.max(20, Math.min(80, (lastPointerPoint.x / window.innerWidth) * 100));
        const yPct = Math.max(20, Math.min(80, (lastPointerPoint.y / window.innerHeight) * 100));
        setTransformOrigin(`${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`);
      } else {
        setTransformOrigin('center center');
      }

      return () => {
        removeModalFromStack(modalId);
      };
    } else {
      removeModalFromStack(modalId);
    }
  }, [open, modalId]);

  // Trả lại focus khi đóng
  useEffect(() => {
    if (!open && previousFocusRef.current) {
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      requestAnimationFrame(() => {
        if (document.body.contains(prev)) {
          prev.focus({ preventScroll: true });
        }
      });
    }
  }, [open]);

  // Theo dõi breakpoint mobile
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < MODAL_CONFIG.mobileBreakpointPx);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const stackIndex = stackSnapshot.indexOf(modalId);
  const isTopModal = stackIndex !== -1 && stackIndex === stackSnapshot.length - 1;
  const isUnderneath = stackIndex !== -1 && stackIndex < stackSnapshot.length - 1;
  const zIndex = 110 + Math.max(0, stackIndex) * 10;

  // Focus vào modal khi mở & Focus Trap (Tab / Shift+Tab) + Escape để đóng
  useEffect(() => {
    if (!open || !isTopModal) return;

    const focusTimer = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      if (!panel.contains(document.activeElement)) {
        const focusables = getFocusableElements(panel);
        const firstInput = focusables.find((el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        if (firstInput) {
          firstInput.focus({ preventScroll: true });
        } else if (focusables.length > 0) {
          focusables[0].focus({ preventScroll: true });
        } else {
          panel.focus({ preventScroll: true });
        }
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = getFocusableElements(panelRef.current);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !panelRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !panelRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, isTopModal, onClose]);

  // Rung ngang khi có lỗi (shakeKey tăng)
  useEffect(() => {
    if (!shakeKey || shouldReduceMotion) return;
    setIsShaking(true);
    const t = setTimeout(() => setIsShaking(false), 380);
    return () => clearTimeout(t);
  }, [shakeKey, shouldReduceMotion]);

  const handleMobileDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > MODAL_CONFIG.swipeCloseThresholdPx || info.velocity.y > 420) {
      onClose();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="mq-modal-root"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{
            duration: shouldReduceMotion
              ? 0.1
              : Math.max(MODAL_CONFIG.durationOverlayCloseMs, MODAL_CONFIG.durationPanelCloseMs) / 1000,
          }}
          className={`fixed inset-0 flex ${
            isMobile ? 'items-end justify-center p-0' : 'items-center justify-center p-4 sm:p-6'
          } select-none`}
          style={{ zIndex }}
        >
          {/* Lớp phủ Overlay làm tối & mờ nền */}
          <motion.div
            aria-hidden="true"
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, backdropFilter: 'blur(0px)' }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    backdropFilter: 'blur(var(--modal-blur, 8px))',
                    transition: {
                      duration: MODAL_CONFIG.durationOverlayOpenMs / 1000,
                      ease: 'easeOut',
                    },
                  }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : {
                    opacity: 0,
                    backdropFilter: 'blur(0px)',
                    transition: {
                      duration: MODAL_CONFIG.durationOverlayCloseMs / 1000,
                      ease: 'easeIn',
                    },
                  }
            }
            onClick={() => {
              if (closeOnOverlayClick && isTopModal) {
                onClose();
              }
            }}
            className="mq-modal-overlay fixed inset-0"
          />

          {/* Khung Modal (Desktop: center spring | Mobile: bottom sheet kéo xuống để đóng) */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            drag={isMobile && !shouldReduceMotion ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={isMobile ? handleMobileDragEnd : undefined}
            style={{ transformOrigin }}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : isMobile
                  ? { y: '100%', opacity: 0.8 }
                  : { opacity: 0, scale: 0.94, y: 16 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : isMobile
                  ? {
                      y: 0,
                      opacity: 1,
                      scale: isUnderneath ? MODAL_CONFIG.nestedScale : 1,
                      filter: isUnderneath ? 'brightness(0.75)' : 'brightness(1)',
                      transition: {
                        duration: MODAL_CONFIG.durationPanelOpenMs / 1000,
                        ease: MODAL_CONFIG.easing,
                      },
                    }
                  : {
                      opacity: 1,
                      scale: isUnderneath ? MODAL_CONFIG.nestedScale : 1,
                      y: 0,
                      x: isShaking ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
                      filter: isUnderneath ? 'brightness(0.75)' : 'brightness(1)',
                      transition: isShaking
                        ? { duration: 0.36, ease: 'easeInOut' }
                        : MODAL_CONFIG.spring,
                    }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : isMobile
                  ? {
                      y: '100%',
                      opacity: 0,
                      transition: {
                        duration: MODAL_CONFIG.durationPanelCloseMs / 1000,
                        ease: MODAL_CONFIG.easing,
                      },
                    }
                  : {
                      opacity: 0,
                      scale: 0.93,
                      y: 14,
                      transition: {
                        duration: MODAL_CONFIG.durationPanelCloseMs / 1000,
                        ease: MODAL_CONFIG.easing,
                      },
                    }
            }
            onClick={(e) => e.stopPropagation()}
            className={`mq-modal-panel relative z-10 w-full ${
              isMobile
                ? 'max-w-full rounded-t-2xl rounded-b-none max-h-[90vh]'
                : `${SIZE_CLASSES[size]} max-h-[88vh]`
            } overflow-hidden flex flex-col outline-none will-change-transform ${className}`}
          >
            {/* Drag Handle trên Mobile Bottom Sheet */}
            {isMobile && (
              <div className="pt-2.5 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing">
                <span className="w-10 h-1 rounded-full bg-neutral-400/40" />
              </div>
            )}

            {/* Header */}
            {!hideHeader && (title || icon) && (
              <div className="px-5 py-4 border-b border-hairline dark:border-hairline-dark flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {icon && <span className="shrink-0 flex items-center">{icon}</span>}
                  <div className="min-w-0">
                    {title && (
                      <h3
                        id={titleId}
                        className="font-display font-bold text-base text-ink dark:text-white truncate"
                      >
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <p className="text-xs text-mute truncate mt-0.5">{subtitle}</p>
                    )}
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={shouldReduceMotion ? undefined : { rotate: 90 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                  transition={{ duration: 0.18, ease: MODAL_CONFIG.easing }}
                  className="p-1.5 rounded-pill hover:bg-surface-soft dark:hover:bg-surface-dark-soft text-mute hover:text-ink dark:hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Đóng hộp thoại"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            )}

            {/* Body */}
            <div className={`mq-modal-body overflow-y-auto flex-auto min-h-0 ${bodyClassName}`}>
              {children}
            </div>

            {/* Footer (nếu có) */}
            {footer && (
              <div className="px-5 py-3.5 border-t border-hairline dark:border-hairline-dark bg-surface-soft/30 dark:bg-surface-dark-soft/30 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================================================
// Stagger & Step Animation Helpers dùng trong Modal
// ============================================================================
export const ModalSection: React.FC<{
  index?: number;
  children: React.ReactNode;
  className?: string;
}> = ({ index = 0, children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();
  const delay = shouldReduceMotion
    ? 0
    : (MODAL_CONFIG.staggerInitialDelayMs + index * MODAL_CONFIG.staggerDelayMs) / 1000;

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: shouldReduceMotion
          ? { duration: 0.1 }
          : { duration: 0.22, ease: MODAL_CONFIG.easing, delay },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const ModalListItem: React.FC<{
  index: number;
  children: React.ReactNode;
  className?: string;
}> = ({ index, children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();
  const cappedIdx = Math.min(index, 10);
  const delay = shouldReduceMotion
    ? 0
    : (MODAL_CONFIG.staggerInitialDelayMs + 60 + cappedIdx * MODAL_CONFIG.staggerListDelayMs) / 1000;

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: shouldReduceMotion
          ? { duration: 0.1 }
          : { duration: 0.2, ease: MODAL_CONFIG.easing, delay },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const ModalStepContent: React.FC<{
  stepKey: string;
  children: React.ReactNode;
  className?: string;
}> = ({ stepKey, children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div layout={!shouldReduceMotion} className={`overflow-hidden ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stepKey}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: {
              duration: shouldReduceMotion ? 0.08 : 0.2,
              ease: MODAL_CONFIG.easing,
            },
          }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -6, transition: { duration: 0.14 } }
          }
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
