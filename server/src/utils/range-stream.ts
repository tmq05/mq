import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../config/logger.js';

export function streamAudioFile(
  filePath: string,
  req: Request,
  res: Response,
  contentType = 'audio/mpeg'
): void {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'Tệp âm thanh không tồn tại trên hệ thống' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Range format: "bytes=start-end"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize.toString(),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    });

    fileStream.pipe(res);

    // Clean up if connection closes prematurely
    res.on('close', () => {
      fileStream.destroy();
    });
  } else {
    // Full content response
    res.status(200).set({
      'Content-Length': fileSize.toString(),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000',
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    res.on('close', () => {
      fileStream.destroy();
    });
  }
}

export async function pipeRemoteAudio(
  remoteUrl: string,
  req: Request,
  res: Response
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const remoteRes = await axios.get(remoteUrl, {
      responseType: 'stream',
      headers,
      timeout: 8000,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const statusCode = remoteRes.status === 206 ? 206 : 200;
    const responseHeaders: Record<string, string> = {
      'Content-Type': String(remoteRes.headers['content-type'] || 'audio/mp4'),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };

    if (remoteRes.headers['content-length']) {
      responseHeaders['Content-Length'] = String(remoteRes.headers['content-length']);
    }
    if (remoteRes.headers['content-range']) {
      responseHeaders['Content-Range'] = String(remoteRes.headers['content-range']);
    }

    res.status(statusCode).set(responseHeaders);
    remoteRes.data.pipe(res);

    res.on('close', () => {
      remoteRes.data.destroy();
    });

    return true;
  } catch (err: any) {
    logger.warn({ err: err.message, remoteUrl }, 'Failed to pipe remote audio');
    return false;
  }
}


