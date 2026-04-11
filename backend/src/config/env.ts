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
  OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300),
} as const;

