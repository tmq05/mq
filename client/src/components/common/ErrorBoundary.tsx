import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button.js';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-canvas dark:bg-canvas-dark text-ink dark:text-on-dark flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-card border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-surface-dark-card p-6 shadow-2xl text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display font-bold text-xl text-ink dark:text-white">
                Đã xảy ra sự cố hiển thị
              </h2>
              <p className="text-xs text-body dark:text-mute leading-relaxed">
                Ứng dụng vừa gặp phải lỗi không mong muốn. Dữ liệu và trạng thái của bạn vẫn an toàn.
              </p>
            </div>

            {this.state.error && (
              <details className="text-left bg-black/5 dark:bg-black/40 p-3 rounded-lg border border-hairline dark:border-hairline-dark text-[11px] font-sans text-red-600 dark:text-red-300 overflow-x-auto">
                <summary className="cursor-pointer font-sans font-medium text-mute hover:text-ink dark:hover:text-white select-none">
                  Chi tiết kỹ thuật
                </summary>
                <div className="mt-2 space-y-1">
                  <p className="font-bold">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[10px] text-mute whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={this.handleReload}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Tải lại trang
              </Button>
              <Button
                size="md"
                onClick={this.handleReset}
                icon={<Home className="w-4 h-4" />}
              >
                Về trang chủ
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
