import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(60),
  CORS_ORIGIN: z.string().default('*'),
  OPENAI_API_KEY: z.string().optional(),
  ENABLE_EMBEDDINGS: z.string().optional(),
  // New weighting keys; also support legacy SCORING_* for compatibility
  WEIGHT_SIMILARITY: z.coerce.number().optional(),
  WEIGHT_RECENCY: z.coerce.number().optional(),
  WEIGHT_IMPORTANCE: z.coerce.number().optional(),
  SCORING_WEIGHT_SIMILARITY: z.coerce.number().optional(),
  SCORING_WEIGHT_RECENCY: z.coerce.number().optional(),
  SCORING_WEIGHT_IMPORTANCE: z.coerce.number().optional(),
  MAX_TEXT_LENGTH: z.coerce.number().default(4000),
  ADMIN_API_KEY: z.string().optional(),
  PRUNE_MAX_AGE_DAYS: z.coerce.number().default(90),
  PRUNE_INACTIVE_DAYS: z.coerce.number().default(30),
  PRUNE_IMPORTANCE_THRESHOLD: z.coerce.number().default(0.3)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.format();
  // Fail fast on missing/invalid env
  throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted, null, 2)}`);
}

const raw = parsed.data;

export const env = {
  port: raw.PORT,
  databaseUrl: raw.DATABASE_URL,
  nodeEnv: raw.NODE_ENV,
  rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: raw.RATE_LIMIT_MAX_REQUESTS,
  corsOrigin: raw.CORS_ORIGIN,
  openAiApiKey: raw.OPENAI_API_KEY,
  embeddingsEnabled:
    raw.ENABLE_EMBEDDINGS?.toLowerCase() === 'true' && Boolean(raw.OPENAI_API_KEY),
  scoringWeights: {
    similarity:
      raw.WEIGHT_SIMILARITY ??
      raw.SCORING_WEIGHT_SIMILARITY ??
      0.5,
    recency:
      raw.WEIGHT_RECENCY ??
      raw.SCORING_WEIGHT_RECENCY ??
      0.2,
    importance:
      raw.WEIGHT_IMPORTANCE ??
      raw.SCORING_WEIGHT_IMPORTANCE ??
      0.3
  },
  maxTextLength: raw.MAX_TEXT_LENGTH,
  adminApiKey: raw.ADMIN_API_KEY,
  prune: {
    maxAgeDays: raw.PRUNE_MAX_AGE_DAYS,
    inactiveDays: raw.PRUNE_INACTIVE_DAYS,
    importanceThreshold: raw.PRUNE_IMPORTANCE_THRESHOLD
  },
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test'
};
