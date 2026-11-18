import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary cô lập các khối bổ sung trên trang cá nhân.
 * Nếu khối mới gặp lỗi runtime, trang cá nhân cũ vẫn hoạt động bình thường.
 */
export class ProfileEnhancementBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[ProfileEnhancementBoundary] Đã cô lập lỗi ở khối bổ sung:', error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
