import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }

  socket = io({
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  socket.on('connect', () => {
    console.log('⚡ Connected to DebugArena Realtime Gateway:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected from Realtime Gateway:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('Realtime connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
