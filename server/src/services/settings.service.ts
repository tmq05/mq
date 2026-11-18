import { prisma } from '../config/prisma.js';

export interface SystemSettingsState {
  siteName: string;
  maxUploadSizeMB: number;
  allowedAudioFormats: string[];
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export class SettingsService {
  private cache: SystemSettingsState | null = null;
  private cacheExpiresAt = 0;

  async getSettings(): Promise<SystemSettingsState> {
    const now = Date.now();
    if (this.cache && this.cacheExpiresAt > now) {
      return this.cache;
    }

    const rows = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }

    const settings: SystemSettingsState = {
      siteName: map.siteName || 'mq - Âm nhạc tối giản & liền mạch',
      maxUploadSizeMB: parseInt(map.maxUploadSizeMB || '50', 10) || 50,
      allowedAudioFormats: (map.allowedAudioFormats || 'mp3,wav,flac,ogg,m4a')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      registrationEnabled: map.registrationEnabled !== 'false',
      maintenanceMode: map.maintenanceMode === 'true',
      maintenanceMessage:
        map.maintenanceMessage ||
        'Hệ thống đang bảo trì định kỳ để nâng cấp chất lượng âm thanh. Vui lòng quay lại sau ít phút.',
    };

    this.cache = settings;
    this.cacheExpiresAt = now + 10000; // 10s cache
    return settings;
  }

  async updateSettings(data: Partial<SystemSettingsState>): Promise<SystemSettingsState> {
    const entries: Array<{ key: string; value: string; description?: string }> = [];

    if (data.siteName !== undefined) {
      entries.push({ key: 'siteName', value: String(data.siteName).trim() });
    }
    if (data.maxUploadSizeMB !== undefined) {
      const size = Math.max(5, Math.min(500, Number(data.maxUploadSizeMB) || 50));
      entries.push({ key: 'maxUploadSizeMB', value: String(size) });
    }
    if (data.allowedAudioFormats !== undefined) {
      const formats = Array.isArray(data.allowedAudioFormats)
        ? data.allowedAudioFormats.join(',')
        : String(data.allowedAudioFormats);
      entries.push({ key: 'allowedAudioFormats', value: formats });
    }
    if (data.registrationEnabled !== undefined) {
      entries.push({ key: 'registrationEnabled', value: String(Boolean(data.registrationEnabled)) });
    }
    if (data.maintenanceMode !== undefined) {
      entries.push({ key: 'maintenanceMode', value: String(Boolean(data.maintenanceMode)) });
    }
    if (data.maintenanceMessage !== undefined) {
      entries.push({ key: 'maintenanceMessage', value: String(data.maintenanceMessage).trim() });
    }

    for (const entry of entries) {
      await prisma.systemSetting.upsert({
        where: { key: entry.key },
        create: { key: entry.key, value: entry.value },
        update: { value: entry.value },
      });
    }

    this.cache = null; // Invalidate cache
    return this.getSettings();
  }

  async isRegistrationAllowed(): Promise<boolean> {
    const s = await this.getSettings();
    return s.registrationEnabled;
  }

  async isMaintenanceMode(): Promise<boolean> {
    const s = await this.getSettings();
    return s.maintenanceMode;
  }
}

export const settingsService = new SettingsService();
