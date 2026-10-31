import { create } from 'zustand';
import { UnifiedTrack } from '../types/index.js';

interface PlaylistModalStore {
  isOpen: boolean;
  selectedTrack: UnifiedTrack | null;
  openModal: (track: UnifiedTrack) => void;
  closeModal: () => void;
}

export const usePlaylistModalStore = create<PlaylistModalStore>((set) => ({
  isOpen: false,
  selectedTrack: null,
  openModal: (track) => set({ isOpen: true, selectedTrack: track }),
  closeModal: () => set({ isOpen: false, selectedTrack: null }),
}));

