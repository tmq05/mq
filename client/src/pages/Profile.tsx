import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth-store.js';
import { Button } from '../components/common/Button.js';
import { api } from '../api/client.js';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.patch('/auth/profile', { name, avatarUrl });
      updateUser(res.data);
      setStatusMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi cập nhật hồ sơ' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6 select-none">
      <div className="border-b border-hairline dark:border-hairline-dark pb-4">
        <h1 className="font-display font-extrabold text-2xl text-ink dark:text-white">
          Hồ sơ người dùng
        </h1>
        <p className="text-xs text-body dark:text-mute">
          Quản lý thông tin tài khoản và hiển thị trên mq
        </p>
      </div>

      <div className="p-6 rounded-card border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card space-y-6">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark">
            <img
              src={
                avatarUrl ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              }
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink dark:text-white">{user.name}</h3>
            <span className="text-xs text-mute font-sans">{user.email}</span>
            <div className="mt-1">
              <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-pill bg-neutral-100 dark:bg-neutral-800 text-charcoal dark:text-mute">
                Vai trò: {user.role}
              </span>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-lg text-xs font-medium ${
              statusMsg.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-body dark:text-mute mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-body dark:text-mute mb-1">
              URL Ảnh đại diện
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full h-10 px-4 rounded-pill bg-surface-soft dark:bg-surface-dark-soft border border-hairline dark:border-hairline-dark text-sm text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" size="md" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

