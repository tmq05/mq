import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store.js';
import { Button } from '../components/common/Button.js';
import { api } from '../api/client.js';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/');
      } else if (mode === 'register') {
        await register(email, password, name);
        navigate('/');
      } else {
        const res = await api.post('/auth/forgot-password', { email });
        setSuccessMsg(res.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Đã có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 max-w-md mx-auto px-4 select-none">
      <div className="text-center mb-8 space-y-2">
        <span className="font-display font-extrabold text-3xl tracking-tight text-ink dark:text-white">
          mq
        </span>
        <h2 className="font-display font-bold text-xl text-ink dark:text-white">
          {mode === 'login'
            ? 'Đăng nhập vào mq'
            : mode === 'register'
            ? 'Tạo tài khoản mới'
            : 'Đặt lại mật khẩu'}
        </h2>
        <p className="text-xs text-body dark:text-mute">
          Trải nghiệm nghe nhạc trực tuyến tối giản và liền mạch
        </p>
      </div>

      <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-5">
        {/* Mode Switcher */}
        {mode !== 'forgot' && (
          <div className="flex rounded-pill bg-surface-soft dark:bg-surface-dark-soft p-1 border border-hairline dark:border-hairline-dark text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-pill transition-colors ${
                mode === 'login'
                  ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                  : 'text-body dark:text-mute'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-pill transition-colors ${
                mode === 'register'
                  ? 'bg-ink dark:bg-white text-white dark:text-black font-semibold'
                  : 'text-body dark:text-mute'
              }`}
            >
              Đăng ký
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-body dark:text-mute mb-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mq.vn"
              className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-body dark:text-mute">
                  Mật khẩu
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                    }}
                    className="text-[11px] text-body dark:text-mute hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white"
              />
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? 'Đang xử lý...'
              : mode === 'login'
              ? 'Đăng nhập'
              : mode === 'register'
              ? 'Đăng ký tài khoản'
              : 'Gửi yêu cầu'}
          </Button>

          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-body dark:text-mute hover:underline"
              >
                Quay lại đăng nhập
              </button>
            </div>
          )}
        </form>

        {/* Demo credentials notice */}
        <div className="pt-3 border-t border-hairline dark:border-hairline-dark text-[11px] font-mono text-mute space-y-1">
          <p>Tài khoản mẫu:</p>
          <p>• Admin: admin@mq.vn / admin123</p>
          <p>• Người dùng: user@mq.vn / user123</p>
        </div>
      </div>
    </div>
  );
};

