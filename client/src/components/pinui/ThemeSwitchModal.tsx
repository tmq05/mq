import React from 'react';
import { X } from 'lucide-react';
import { useThemeStore } from '../../stores/theme-store.js';
import { ThemeSwitch } from './ThemeSwitch.js';
import { Modal } from '../common/Modal.js';

interface ThemeSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSwitchModal: React.FC<ThemeSwitchModalProps> = ({ isOpen, onClose }) => {
  const { isDark, setTheme, effect, setEffect, sound } = useThemeStore();

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      hideHeader
      className="h-[240px] sm:h-[260px]"
      bodyClassName="p-0 relative h-full select-none overflow-hidden"
    >
      <button
        type="button"
        onClick={onClose}
        className="mq-modal-close-btn absolute top-3 right-3 z-20 p-1.5 rounded-full text-mute/60 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Đóng"
      >
        <X className="w-4 h-4" />
      </button>

      <ThemeSwitch
        theme={isDark ? 'dark' : 'light'}
        onThemeChange={(next) => setTheme(next === 'dark')}
        defaultEffect={effect}
        onEffectChange={(newEffect) => setEffect(newEffect)}
        sound={sound}
        fill={true}
      />
    </Modal>
  );
};
