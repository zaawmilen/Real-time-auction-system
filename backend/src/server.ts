
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/database';
import { initializeSocket } from './websocket/socket';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function bootstrap(): Promise<void> {
  try {
    // Connect to database
    await connectDB();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    initializeSocket(httpServer);

    // Start listening
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Auction Simulator Backend running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   Health check: http://localhost:${PORT}/health`);
      logger.info(`   API base:     http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

bootstrap();
