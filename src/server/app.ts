import cookieParser from 'cookie-parser';
import express, { Express, NextFunction, Request, Response } from 'express';
import apiRouter from './routes.ts';

export const PRIMARY_DOMAIN = 'https://www.smnie.in';

export const TRUSTED_ORIGINS = new Set<string>([
  'https://www.smnie.in',
  'https://smnie.in',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

export function isTrustedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (TRUSTED_ORIGINS.has(origin)) return true;

  const configuredAppUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (configuredAppUrl && origin === configuredAppUrl) return true;

  try {
    const parsed = new URL(origin);
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'www.smnie.in' ||
        parsed.hostname === 'smnie.in' ||
        parsed.hostname.endsWith('.vercel.app') ||
        parsed.hostname.endsWith('.netlify.app'))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export interface CreateApiAppOptions {
  /**
   * When deployed as a Vercel Serverless Function at /api/index.ts,
   * also mount apiRouter at '/' as a fallback in case the runtime strips
   * the '/api' prefix before forwarding req.url, and return JSON 404s.
   */
  serverlessApiOnly?: boolean;
}

export function createApiApp(options: CreateApiAppOptions = {}): Express {
  const app = express();

  app.set('trust proxy', 1);

  // Basic security headers + trusted origin CORS for www.smnie.in
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const origin = req.headers.origin;
    if (origin && isTrustedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
    }

    next();
  });

  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));
  app.use(cookieParser());

  // Mount primary API routes under /api
  app.use('/api', apiRouter);

  if (options.serverlessApiOnly) {
    // Fallback mount if a serverless rewrite forwards a path without the /api prefix
    app.use('/', apiRouter);

    // Clean JSON 404 for unknown API paths
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: `API endpoint not found: ${req.method} ${req.path}`,
      });
    });
  }

  // Centralized JSON error boundary for Express
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled API error:', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
