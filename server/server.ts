import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { runMigrations } from './db/index.js';
import { seedDatabase } from './db/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== 'production' ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.netlify.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-sync-secret'],
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Simple logger middleware
app.use((req, _res, next) => {
  const start = Date.now();
  const { method, url } = req;
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${method} ${url} ${_res.statusCode} - ${duration}ms`);
  });
  next();
});

// API Routes
app.use('/api', apiRouter);

// Centralized error handler
app.use(errorHandler);

// Bootstrap server
async function startServer() {
  try {
    console.log('[Server] Ensuring database tables and migrations are ready...');
    await runMigrations();

    // Dev-only manual seed trigger (Strictly disabled in production)
    if (process.env.ALLOW_DEV_SEED === 'true' && process.env.NODE_ENV !== 'production') {
      console.log('[Server] Running development seeder (ALLOW_DEV_SEED is active)...');
      await seedDatabase();
    } else {
      console.log('[Server] Production mode / Clean database mode active. No dummy records seeded.');
    }

    const server = app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🌾 KisanIQ Backend Server is running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    return server;
  } catch (error) {
    console.error('[Server Start Error]:', error);
    process.exit(1);
  }
}

startServer();

export default app;
