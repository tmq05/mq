import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { usePlayerStore } from '../../stores/player-store.js';
import { BRAND_LOGO_CONFIG, BrandLogoVariant } from './brand-logo.config.js';
import './brand-logo.css';

export interface BrandLogoProps {
  /**
   * 'subtle' (Tinh tế): chỉ chỉnh chữ + chấm xanh phát sáng tĩnh.
   * 'balanced' (Nổi bật vừa phải): thêm hiệu ứng tải trang, nhịp thở, phản hồi phát nhạc và hover.
   */
  variant?: BrandLogoVariant;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = BRAND_LOGO_CONFIG.defaultVariant,
  className = '',
}) => {
  const location = useLocation();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shouldReduceMotion = useReducedMotion();

  const isBalanced = variant === 'balanced' && !shouldReduceMotion;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  return (
    <Link
      to="/"
      onClick={handleClick}
      aria-label="mq - Trang chủ"
      className={`mq-logo shrink-0 ${
        isBalanced ? 'mq-logo--interactive mq-logo--animated' : ''
      } ${isPlaying ? 'mq-logo--playing' : ''} ${className}`}
    >
      <motion.span
        className="mq-logo__wordmark font-display"
        initial={
          isBalanced
            ? { opacity: 0, x: -BRAND_LOGO_CONFIG.enterSlidePx }
            : false
        }
        animate={{ opacity: 1, x: 0 }}
        transition={
          isBalanced
            ? {
                duration: BRAND_LOGO_CONFIG.enterDurationMs / 1000,
                ease: BRAND_LOGO_CONFIG.easing,
              }
            : { duration: 0 }
        }
      >
        {BRAND_LOGO_CONFIG.wordmark}
      </motion.span>

      <motion.span
        aria-hidden="true"
        className="mq-logo__dot-wrap"
        initial={isBalanced ? { opacity: 0, scale: 0.4 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          isBalanced
            ? {
                ...BRAND_LOGO_CONFIG.dotEnterSpring,
                delay: BRAND_LOGO_CONFIG.dotEnterDelayMs / 1000,
              }
            : { duration: 0 }
        }
      >
        <span className="mq-logo__dot-halo" />
        <svg
          viewBox="0 0 10 10"
          className="mq-logo__dot overflow-visible"
          focusable="false"
        >
          <circle cx="5" cy="5" r="5" fill="currentColor" className="text-traffic-green" />
        </svg>
      </motion.span>
    </Link>
  );
};
