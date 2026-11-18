import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { PROFILE_ENHANCEMENTS_CONFIG } from '../../config/profile-enhancements.config.js';

export interface ProfileInsightsData {
  joinedAt: string | null;
  totalPlays: number;
  streakDays: number;
  topArtist: { name: string; count: number } | null;
  topGenre: string | null;
  inferredGenres: string[];
  topArtists?: Array<{ name: string; count: number }>;
  topGenres?: Array<{ name: string; count: number }>;
  recentActiveDays?: Array<{ date: string; label: string; active: boolean; plays: number }>;
  recentActivities?: Array<{
    id: string;
    type: 'like' | 'playlist' | 'follow' | 'play';
    title: string;
    subtitle?: string;
    timestamp: string;
  }>;
  monthlyHighlights?: {
    monthLabel: string;
    topSongs: Array<{
      id: string;
      title: string;
      artists: string[];
      coverUrl?: string | null;
      count: number;
    }>;
    topArtists: Array<{ name: string; count: number }>;
  };
  weeklyChart: Array<{ label: string; minutes: number }>;
  monthlyChart: Array<{ label: string; minutes: number }>;
}

export function useProfileInsights(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !PROFILE_ENHANCEMENTS_CONFIG.enabled) return;

    const handlePlayRecorded = () => {
      queryClient.invalidateQueries({ queryKey: ['profile-insights', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile-history', userId] });
    };

    window.addEventListener('mq:play-recorded', handlePlayRecorded);
    return () => {
      window.removeEventListener('mq:play-recorded', handlePlayRecorded);
    };
  }, [userId, queryClient]);

  return useQuery<ProfileInsightsData>({
    queryKey: ['profile-insights', userId],
    queryFn: async () => {
      const res = await api.get('/users/insights');
      return res.data as ProfileInsightsData;
    },
    enabled: Boolean(userId) && PROFILE_ENHANCEMENTS_CONFIG.enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
