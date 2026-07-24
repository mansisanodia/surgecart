import dotenv from 'dotenv';
// Load environment variables before importing other local files
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import { errorMiddleware } from './middleware/error.middleware';
import BackgroundWorker from './services/worker';

// Route Imports
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import queueRoutes from './routes/queue.routes';
import orderRoutes from './routes/order.routes';
import stripeRoutes from './routes/stripe.routes';

const app = express();
const server = createServer(app);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Capture raw body for Stripe webhook verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      if (req.originalUrl.startsWith('/api/stripe/webhook')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stripe', stripeRoutes);

// Catch 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint not found' });
});

// Error handling middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

// Initialize Server Connections & Listen
const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Initialize Socket.IO
    initSocket(server);

    // 3. Start Background Workers
    BackgroundWorker.start();

    // 4. Start HTTP listening
    server.listen(PORT, () => {
      console.log(`[SurgeCart Backend] Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown
const handleGracefulShutdown = async () => {
  console.log('Graceful shutdown initiated...');
  
  // Stop workers
  BackgroundWorker.stop();

  // Close server
  server.close(() => {
    console.log('HTTP and Socket servers closed.');
    
    // Close MongoDB
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      
      // Close Redis
      const { redis } = require('./config/redis');
      redis.quit(() => {
        console.log('Redis connection closed.');
        process.exit(0);
      });
    });
  });
};

process.on('SIGTERM', handleGracefulShutdown);
process.on('SIGINT', handleGracefulShutdown);
export default server;
