import { MusicProvider, MusicSource } from './music-provider.interface.js';
import { localProvider } from './local.provider.js';
import { audiusProvider } from './audius.provider.js';
import { jamendoProvider } from './jamendo.provider.js';
import { deezerProvider } from './deezer.provider.js';
import { itunesProvider } from './itunes.provider.js';
import { youtubeProvider } from './youtube.provider.js';
import { spotifyProvider } from './spotify.provider.js';
import { zingMp3Provider } from './zingmp3.provider.js';

export class ProviderRegistry {
  private providers = new Map<MusicSource, MusicProvider>();
  private disabledOverrides = new Set<string>();

  constructor() {
    this.register(localProvider);
    this.register(audiusProvider);
    this.register(jamendoProvider);
    this.register(deezerProvider);
    this.register(itunesProvider);
    this.register(youtubeProvider);
    this.register(spotifyProvider);
    this.register(zingMp3Provider);
  }

  register(provider: MusicProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: MusicSource): MusicProvider | undefined {
    return this.providers.get(name);
  }

  getAll(): MusicProvider[] {
    return Array.from(this.providers.values());
  }

  toggleProvider(name: string, enabled?: boolean): boolean {
    const isCurrentlyDisabled = this.disabledOverrides.has(name);
    const targetState = enabled !== undefined ? enabled : isCurrentlyDisabled;

    if (targetState) {
      this.disabledOverrides.delete(name);
      return true;
    } else {
      this.disabledOverrides.add(name);
      return false;
    }
  }

  isProviderEnabled(name: string): boolean {
    if (this.disabledOverrides.has(name)) return false;
    const provider = this.providers.get(name as MusicSource);
    return provider ? provider.isEnabled : false;
  }

  getActiveProviders(sourcesFilter?: string[]): MusicProvider[] {
    return this.getAll().filter((p) => {
      if (this.disabledOverrides.has(p.name)) return false;
      if (!p.isEnabled) return false;
      if (sourcesFilter && sourcesFilter.length > 0) {
        return sourcesFilter.includes(p.name);
      }
      return true;
    });
  }

  async testConnection(name: string): Promise<{ provider: string; success: boolean; latencyMs: number; message: string }> {
    const startTime = Date.now();
    try {
      const provider = this.providers.get(name as MusicSource);
      if (!provider) {
        return { provider: name, success: false, latencyMs: 0, message: 'Nguồn nhạc không tồn tại trong hệ thống' };
      }

      // Perform a lightweight search test
      const res = await provider.search('test', 'track', 1);
      const latencyMs = Date.now() - startTime;
      return {
        provider: name,
        success: true,
        latencyMs,
        message: `Kết nối thành công (${res.tracks.length} kết quả)`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        provider: name,
        success: false,
        latencyMs,
        message: err.message || 'Lỗi kết nối API bên thứ ba',
      };
    }
  }
}


export const providerRegistry = new ProviderRegistry();

