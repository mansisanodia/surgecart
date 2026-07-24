import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware: Inspect handshaked token if present
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const { verifyToken } = require('../utils/jwt');
        const decoded = verifyToken(token);
        socket.data.user = decoded;
      } catch (err) {
        console.warn('[Socket Auth Warning] Invalid handshake token connected.');
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    // Join product page room (for real-time stock updates) - Public
    socket.on('join:product', (productId: string) => {
      socket.join(`product:${productId}`);
    });

    socket.on('leave:product', (productId: string) => {
      socket.leave(`product:${productId}`);
    });

    // Join queue room (for position updates) - Secured
    socket.on('join:queue', ({ productId, userId }: { productId: string; userId: string }) => {
      if (!socket.data.user || socket.data.user.id !== userId) {
        console.warn(`[Socket Security Bypass Attempted] User ${socket.data.user?.id || 'guest'} tried subscribing to private queue: ${userId}`);
        return;
      }
      socket.join(`queue:${productId}:${userId}`);
    });

    socket.on('leave:queue', ({ productId, userId }: { productId: string; userId: string }) => {
      socket.leave(`queue:${productId}:${userId}`);
    });

    socket.on('disconnect', () => {
      // Clean up if needed
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Please call initSocket first.');
  }
  return io;
};
