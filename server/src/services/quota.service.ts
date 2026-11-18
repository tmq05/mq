export interface ProviderQuotaInfo {
  name: string;
  displayName: string;
  used: number;
  limit: number;
  unit: string;
  percentage: number;
  isWarning: boolean; // >= 80%
  isExceeded: boolean;
  resetsAt: string; // ISO string
  costPerRequest: number;
  rateLimitNote: string;
}

export class QuotaService {
  private dailyUsage: Record<string, number> = {
    youtube: 2400, // units (approx 24 searches @ 100 units)
    jamendo: 1250,
    spotify: 850,
    deezer: 3420,
    itunes: 1800,
    audius: 4120,
    zingmp3: 980,
    lrclib: 650,
  };

  private lastResetDay: number = new Date().getUTCDate();

  constructor() {
    this.checkDayReset();
  }

  private checkDayReset() {
    const currentDay = new Date().getUTCDate();
    if (currentDay !== this.lastResetDay) {
      this.lastResetDay = currentDay;
      // Reset counters
      for (const key of Object.keys(this.dailyUsage)) {
        this.dailyUsage[key] = 0;
      }
    }
  }

  recordUsage(provider: string, amount = 1) {
    this.checkDayReset();
    if (this.dailyUsage[provider] !== undefined) {
      this.dailyUsage[provider] += amount;
    } else {
      this.dailyUsage[provider] = amount;
    }
  }

  getQuotaStatus(): Record<string, ProviderQuotaInfo> {
    this.checkDayReset();

    // Pacific midnight for YouTube (approx 15:00 UTC / 22:00 VN)
    const now = new Date();
    const ytReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0));
    if (now > ytReset) {
      ytReset.setUTCDate(ytReset.getUTCDate() + 1);
    }

    // Midnight UTC for others
    const midnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

    const limits: Record<string, { limit: number; name: string; unit: string; cost: number; reset: Date; note: string }> = {
      youtube: {
        name: 'YouTube Data API v3',
        limit: 10000,
        unit: 'units',
        cost: 100,
        reset: ytReset,
        note: '100 units / lượt tìm kiếm video',
      },
      jamendo: {
        name: 'Jamendo Music API',
        limit: 50000,
        unit: 'requests',
        cost: 1,
        reset: midnightUtc,
        note: 'API công cộng có Client ID',
      },
      spotify: {
        name: 'Spotify Web API',
        limit: 10000,
        unit: 'requests',
        cost: 1,
        reset: midnightUtc,
        note: 'Giới hạn rolling per app',
      },
      deezer: {
        name: 'Deezer Public API',
        limit: 50000,
        unit: 'requests',
        cost: 1,
        reset: midnightUtc,
        note: '50 requests / 5 giây',
      },
      itunes: {
        name: 'Apple iTunes Search API',
        limit: 25000,
        unit: 'requests',
        cost: 1,
        reset: midnightUtc,
        note: '20 calls / phút',
      },
      audius: {
        name: 'Audius Decentralized Network',
        limit: 100000,
        unit: 'requests',
        cost: 1,
        reset: midnightUtc,
        note: 'Phân tán qua mạng lưới Discovery Nodes',
      },
      zingmp3: {
        name: 'Zing MP3 Scraper Gateway',
        limit: 10000,
        unit: 'requests',
        cost: 1,
        reset: midnightUtc,
        note: 'Cơ chế cache và proxy nội bộ',
      },
      lrclib: {
        name: 'LrcLib Lyrics API',
        limit: 20000,
        unit: 'requests',
        cost: 1,
        reset: midnightUtc,
        note: 'Cơ sở dữ liệu lời bài hát mở',
      },
    };

    const result: Record<string, ProviderQuotaInfo> = {};

    for (const [key, cfg] of Object.entries(limits)) {
      const used = this.dailyUsage[key] || 0;
      const percentage = Math.min(100, Math.round((used / cfg.limit) * 100));
      result[key] = {
        name: key,
        displayName: cfg.name,
        used,
        limit: cfg.limit,
        unit: cfg.unit,
        percentage,
        isWarning: percentage >= 80,
        isExceeded: used >= cfg.limit,
        resetsAt: cfg.reset.toISOString(),
        costPerRequest: cfg.cost,
        rateLimitNote: cfg.note,
      };
    }

    return result;
  }
}

export const quotaService = new QuotaService();
