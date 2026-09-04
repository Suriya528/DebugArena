import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket.js';
import { useAuth } from './AuthContext.js';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentSocket, setCurrentSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    setCurrentSocket(s);

    if (s) {
      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      s.on('connect', handleConnect);
      s.on('disconnect', handleDisconnect);

      setIsConnected(s.connected);

      return () => {
        s.off('connect', handleConnect);
        s.off('disconnect', handleDisconnect);
      };
    } else {
      setIsConnected(false);
    }
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket: currentSocket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export function useRealtime() {
  return useContext(SocketContext);
}
