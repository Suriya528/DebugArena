import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthPayload } from '../middleware/auth.js';

let io: SocketIOServer | null = null;
const onlineUsers = new Map<string, { socketId: string; user: AuthPayload; currentRound?: number; lastActive: Date }>();

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = ENV.NODE_ENV === 'production'
    ? (ENV.CLIENT_ORIGINS.length === 1 ? ENV.CLIENT_ORIGINS[0] : ENV.CLIENT_ORIGINS)
    : '*';

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (ENV.NODE_ENV !== 'production') return callback(null, true);
        if (ENV.CLIENT_ORIGINS.includes(origin) || ENV.CLIENT_ORIGINS.includes('*')) return callback(null, true);
        try {
          const url = new URL(origin);
          if (url.hostname.endsWith('.vercel.app') || url.hostname === 'localhost') {
            return callback(null, true);
          }
        } catch {}
        const normalized = origin.replace(/\/+$/, '');
        if (ENV.CLIENT_ORIGINS.some(allowed => allowed.replace(/\/+$/, '') === normalized)) {
          return callback(null, true);
        }
        return callback(new Error(`Socket CORS: Origin '${origin}' is not permitted.`));
      },
      credentials: true,
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
    const isAdmin = user.role !== 'participant';
    if (isAdmin) {
      socket.join('admin-room');
      if (user.collegeId) {
        socket.join(`admin-room:${user.collegeId}`);
      }
      if (user.eventId) {
        socket.join(`admin-room:${user.eventId}`);
      }
      // Send current active users belonging to this tenant or all if super_admin
      const filteredUsers = Array.from(onlineUsers.values()).filter(entry => {
        if (user.role === 'super_admin' || !user.collegeId) return true;
        return entry.user.collegeId === user.collegeId;
      });
      socket.emit('admin:online_users', filteredUsers);
    } else {
      socket.join(`participant:${user.userId}`);
      if (user.collegeId) {
        socket.join(`participant-tenant:${user.collegeId}`);
      }
      if (user.eventId) {
        socket.join(`event:${user.eventId}`);
      }
      onlineUsers.set(user.userId, {
        socketId: socket.id,
        user,
        lastActive: new Date()
      });

      const connectPayload = { userId: user.userId, username: user.username, name: user.name, collegeId: user.collegeId, eventId: user.eventId };
      if (user.eventId) {
        io?.to(`admin-room:${user.eventId}`).emit('admin:user_connected', connectPayload);
      }
      if (user.collegeId) {
        io?.to(`admin-room:${user.collegeId}`).emit('admin:user_connected', connectPayload);
      }
      io?.to('admin-room').emit('admin:user_connected', connectPayload);
    }

    socket.on('participant:presence', (data: { currentRound?: number; currentQuestionId?: string }) => {
      if (user.role === 'participant') {
        const entry = onlineUsers.get(user.userId);
        if (entry) {
          entry.lastActive = new Date();
          if (data.currentRound) entry.currentRound = data.currentRound;
        }
        const presencePayload = {
          userId: user.userId,
          username: user.username,
          collegeId: user.collegeId,
          eventId: user.eventId,
          currentRound: data.currentRound,
          currentQuestionId: data.currentQuestionId,
          timestamp: new Date()
        };
        if (user.eventId) {
          io?.to(`admin-room:${user.eventId}`).emit('admin:presence_update', presencePayload);
        }
        if (user.collegeId) {
          io?.to(`admin-room:${user.collegeId}`).emit('admin:presence_update', presencePayload);
        }
        io?.to('admin-room').emit('admin:presence_update', presencePayload);
      }
    });

    socket.on('disconnect', () => {
      if (user.role === 'participant') {
        const existing = onlineUsers.get(user.userId);
        if (existing && existing.socketId === socket.id) {
          onlineUsers.delete(user.userId);
          const disconnectPayload = { userId: user.userId, username: user.username, collegeId: user.collegeId, eventId: user.eventId };
          if (user.eventId) {
            io?.to(`admin-room:${user.eventId}`).emit('admin:user_disconnected', disconnectPayload);
          }
          if (user.collegeId) {
            io?.to(`admin-room:${user.collegeId}`).emit('admin:user_disconnected', disconnectPayload);
          }
          io?.to('admin-room').emit('admin:user_disconnected', disconnectPayload);
        }
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

export function broadcastToAdmins(event: string, payload: any, collegeId?: string, eventId?: string): void {
  if (io) {
    if (eventId) {
      io.to(`admin-room:${eventId}`).emit(event, payload);
    }
    if (collegeId) {
      io.to(`admin-room:${collegeId}`).emit(event, payload);
    }
    // Also deliver to super_admin monitor
    io.to('admin-room').emit(event, payload);
  }
}

export function broadcastToParticipants(event: string, payload: any, eventId?: string): void {
  if (io) {
    if (eventId) {
      io.to(`event:${eventId}`).emit(event, payload);
    } else {
      io.emit(event, payload);
    }
  }
}

export function broadcastToAll(event: string, payload: any, eventId?: string): void {
  if (io) {
    if (eventId) {
      io.to(`event:${eventId}`).emit(event, payload);
      io.to(`admin-room:${eventId}`).emit(event, payload);
    } else {
      io.emit(event, payload);
    }
  }
}

export function emitToUser(userId: string, event: string, payload: any): void {
  if (io) {
    io.to(`participant:${userId}`).emit(event, payload);
  }
}
