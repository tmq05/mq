import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

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

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
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
    res.writeHead(200, {
      'Content-Length': fileSize,
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
