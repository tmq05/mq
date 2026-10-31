import { MusicProvider, MusicSource } from './music-provider.interface.js';
import { localProvider } from './local.provider.js';
import { audiusProvider } from './audius.provider.js';
import { jamendoProvider } from './jamendo.provider.js';
import { deezerProvider } from './deezer.provider.js';
import { itunesProvider } from './itunes.provider.js';
import { youtubeProvider } from './youtube.provider.js';
import { spotifyProvider } from './spotify.provider.js';

export class ProviderRegistry {
  private providers = new Map<MusicSource, MusicProvider>();

  constructor() {
    this.register(localProvider);
    this.register(audiusProvider);
    this.register(jamendoProvider);
    this.register(deezerProvider);
    this.register(itunesProvider);
    this.register(youtubeProvider);
    this.register(spotifyProvider);
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

  getActiveProviders(sourcesFilter?: string[]): MusicProvider[] {
    return this.getAll().filter((p) => {
      if (!p.isEnabled) return false;
      if (sourcesFilter && sourcesFilter.length > 0) {
        return sourcesFilter.includes(p.name);
      }
      return true;
    });
  }
}

export const providerRegistry = new ProviderRegistry();

