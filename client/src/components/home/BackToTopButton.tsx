import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUp } from 'lucide-react';

export const BackToTopButton: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 520);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.94 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          aria-label="Lên đầu trang"
          title="Lên đầu trang"
          className="fixed bottom-[9.25rem] right-3 sm:right-5 z-30 inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-full bg-canvas/95 dark:bg-[#181818]/95 text-ink dark:text-white border border-hairline dark:border-white/15 shadow-lg backdrop-blur-md text-xs font-medium hover:border-traffic-green hover:text-traffic-green transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-traffic-green"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lên đầu trang</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};
