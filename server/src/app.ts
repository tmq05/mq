import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { globalLimiter } from './middlewares/rate-limit.middleware.js';

export const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Allows media streaming & YouTube embed
  })
);

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost in development or specific CLIENT_URL
      if (!origin || origin.startsWith('http://localhost') || origin === env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, can restrict in production
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Swagger UI documentation
const swaggerFilePath = path.resolve(process.cwd(), 'src/swagger/swagger.json');
if (fs.existsSync(swaggerFilePath)) {
  const swaggerDoc = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf-8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
}

// Global rate limiting
app.use('/api', globalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mq-api',
  });
});

// API Routes
app.use('/api', routes);

// Central error handler
app.use(errorHandler);

