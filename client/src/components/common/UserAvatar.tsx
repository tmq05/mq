import React, { useState } from 'react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  onClick?: () => void;
}

const GRADIENTS = [
  'from-emerald-500 to-teal-700',
  'from-indigo-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-violet-700',
  'from-cyan-500 to-blue-700',
];

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'MQ';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name?: string): string {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base font-semibold',
  xl: 'w-20 h-20 text-xl font-bold',
  '2xl': 'w-24 h-24 text-2xl font-bold',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = '',
  avatarUrl,
  size = 'md',
  className = '',
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);

  const initials = getInitials(name);
  const gradient = getGradient(name);
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;

  const showImage = Boolean(avatarUrl) && !hasError;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-full overflow-hidden shrink-0 select-none flex items-center justify-center border border-hairline dark:border-hairline-dark ${sizeClasses} ${className}`}
    >
      {showImage ? (
        <img
          src={avatarUrl as string}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient} text-white tracking-wider`}
        >
          <span>{initials}</span>
        </div>
      )}
    </div>
  );
};
