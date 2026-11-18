import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { aiMoodService } from '../services/aiMood.service.js';
import { MusicSource } from '../providers/music-provider.interface.js';

const VALID_SOURCES: MusicSource[] = [
  'local',
  'audius',
  'jamendo',
  'youtube',
  'deezer',
  'itunes',
  'spotify',
  'zingmp3',
];

const MoodRecommendSchema = z.object({
  prompt: z
    .string({ required_error: 'Vui lòng nhập tâm trạng hoặc hoạt động bạn muốn nghe.' })
    .trim()
    .min(1, 'Vui lòng nhập tâm trạng hoặc hoạt động bạn muốn nghe.')
    .max(200, 'Mô tả tâm trạng tối đa 200 ký tự.'),
  sources: z.array(z.enum(VALID_SOURCES as [MusicSource, ...MusicSource[]])).optional(),
  limit: z.number().int().min(5).max(12).optional(),
  refresh: z.boolean().optional(),
});

// Rate limiter: tối đa 10 lượt / phút / người dùng (hoặc IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const userTimestamps = new Map<string, number[]>();

function checkMoodRateLimit(key: string): boolean {
  const now = Date.now();
  const list = (userTimestamps.get(key) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (list.length >= RATE_LIMIT_MAX) {
    userTimestamps.set(key, list);
    return false;
  }
  list.push(now);
  userTimestamps.set(key, list);
  return true;
}

export class AiMoodController {
  async moodRecommend(req: AuthenticatedRequest, res: Response, _next: NextFunction) {
    try {
      const rateKey = req.user?.userId ? `user:${req.user.userId}` : `ip:${req.ip || 'unknown'}`;
      if (!checkMoodRateLimit(rateKey)) {
        res.status(429).json({
          message: 'Bạn đã gửi quá nhiều yêu cầu gợi ý trong 1 phút. Vui lòng thử lại sau giây lát.',
        });
        return;
      }

      const parsed = MoodRecommendSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          message: parsed.error.issues[0]?.message || 'Dữ liệu yêu cầu chưa hợp lệ.',
        });
        return;
      }

      const result = await aiMoodService.recommend(parsed.data);
      res.json(result);
    } catch (err: any) {
      if (err?.message === 'EMPTY_PROMPT') {
        res.status(400).json({ message: 'Vui lòng nhập tâm trạng hoặc thể loại bạn muốn nghe.' });
        return;
      }
      res.status(500).json({
        message: 'Hệ thống AI tạm thời bận. Vui lòng thử lại sau ít giây.',
      });
    }
  }
}

export const aiMoodController = new AiMoodController();
