import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import vehiclesRoutes from './modules/vehicles/vehicles.routes';
import auctionsRoutes from './modules/auctions/auctions.routes';
import bidsRoutes from './modules/bids/bids.routes';
import aiRoutes from './modules/ai/ai.routes';
import lotsRoutes from './modules/lots/lots.routes';

export const createApp = (): Application => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  
  const allowedFrontend = [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean);
  const normalize = (origin: string) => origin.trim().replace(/\/+$/, '');
  
  app.use(
    cors({    
      origin: (incomingOrigin, callback) => {
      // Allow requests with no origin (e.g. server-to-server or tools)
      if (!incomingOrigin) return callback(null, true);
       
      const normalizedIncoming = normalize(incomingOrigin);
      const normalizedAllowed = allowedFrontend.map(normalize);
     
      console.log('Incoming origin:', incomingOrigin);
      console.log('Allowed origins:', allowedFrontend);
      if (normalizedAllowed.includes(normalizedIncoming)) {
        return callback(null, true);
      }
      
      console.error('❌ CORS blocked:', incomingOrigin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.options('*', cors());

  // Rate limiting
  app.use(rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2000'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'auction-simulator-backend',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/vehicles', vehiclesRoutes);
  app.use('/api/auctions', auctionsRoutes);
  app.use('/api/bids', bidsRoutes);
  app.use('/api/lots', lotsRoutes);
  app.use('/api/ai', aiRoutes);

  // 404
  app.use(notFound);

  // Error handler
  app.use(errorHandler);

  return app;
};
