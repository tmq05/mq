import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ListMusic, Users, Music, X, Sparkles } from 'lucide-react';
import { useAuthModalStore, AuthPromptIconType } from '../../stores/auth-modal-store.js';
import { Button } from './Button.js';
import { Modal, ModalSection } from './Modal.js';

export const AuthPromptModal: React.FC = () => {
  const navigate = useNavigate();
  const { isOpen, title, message, iconType, redirectUrl, closeAuthModal } = useAuthModalStore();

  const handleLoginClick = () => {
    closeAuthModal();
    navigate(redirectUrl || '/auth');
  };

  const handleRegisterClick = () => {
    closeAuthModal();
    navigate('/auth?mode=register');
  };

  const renderIcon = (type: AuthPromptIconType) => {
    switch (type) {
      case 'user':
        return (
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
            <Users className="w-7 h-7" />
          </div>
        );
      case 'playlist':
        return (
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <ListMusic className="w-7 h-7" />
          </div>
        );
      case 'music':
        return (
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            <Music className="w-7 h-7" />
          </div>
        );
      case 'heart':
      default:
        return (
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-500 flex items-center justify-center shadow-inner">
            <Heart className="w-7 h-7 fill-red-500 text-red-500 animate-pulse" />
          </div>
        );
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={closeAuthModal}
      size="sm"
      hideHeader
      bodyClassName="p-6 sm:p-7 text-center space-y-4 select-none relative"
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={closeAuthModal}
        className="mq-modal-close-btn absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        aria-label="Đóng"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Dynamic Icon */}
      <ModalSection index={0} className="pt-2">
        {renderIcon(iconType)}
      </ModalSection>

      {/* Text Details */}
      <ModalSection index={1} className="space-y-1.5">
        <h3 className="font-display font-bold text-lg sm:text-xl text-neutral-900 dark:text-white leading-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed px-2">
          {message}
        </p>
      </ModalSection>

      {/* Feature badge */}
      <ModalSection index={2}>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 text-[11px] font-sans font-medium text-neutral-600 dark:text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Đồng bộ thư viện • Nghe nhạc liền mạch</span>
        </div>
      </ModalSection>

      {/* Action Buttons */}
      <ModalSection index={3} className="pt-2 space-y-2">
        <Button
          size="md"
          onClick={handleLoginClick}
          className="w-full justify-center text-sm font-semibold shadow-md"
        >
          Đăng nhập ngay
        </Button>

        <div className="flex items-center justify-center gap-3 pt-1 text-xs text-neutral-500 dark:text-neutral-400 font-sans">
          <span>Chưa có tài khoản?</span>
          <button
            type="button"
            onClick={handleRegisterClick}
            className="font-semibold text-neutral-900 dark:text-white hover:underline cursor-pointer"
          >
            Đăng ký miễn phí
          </button>
        </div>

        <button
          type="button"
          onClick={closeAuthModal}
          className="text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors pt-1 cursor-pointer"
        >
          Để sau
        </button>
      </ModalSection>
    </Modal>
  );
};

