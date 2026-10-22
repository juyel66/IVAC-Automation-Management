import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Don't restrict API responses
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS configuration
  // Allow configured origins and chrome-extension:// origins
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        // Allow any chrome-extension origin
        if (origin.startsWith('chrome-extension://')) {
          return callback(null, true);
        }

        // Allow development localhost origins
        if (
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1')
        ) {
          return callback(null, true);
        }

        // Allow explicitly configured origins
        if (ENV.CORS_ORIGIN.includes('*') || ENV.CORS_ORIGIN.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked request from origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Mount API Routes
  app.use(ENV.API_PREFIX, apiRouter);

  // 5. 404 and Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
