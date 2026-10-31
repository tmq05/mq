import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().default('mq_super_secure_jwt_access_secret_key_2026_production'),
  JWT_REFRESH_SECRET: z.string().default('mq_super_secure_jwt_refresh_secret_key_2026_production'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  CLIENT_URL: z.string().default('http://localhost:3000'),

  STORAGE_TYPE: z.enum(['local', 'cloudinary', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  AUDIUS_ENABLED: z.coerce.boolean().default(true),
  AUDIUS_APP_NAME: z.string().default('mq'),

  JAMENDO_ENABLED: z.coerce.boolean().default(true),
  JAMENDO_CLIENT_ID: z.string().default('c8f13b19'),

  YOUTUBE_ENABLED: z.coerce.boolean().default(true),
  YOUTUBE_API_KEY: z.string().optional().default(''),

  DEEZER_ENABLED: z.coerce.boolean().default(true),
  ITUNES_ENABLED: z.coerce.boolean().default(true),

  SPOTIFY_ENABLED: z.coerce.boolean().default(false),
  SPOTIFY_CLIENT_ID: z.string().optional().default(''),
  SPOTIFY_CLIENT_SECRET: z.string().optional().default(''),

  ZINGMP3_ENABLED: z.coerce.boolean().default(true),

  LRCLIB_ENABLED: z.coerce.boolean().default(true),
  LASTFM_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

