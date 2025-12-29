import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  UPLOADS_DIR: z.string().default('./uploads'),
  UPLOADS_BASE_URL: z.string().default('http://localhost:3000/uploads'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
});

const env = envSchema.parse(process.env);

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
    refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  uploads: {
    directory: env.UPLOADS_DIR,
    baseUrl: env.UPLOADS_BASE_URL,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as string[],
  },

  cors: {
    origins: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
  },
} as const;

export type Config = typeof config;
