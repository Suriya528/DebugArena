import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';
import { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  loginWithGoogle: (payload: { credential?: string; mockEmail?: string; name?: string; collegeName?: string; collegeCode?: string }) => Promise<User>;
  joinEventByCode: (payload: { eventCode: string; name: string; regNo: string; department?: string; year?: string; password: string }) => Promise<{ user: User; event: any }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('debugarena_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('debugarena_token');
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const userData = res.data.user;
      setUser({
        id: userData._id || userData.id,
        username: userData.username,
        name: userData.name,
        role: userData.role,
        isDisqualified: userData.isDisqualified,
        disqualificationReason: userData.disqualificationReason
      });
      connectSocket(savedToken);
    } catch (err) {
      console.warn('Session expired or invalid token');
      localStorage.removeItem('debugarena_token');
      setToken(null);
      setUser(null);
      disconnectSocket();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { username, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('debugarena_token', receivedToken);
    setToken(receivedToken);

    const formattedUser: User = {
      id: receivedUser.id,
      username: receivedUser.username,
      name: receivedUser.name,
      role: receivedUser.role
    };

    setUser(formattedUser);
    connectSocket(receivedToken);
    return formattedUser;
  };

  const loginWithGoogle = async (payload: { credential?: string; mockEmail?: string; name?: string; collegeName?: string; collegeCode?: string }): Promise<User> => {
    const res = await api.post('/auth/google', payload);
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('debugarena_token', receivedToken);
    setToken(receivedToken);

    const formattedUser: User = {
      id: receivedUser.id,
      username: receivedUser.username,
      name: receivedUser.name,
      role: receivedUser.role
    };

    setUser(formattedUser);
    connectSocket(receivedToken);
    return formattedUser;
  };

  const joinEventByCode = async (payload: { eventCode: string; name: string; regNo: string; department?: string; year?: string; password: string }): Promise<{ user: User; event: any }> => {
    const res = await api.post('/participant/join-by-code', payload);
    const { token: receivedToken, user: receivedUser, event: receivedEvent } = res.data;

    localStorage.setItem('debugarena_token', receivedToken);
    setToken(receivedToken);

    const formattedUser: User = {
      id: receivedUser.id,
      username: receivedUser.username,
      name: receivedUser.name,
      role: receivedUser.role
    };

    setUser(formattedUser);
    connectSocket(receivedToken);
    return { user: formattedUser, event: receivedEvent };
  };

  const logout = () => {
    localStorage.removeItem('debugarena_token');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, joinEventByCode, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
