import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { songService } from '../services/song.service.js';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { streamAudioFile, pipeRemoteAudio } from '../utils/range-stream.js';
import { env } from '../config/env.js';
import { spotifyProvider } from '../providers/spotify.provider.js';
import { zingMp3Provider } from '../providers/zingmp3.provider.js';
import { searchService } from '../services/search.service.js';
import { ALBUMS_CATALOG } from '../utils/albums-data.js';
import { resolveExactFullTrack } from '../utils/track-resolver.js';

export class SongController {
  async resolveFullTrack(req: Request, res: Response, next: NextFunction) {
    try {
      const title = (req.query.title as string) || '';
      const artist = (req.query.artist as string) || '';
      const id = (req.query.id as string) || '';
      const durationMs = Number(req.query.durationMs) || 0;
      const excludeRaw = (req.query.exclude as string) || '';
      const excludeIds = excludeRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      let songTitle = title;
      let songArtist = artist;
      let songDurationMs = durationMs;

      if (!songTitle && id) {
        const track = await songService.getSong(id);
        if (track) {
          songTitle = track.title;
          songArtist = track.artists?.[0] || '';
          songDurationMs = songDurationMs || track.durationMs || 0;
          if (track.embedId && track.embedId.length === 11 && !excludeIds.includes(track.embedId)) {
            res.json({ videoId: track.embedId, isFullLength: true });
            return;
          }
        }
      }

      if (!songTitle) {
        res.status(400).json({ message: 'Thiếu thông tin bài hát' });
        return;
      }

      const videoId = await resolveExactFullTrack(songTitle, songArtist, songDurationMs, excludeIds);
      if (videoId && videoId.length === 11) {
        res.json({ videoId, isFullLength: true });
        return;
      }

      res.status(404).json({ message: 'Không tìm thấy video phát đầy đủ' });
    } catch (err) {
      next(err);
    }
  }

