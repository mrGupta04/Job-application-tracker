import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'production' | 'test';

const parseNodeEnv = (value: string | undefined): NodeEnv => {
  if (!value) {
    return 'development';
  }

  if (value === 'development' || value === 'production' || value === 'test') {
    return value;
  }

  throw new Error('NODE_ENV must be one of development, production, or test');
};

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return 5000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid integer between 1 and 65535');
  }

  return port;
};

const parseOrigins = (value: string | undefined): string[] => {
  if (!value) {
    return ['http://localhost:5173'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const required = (key: 'MONGO_URI' | 'JWT_SECRET'): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

const parseApiKey = (value: string | undefined): string => {
  return value?.trim() || '';
};

type AiProvider = 'openai' | 'google' | 'auto';
const parseAiProvider = (value: string | undefined): AiProvider => {
  if (!value) {
    return 'auto';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'openai' || normalized === 'google' || normalized === 'auto') {
    return normalized as AiProvider;
  }

  throw new Error('AI_PROVIDER must be one of openai, google, or auto');
};

const parseBaseUrl = (value: string | undefined, defaultValue: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return defaultValue;
  }
  return trimmed.replace(/\/+$/, '');
};

const NODE_ENV = parseNodeEnv(process.env.NODE_ENV);
const PORT = parsePort(process.env.PORT);
const MONGO_URI = required('MONGO_URI');
const JWT_SECRET = required('JWT_SECRET');

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters for production safety');
}

export const env = {
  NODE_ENV,
  PORT,
  MONGO_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || '30d',
  CORS_ORIGINS: parseOrigins(process.env.CORS_ORIGINS),
  OPENAI_API_KEY: parseApiKey(process.env.OPENAI_API_KEY),
  GEMINI_API_KEY: parseApiKey(process.env.GEMINI_API_KEY),
  AI_API_KEY: parseApiKey(process.env.AI_API_KEY),
  OPENAI_MODEL: parseApiKey(process.env.OPENAI_MODEL) || 'gpt-4o-mini',
  GEMINI_MODEL: parseApiKey(process.env.GEMINI_MODEL),
  AI_MODEL: parseApiKey(process.env.AI_MODEL),
  AI_PROVIDER: parseAiProvider(process.env.AI_PROVIDER),
  OPENAI_API_BASE_URL: parseBaseUrl(process.env.OPENAI_API_BASE_URL, 'https://api.openai.com/v1'),
  GEMINI_API_BASE_URL: parseBaseUrl(process.env.GEMINI_API_BASE_URL, 'https://generativelanguage.googleapis.com/v1beta'),
  AI_API_BASE_URL: parseApiKey(process.env.AI_API_BASE_URL),
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300),
} as const;
