import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpotifyAuthStore } from '../stores/spotify-auth-store.js';
import { Spinner } from '../components/common/Loading.js';

export const SpotifyCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exchangeCode = useSpotifyAuthStore((s) => s.exchangeCode);
  const [statusMessage, setStatusMessage] = useState('Đang hoàn tất kết nối Spotify...');

  useEffect(() => {
    const err = searchParams.get('error');
    const code = searchParams.get('code');

    if (err) {
      setStatusMessage('Bạn đã hủy kết nối Spotify.');
      const t = setTimeout(() => navigate('/', { replace: true }), 1500);
      return () => clearTimeout(t);
    }

    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;
    exchangeCode(code).then((ok) => {
      if (cancelled) return;
      if (ok) {
        setStatusMessage('Kết nối Spotify thành công! Đang quay lại...');
      } else {
        setStatusMessage('Không thể kết nối Spotify. Đang quay lại...');
      }
      setTimeout(() => {
        if (!cancelled) navigate('/', { replace: true });
      }, 1000);
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, exchangeCode, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <Spinner size="lg" label={statusMessage} />
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{statusMessage}</p>
    </div>
  );
};
