import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthPayload } from '../middleware/auth.js';

let io: SocketIOServer | null = null;
const onlineUsers = new Map<string, { socketId: string; user: AuthPayload; currentRound?: number; lastActive: Date }>();

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthPayload;

    if (user.role === 'admin') {
      socket.join('admin-room');
      // Send current active users immediately to admin
      socket.emit('admin:online_users', Array.from(onlineUsers.values()));
    } else {
      socket.join(`participant:${user.userId}`);
      onlineUsers.set(user.userId, {
        socketId: socket.id,
        user,
        lastActive: new Date()
      });
      io?.to('admin-room').emit('admin:user_connected', { userId: user.userId, username: user.username, name: user.name });
    }

    socket.on('participant:presence', (data: { currentRound?: number; currentQuestionId?: string }) => {
      if (user.role === 'participant') {
        const entry = onlineUsers.get(user.userId);
        if (entry) {
          entry.lastActive = new Date();
          if (data.currentRound) entry.currentRound = data.currentRound;
        }
        io?.to('admin-room').emit('admin:presence_update', {
          userId: user.userId,
          username: user.username,
          currentRound: data.currentRound,
          currentQuestionId: data.currentQuestionId,
          timestamp: new Date()
        });
      }
    });

    socket.on('disconnect', () => {
      if (user.role === 'participant') {
        onlineUsers.delete(user.userId);
        io?.to('admin-room').emit('admin:user_disconnected', { userId: user.userId, username: user.username });
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}

export function broadcastToAdmins(event: string, payload: any): void {
  if (io) {
    io.to('admin-room').emit(event, payload);
  }
}

export function broadcastToParticipants(event: string, payload: any): void {
  if (io) {
    io.emit(event, payload);
  }
}

export function emitToUser(userId: string, event: string, payload: any): void {
  if (io) {
    io.to(`participant:${userId}`).emit(event, payload);
  }
}
