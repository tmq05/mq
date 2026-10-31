import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageProvider } from './storage.interface.js';
import { env } from '../config/env.js';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, subFolder: string): Promise<string> {
    const targetDir = path.join(this.baseDir, subFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${Date.now()}-${hash}${ext}`;
    const targetPath = path.join(targetDir, filename);

    await fs.promises.writeFile(targetPath, file.buffer);

    return `/uploads/${subFolder}/${filename}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith('/uploads/')) return;
    const relativePath = fileUrl.replace('/uploads/', '');
    const fullPath = path.join(this.baseDir, relativePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }
}

export const localStorageProvider = new LocalStorageProvider();
