import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore } from '../../stores/toast-store.js';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-20 right-4 z-[200] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const isSuccess = item.type === 'success';
          const isError = item.type === 'error';

          return (
            <motion.div
              key={item.id}
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              role={isError ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-xl text-xs font-medium ${
                isSuccess
                  ? 'bg-canvas/95 dark:bg-neutral-900/95 border-traffic-green/45 text-ink dark:text-white'
                  : isError
                    ? 'bg-canvas/95 dark:bg-neutral-900/95 border-rose-500/45 text-ink dark:text-white'
                    : 'bg-canvas/95 dark:bg-neutral-900/95 border-hairline dark:border-white/15 text-ink dark:text-white'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-traffic-green shrink-0 mt-0.5" />
              ) : isError ? (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              )}

              <span className="flex-1 leading-relaxed">{item.message}</span>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Đóng thông báo"
                className="p-0.5 rounded-full text-mute hover:text-ink dark:hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
