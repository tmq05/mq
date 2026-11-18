import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store.js';
import { Button } from '../components/common/Button.js';
import { api } from '../api/client.js';
import { SegmentedTabs, SegmentedTabContent, useTabDirection } from '../components/layout/SegmentedTabs.js';

const AUTH_MODE_TABS = [
  { id: 'login', label: 'Đăng nhập' },
  { id: 'register', label: 'Đăng ký' },
];

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuthStore();

  const urlMode = searchParams.get('mode');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(
    urlMode === 'register' ? 'register' : urlMode === 'forgot' ? 'forgot' : 'login'
  );
  const authDirection = useTabDirection(AUTH_MODE_TABS, mode);

  useEffect(() => {
    if (urlMode === 'register') {
      setMode('register');
    } else if (urlMode === 'forgot') {
      setMode('forgot');
    } else if (urlMode === 'login') {
      setMode('login');
    }
  }, [urlMode]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  // OTP states for password reset (Gmail only): 3-step flow
  const [otp, setOtp] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password' | 'done'>('email');
  const [countdown, setCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Locked account support states
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const resetFormState = (clearCredentials = true) => {
    setError(null);
    setSuccessMsg(null);
    setIsAccountLocked(false);
    setShowSupportForm(false);
    setSupportMessage('');
    setSupportSuccess(null);
    setOtp('');
    if (clearCredentials) {
      setEmail('');
      setName('');
    }
    setPassword('');
    setConfirmPassword('');
    setForgotStep('email');
    setCountdown(0);
  };

  const handleSendLockedSupport = async () => {
    const trimmedMsg = supportMessage.trim();
    if (trimmedMsg.length < 10) {
      setError('Vui lòng nhập nội dung hỗ trợ ít nhất 10 ký tự.');
      return;
    }
    setError(null);
    setIsSendingSupport(true);
    try {
      const res = await api.post('/auth/locked-support', {
        email: email.trim(),
        message: trimmedMsg,
      });
      setSupportSuccess(
        res.data?.message || 'Đã gửi yêu cầu hỗ trợ tới Admin và Moderator. Vui lòng chờ xét duyệt.'
      );
      setShowSupportForm(false);
      setSupportMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi yêu cầu hỗ trợ.');
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleSendOtp = async () => {
    setError(null);
    setSuccessMsg(null);

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError('Vui lòng nhập địa chỉ Gmail nhận mã OTP');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await api.post('/auth/otp/send', {
        target: targetEmail,
        channel: 'email',
      });

      setForgotStep('otp');
      setCountdown(60);
      setSuccessMsg(res.data.message || 'Mã OTP đã được gửi về Gmail của bạn.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Lỗi gửi mã OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

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
        // Luồng Quên mật khẩu 3 bước tách biệt
        if (forgotStep === 'email') {
          await handleSendOtp();
          setIsSubmitting(false);
          return;
        }

        if (forgotStep === 'otp') {
          if (!otp.trim() || otp.trim().length !== 6) {
            setError('Vui lòng nhập đầy đủ 6 chữ số mã OTP đã gửi về Gmail');
            setIsSubmitting(false);
            return;
          }

          await api.post('/auth/otp/verify', {
            target: email.trim(),
            channel: 'email',
            otp: otp.trim(),
          });

          setPassword('');
          setConfirmPassword('');
          setForgotStep('new_password');
          setSuccessMsg('Xác thực OTP thành công! Vui lòng đặt lại mật khẩu mới.');
          setIsSubmitting(false);
          return;
        }

        if (forgotStep === 'new_password') {
          if (!password || password.length < 6) {
            setError('Mật khẩu mới phải chứa ít nhất 6 ký tự');
            setIsSubmitting(false);
            return;
          }

          if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            setIsSubmitting(false);
            return;
          }

          const res = await api.post('/auth/otp/reset-password', {
            email: email.trim(),
            target: email.trim(),
            channel: 'email',
            otp: otp.trim(),
            newPassword: password,
          });

          setSuccessMsg(res.data.message || 'Mật khẩu đã được cập nhật thành công! Vui lòng đăng nhập.');
          setPassword('');
          setConfirmPassword('');
          setOtp('');
          setForgotStep('done');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đã có lỗi xảy ra';
      const locked = err.response?.data?.code === 'ACCOUNT_LOCKED' || msg.includes('bị khóa');
      setIsAccountLocked(locked);
      setError(msg);
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
            : forgotStep === 'otp'
            ? 'Xác thực mã OTP'
            : forgotStep === 'new_password'
            ? 'Đặt lại mật khẩu mới'
            : 'Đặt lại mật khẩu'}
        </h2>
        <p className="text-xs text-body dark:text-mute">
          {mode === 'login'
            ? 'Trải nghiệm nghe nhạc trực tuyến tối giản và liền mạch'
            : mode === 'register'
            ? 'Tạo tài khoản mới để lưu thư viện và đồng bộ bài hát yêu thích'
            : forgotStep === 'otp'
            ? `Nhập mã 6 chữ số đã gửi về Gmail ${email.trim()}`
            : forgotStep === 'new_password'
            ? `Tạo mật khẩu mới cho tài khoản ${email.trim()}`
            : 'Nhận mã OTP qua Gmail để cập nhật mật khẩu mới'}
        </p>
      </div>

      <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-subtle space-y-5">
        {/* Mode Switcher for Login / Register */}
        {mode !== 'forgot' && (
          <SegmentedTabs
            tabs={AUTH_MODE_TABS}
            activeId={mode}
            fullWidth
            ariaLabel="Chọn chế độ đăng nhập hoặc đăng ký"
            onChange={(id) => {
              setMode(id as 'login' | 'register');
              resetFormState();
            }}
          />
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium space-y-2.5">
            <p>{error}</p>
            {isAccountLocked && !supportSuccess && !showSupportForm && (
              <div className="pt-1 border-t border-red-200/70 dark:border-red-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupportForm(true);
                    setError(null);
                  }}
                  className="font-semibold underline text-red-700 dark:text-red-300 hover:opacity-80 cursor-pointer"
                >
                  Gửi yêu cầu hỗ trợ mở khóa tới Admin / Moderator →
                </button>
              </div>
            )}
          </div>
        )}

        {isAccountLocked && showSupportForm && !supportSuccess && (
          <div className="p-3.5 rounded-xl bg-surface-soft/80 dark:bg-surface-dark-soft/80 border border-hairline dark:border-hairline-dark space-y-2.5 text-ink dark:text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">Yêu cầu hỗ trợ mở khóa tài khoản</span>
              <span className="text-[11px] text-mute truncate">{email.trim()}</span>
            </div>
            <textarea
              rows={3}
              autoFocus
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Trình bày lý do để Admin và Moderator kiểm tra mở khóa tài khoản..."
              className="w-full p-2.5 rounded-xl bg-white dark:bg-surface-dark-card border border-hairline dark:border-hairline-dark text-xs text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSupportForm(false)}
                disabled={isSendingSupport}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSendLockedSupport}
                disabled={isSendingSupport || supportMessage.trim().length < 10}
              >
                {isSendingSupport ? 'Đang gửi...' : 'Gửi yêu cầu hỗ trợ'}
              </Button>
            </div>
          </div>
        )}

        {supportSuccess && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium">
            {supportSuccess}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium space-y-2">
            <p>{successMsg}</p>
            {mode === 'forgot' && forgotStep === 'done' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  resetFormState();
                }}
                className="font-bold underline text-green-800 dark:text-green-200 hover:opacity-80 block cursor-pointer"
              >
                → Đăng nhập ngay với mật khẩu mới
              </button>
            )}
          </div>
        )}

        <SegmentedTabContent
          activeKey={mode === 'forgot' ? `forgot-${forgotStep}` : mode}
          direction={authDirection}
        >
        <form
          key={mode}
          onSubmit={handleSubmit}
          autoComplete={mode === 'register' ? 'off' : 'on'}
          className="space-y-4"
        >
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                name="register-name"
                autoComplete="off"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors"
              />
            </div>
          )}

          {/* Email field (ẩn ở bước nhập mật khẩu mới & bước hoàn tất để trang đặt mật khẩu mới gọn gàng) */}
          {(mode !== 'forgot' || forgotStep === 'email' || forgotStep === 'otp') && (
            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                {mode === 'forgot' ? 'Địa chỉ Gmail của tài khoản' : 'Địa chỉ Email'}
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  name={mode === 'register' ? 'register-email' : 'email'}
                  autoComplete={mode === 'register' ? 'off' : 'email'}
                  required
                  readOnly={mode === 'forgot' && forgotStep === 'otp'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'forgot' ? 'example@gmail.com' : 'example@mq.vn'}
                  className={`w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors ${
                    mode === 'forgot' && forgotStep === 'otp' ? 'pr-28 opacity-80' : ''
                  }`}
                />
                {mode === 'forgot' && forgotStep === 'otp' && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || countdown > 0}
                    className={`absolute right-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                      countdown > 0
                        ? 'bg-transparent text-mute cursor-not-allowed'
                        : 'bg-ink dark:bg-white text-white dark:text-black hover:opacity-90 cursor-pointer'
                    }`}
                  >
                    {isSendingOtp
                      ? 'Đang gửi...'
                      : countdown > 0
                      ? `Gửi lại (${countdown}s)`
                      : 'Gửi lại mã'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bước 2: Nhập mã OTP */}
          {mode === 'forgot' && forgotStep === 'otp' && (
            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                Mã xác thực OTP từ Gmail (6 chữ số)
              </label>
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full h-10 px-4 text-center tracking-[0.4em] font-sans font-bold text-base rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors"
              />
            </div>
          )}

          {/* Password field (Login / Register / Bước 3: Đặt lại mật khẩu mới) */}
          {(mode !== 'forgot' || forgotStep === 'new_password') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-body dark:text-mute">
                  {mode === 'forgot' ? 'Mật khẩu mới' : 'Mật khẩu'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      resetFormState();
                    }}
                    className="text-[11px] text-body dark:text-mute hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <input
                type="password"
                name={mode === 'login' ? 'password' : 'new-password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                autoFocus={mode === 'forgot' && forgotStep === 'new_password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'forgot' ? 'Nhập mật khẩu mới (tối thiểu 6 ký tự)' : '••••••••'}
                minLength={6}
                className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors"
              />
            </div>
          )}

          {/* Bước 3: Xác nhận mật khẩu mới */}
          {mode === 'forgot' && forgotStep === 'new_password' && (
            <div>
              <label className="block text-xs font-medium text-body dark:text-mute mb-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                minLength={6}
                className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:border-ink/60 dark:focus:border-white/70 focus:ring-2 focus:ring-ink/15 dark:focus:ring-white/20 transition-colors"
              />
            </div>
          )}

          {(mode !== 'forgot' || forgotStep !== 'done') && (
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting || (mode === 'forgot' && isSendingOtp)}
            >
              {isSubmitting
                ? 'Đang xử lý...'
                : mode === 'login'
                ? 'Đăng nhập'
                : mode === 'register'
                ? 'Đăng ký tài khoản'
                : forgotStep === 'email'
                ? isSendingOtp
                  ? 'Đang gửi mã...'
                  : 'Nhận mã OTP'
                : forgotStep === 'otp'
                ? 'Xác thực mã OTP'
                : 'Xác nhận đặt lại mật khẩu'}
            </Button>
          )}

          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  resetFormState();
                }}
                className="text-xs text-body dark:text-mute hover:underline cursor-pointer"
              >
                Quay lại đăng nhập
              </button>
            </div>
          )}
        </form>
        </SegmentedTabContent>
      </div>
    </div>
  );
};