  async getSong(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const track = await songService.getSong(id);
      if (!track) {
        res.status(404).json({ message: 'Không tìm thấy bài hát' });
        return;
      }
      res.json(track);
    } catch (err) {
      next(err);
    }
  }

  async streamSong(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      // Handle Spotify stream requests
      if (id.startsWith('spotify:')) {
        const sourceId = id.replace(/^spotify:/, '');
        let track = await spotifyProvider.getTrack(sourceId);
        let songTitle = track?.title;
        let songArtist = track?.artists?.[0];

        if (!songTitle) {
          // Look up in ALBUMS_CATALOG
          for (const alb of ALBUMS_CATALOG) {
            const found = alb.tracks.find(
              (t) =>
                t.sourceId === sourceId ||
                t.id === id ||
                t.id === `spotify:${sourceId}` ||
                t.embedId === sourceId
            );
            if (found) {
              songTitle = found.title;
              songArtist = found.artists?.[0] || alb.artist;
              break;
            }
          }
        }

        let remotePreviewUrl =
          track?.previewUrl && track.previewUrl.startsWith('http') ? track.previewUrl : null;
        if (!remotePreviewUrl) {
          remotePreviewUrl = await spotifyProvider.getEmbedPreviewUrl(sourceId);
        }

        if (remotePreviewUrl) {
          const piped = await pipeRemoteAudio(remotePreviewUrl, req, res);
          if (piped) return;
        }

        res.status(404).json({
          success: false,
          message: 'Spotify không cung cấp luồng âm thanh trực tiếp cho bài hát này.',
        });
        return;
      }

      // Handle Zing MP3 stream requests (strictly same-source, no cross-provider fallback)
      if (id.startsWith('zingmp3:')) {
        const sourceId = id.replace(/^zingmp3:/, '');
        const track = await zingMp3Provider.getTrack(sourceId);
        const remoteStream = track?.streamUrl?.startsWith('http')
          ? track.streamUrl
          : track?.previewUrl?.startsWith('http')
            ? track.previewUrl
            : null;
        if (remoteStream) {
          const piped = await pipeRemoteAudio(remoteStream, req, res);
          if (piped) return;
        }

        res.status(404).json({
          success: false,
          message: 'Zing MP3 không cung cấp luồng âm thanh trực tiếp cho bài hát này.',
        });
        return;
      }

      const cleanId = id.replace(/^local:/, '');

      const song = await prisma.song.findFirst({
        where: {
          OR: [{ id: cleanId }, { sourceId: cleanId }],
          source: 'local',
        },
      });

      if (!song) {
        res.status(404).json({ message: 'Bài hát không tồn tại trên hệ thống' });
        return;
      }

      // Check if file is stored locally
      let audioPath = '';
      if (song.streamUrl && song.streamUrl.startsWith('/uploads/')) {
        const rel = song.streamUrl.replace('/uploads/', '');
        const candidates = [
          path.resolve(process.cwd(), env.UPLOAD_DIR, rel),
          path.resolve(process.cwd(), 'server', env.UPLOAD_DIR, rel),
          path.resolve(process.cwd(), 'uploads', rel),
        ];
        audioPath = candidates.find((p) => fs.existsSync(p)) || '';
      }

      // Fallback to sample MP3 if not found or if path is sample
      if (!audioPath || !fs.existsSync(audioPath)) {
        const sampleCandidates = [
          path.resolve(process.cwd(), env.UPLOAD_DIR, 'audio', 'sample.mp3'),
          path.resolve(process.cwd(), 'server', env.UPLOAD_DIR, 'audio', 'sample.mp3'),
          path.resolve(process.cwd(), 'uploads', 'audio', 'sample.mp3'),
        ];
        const found = sampleCandidates.find((p) => fs.existsSync(p));
        if (found) {
          audioPath = found;
        } else {
          res.status(404).json({ message: 'Tệp âm thanh nguồn chưa sẵn sàng' });
          return;
        }
      }

      // Stream with HTTP 206 Range requests
      streamAudioFile(audioPath, req, res);
    } catch (err) {
      next(err);
    }
  }

  async getStreamInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { source, sourceId } = req.params;
      const info = await songService.getStreamInfo(source, sourceId);
      if (!info) {
        res.status(404).json({ message: 'Không lấy được thông tin phát cho nguồn này' });
        return;
      }
      res.json(info);
    } catch (err) {
      next(err);
    }
  }

  async toggleLike(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: 'Vui lòng đăng nhập' });
        return;
      }
      const track = req.body.track;
      if (!track) {
        res.status(400).json({ message: 'Dữ liệu bài hát là bắt buộc' });
        return;
      }
      const result = await songService.toggleLike(req.user.userId, track);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async recordPlay(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const track = req.body.track;
      await songService.recordPlay(req.user?.userId, track);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async getTrending(req: Request, res: Response, next: NextFunction) {
    try {
      // Fetch genuine hits from Spotify and Zing MP3 (no local, no deezer)
      const [spotifyRes, zingRes] = await Promise.allSettled([
        spotifyProvider.search('Top Hits Vietnam', 'track'),
        zingMp3Provider.search('thịnh hành', 'track'),
      ]);

      const candidates: any[] = [];
      if (spotifyRes.status === 'fulfilled' && spotifyRes.value.tracks.length > 0) {
        candidates.push(...spotifyRes.value.tracks);
      }
      if (zingRes.status === 'fulfilled' && zingRes.value.tracks.length > 0) {
        candidates.push(...zingRes.value.tracks);
      }

      const deduplicated = searchService
        .deduplicateTracks(candidates)
        .filter((t) => t.source !== 'local' && t.source !== 'deezer')
        .slice(0, 12);

      res.json({ trending: deduplicated });
    } catch (err) {
      next(err);
    }
  }

  async getVietnameseHits(req: Request, res: Response, next: NextFunction) {
    try {
      // Fetch genuine Vietnamese hits from Spotify and Zing MP3
      const [spotifyRes, zingRes] = await Promise.allSettled([
        spotifyProvider.search('V-Pop hay nhất', 'track'),
        zingMp3Provider.search('Sơn Tùng M-TP', 'track'),
      ]);

      const candidates: any[] = [];
      if (spotifyRes.status === 'fulfilled' && spotifyRes.value.tracks.length > 0) {
        candidates.push(...spotifyRes.value.tracks);
      }
      if (zingRes.status === 'fulfilled' && zingRes.value.tracks.length > 0) {
        candidates.push(...zingRes.value.tracks);
      }

      const deduplicated = searchService
        .deduplicateTracks(candidates)
        .filter((t) => {
          if (t.source === 'local' || t.source === 'deezer') return false;
          const lower = t.title.toLowerCase();
          if (lower.includes('am remix') || lower.includes('nhacpro') || lower.includes('remix - am')) return false;
          return true;
        })
        .slice(0, 10);

      res.json({ vpop: deduplicated });
    } catch (err) {
      next(err);
    }
  }
}

export const songController = new SongController();

