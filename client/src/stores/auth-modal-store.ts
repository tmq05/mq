import { create } from 'zustand';

export type AuthPromptIconType = 'heart' | 'playlist' | 'user' | 'music';

interface OpenAuthModalOptions {
  title?: string;
  message?: string;
  iconType?: AuthPromptIconType;
  redirectUrl?: string;
}

interface AuthModalStore {
  isOpen: boolean;
  title: string;
  message: string;
  iconType: AuthPromptIconType;
  redirectUrl: string;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
}

export const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  title: 'Lưu vào bài hát yêu thích',
  message: 'Đăng nhập vào tài khoản mq để lưu bài hát yêu thích, tạo danh sách phát và đồng bộ trải nghiệm nghe nhạc của bạn.',
  iconType: 'heart',
  redirectUrl: '/auth',
  openAuthModal: (options) =>
    set({
      isOpen: true,
      title: options?.title || 'Lưu vào bài hát yêu thích',
      message:
        options?.message ||
        'Đăng nhập vào tài khoản mq để lưu bài hát yêu thích, tạo danh sách phát và đồng bộ trải nghiệm nghe nhạc của bạn.',
      iconType: options?.iconType || 'heart',
      redirectUrl: options?.redirectUrl || '/auth',
    }),
  closeAuthModal: () => set({ isOpen: false }),
}));

