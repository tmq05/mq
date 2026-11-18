import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthModalStore } from '../src/stores/auth-modal-store.js';

describe('AuthModalStore', () => {
  beforeEach(() => {
    useAuthModalStore.getState().closeAuthModal();
  });

  it('should be closed by default', () => {
    expect(useAuthModalStore.getState().isOpen).toBe(false);
  });

  it('should open modal with default parameters', () => {
    useAuthModalStore.getState().openAuthModal();
    const state = useAuthModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe('Lưu vào bài hát yêu thích');
    expect(state.iconType).toBe('heart');
  });

  it('should open modal with custom parameters', () => {
    useAuthModalStore.getState().openAuthModal({
      title: 'Theo dõi nghệ sĩ',
      message: 'Đăng nhập để theo dõi nghệ sĩ này.',
      iconType: 'user',
      redirectUrl: '/auth',
    });
    const state = useAuthModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe('Theo dõi nghệ sĩ');
    expect(state.message).toBe('Đăng nhập để theo dõi nghệ sĩ này.');
    expect(state.iconType).toBe('user');
  });

  it('should close modal', () => {
    useAuthModalStore.getState().openAuthModal();
    expect(useAuthModalStore.getState().isOpen).toBe(true);
    useAuthModalStore.getState().closeAuthModal();
    expect(useAuthModalStore.getState().isOpen).toBe(false);
  });
});

