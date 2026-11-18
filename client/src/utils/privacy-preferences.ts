export const GUEST_SAVE_HISTORY_KEY = 'mq_guest_save_listening_history_v1';

export function getSaveListeningHistorySetting(userId?: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (userId) {
      const raw = window.localStorage.getItem(`mq_user_preferences_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.saveListeningHistory === 'boolean') {
          return parsed.saveListeningHistory;
        }
      }
      return true;
    }
    const guestRaw = window.localStorage.getItem(GUEST_SAVE_HISTORY_KEY);
    return guestRaw === null ? true : guestRaw === 'true';
  } catch {
    return true;
  }
}
