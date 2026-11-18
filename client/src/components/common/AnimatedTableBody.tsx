import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface AnimatedTableBodyProps {
  transitionKey: string;
  className?: string;
  children: React.ReactNode;
}

export const AnimatedTableBody: React.FC<AnimatedTableBodyProps> = ({
  transitionKey,
  className = '',
  children,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.tbody
        key={transitionKey}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={{
          duration: shouldReduceMotion ? 0.1 : 0.18,
          ease: [0.32, 0.72, 0, 1],
        }}
        className={className}
      >
        {children}
      </motion.tbody>
    </AnimatePresence>
  );
};
