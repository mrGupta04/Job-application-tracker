import express from 'express';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import connectDB from './config/database';
import { env } from './config/env';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';

const app = express();
const rateLimitStore = new Map<string, { count: number; start: number }>();
const RATE_LIMIT_WINDOW_MS = Number.isFinite(env.RATE_LIMIT_WINDOW_MS) && env.RATE_LIMIT_WINDOW_MS > 0
  ? env.RATE_LIMIT_WINDOW_MS
  : 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = Number.isFinite(env.RATE_LIMIT_MAX_REQUESTS) && env.RATE_LIMIT_MAX_REQUESTS > 0
  ? env.RATE_LIMIT_MAX_REQUESTS
  : 300;

app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = env.CORS_ORIGINS;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS_NOT_ALLOWED'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now - current.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, start: now });
    return next();
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ message: 'Too many requests, please try again later.' });
  }

  current.count += 1;

  if (Math.random() < 0.02) {
    for (const [ip, bucket] of rateLimitStore.entries()) {
      if (now - bucket.start > RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.delete(ip);
      }
    }
  }

  return next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), environment: env.NODE_ENV });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), environment: env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error.message === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({ message: 'CORS origin not allowed' });
  }

  console.error(error);
  return res.status(500).json({
    message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
});

const start = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
