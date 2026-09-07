import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';
import { User } from '../types/index.js';

export interface AuthResult extends User {
  needsOnboarding?: boolean;
}

export interface PasskeyLoginDisambiguation {
  requiresEmail: true;
  message: string;
  matchedCount: number;
  maskedAccounts: { name: string; username?: string; maskedEmail: string }[];
}

export interface PasskeyLoginEmailVerification {
  requiresEmailVerification: true;
  sessionId: string;
  maskedEmail: string;
  username: string;
  message: string;
  devSignInUrl?: string;
}

export type PasskeyLoginResult = AuthResult | PasskeyLoginDisambiguation | PasskeyLoginEmailVerification;

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  registerAdmin: (payload: { name: string; email?: string; password?: string; passkey?: string; collegeName?: string; university?: string }) => Promise<AuthResult>;
  loginWithGoogle: (payload: { credential?: string; mockEmail?: string; name?: string }) => Promise<AuthResult>;
  loginWithPasskey: (passkey: string, email?: string) => Promise<PasskeyLoginResult>;
  verifyPasskeyMagicToken: (magicToken: string, sessionId?: string) => Promise<AuthResult>;
  setSession: (token: string, user: any, needsOnboarding?: boolean) => AuthResult;
  setupPasskey: (passkey: string) => Promise<{ success: boolean; message: string; hasPasskey: boolean }>;
  revokePasskey: () => Promise<void>;
  completeOnboarding: (collegeName: string, university?: string) => Promise<User>;
  joinEventByCode: (payload: { eventCode: string; name: string; regNo: string; department?: string; year?: string; password: string }) => Promise<{ user: User; event: any }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('debugarena_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const setSession = (receivedToken: string, receivedUser: any, needsOnboarding?: boolean): AuthResult => {
    localStorage.setItem('debugarena_token', receivedToken);
    if (receivedUser.collegeId) {
      localStorage.setItem('debugarena_active_college_id', receivedUser.collegeId);
    }
    setToken(receivedToken);

    const formattedUser: AuthResult = {
      id: receivedUser.id || receivedUser._id,
      username: receivedUser.username,
      name: receivedUser.name,
      email: receivedUser.email,
      role: receivedUser.role,
      collegeId: receivedUser.collegeId,
      eventId: receivedUser.eventId,
      hasPasskey: Boolean(receivedUser.hasPasskey),
      needsOnboarding: Boolean(
        needsOnboarding ??
        receivedUser.needsOnboarding ??
        (!receivedUser.collegeId && receivedUser.role !== 'participant')
      ),
      isDisqualified: receivedUser.isDisqualified,
      disqualificationReason: receivedUser.disqualificationReason
    };

    setUser(formattedUser);
    connectSocket(receivedToken);
    return formattedUser;
  };

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('debugarena_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    setToken(savedToken);

    try {
      const res = await api.get('/auth/me');
      const userData = res.data.user;
      const needsOnboarding = Boolean(
        res.data.needsOnboarding ||
        userData.needsOnboarding ||
        (!userData.collegeId && userData.role !== 'participant')
      );
      setUser({
        id: userData._id || userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        collegeId: userData.collegeId,
        eventId: userData.eventId,
        hasPasskey: Boolean(userData.hasPasskey),
        needsOnboarding,
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

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'debugarena_token') {
        if (!e.newValue) {
          setToken(null);
          setUser(null);
          disconnectSocket();
        } else {
          setToken(e.newValue);
          refreshUser();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (username: string, password: string): Promise<AuthResult> => {
    const res = await api.post('/auth/login', { username, password });
    const { token: receivedToken, user: receivedUser, needsOnboarding } = res.data;
    return setSession(receivedToken, receivedUser, needsOnboarding);
  };

  const registerAdmin = async (payload: { name: string; email?: string; password?: string; passkey?: string; collegeName?: string; university?: string }): Promise<AuthResult> => {
    const res = await api.post('/auth/register-admin', payload);
    const { token: receivedToken, user: receivedUser, needsOnboarding } = res.data;
    return setSession(receivedToken, receivedUser, needsOnboarding);
  };

  const loginWithGoogle = async (payload: { credential?: string; mockEmail?: string; name?: string }): Promise<AuthResult> => {
    const res = await api.post('/auth/google', payload);
    const { token: receivedToken, user: receivedUser, needsOnboarding } = res.data;
    return setSession(receivedToken, receivedUser, needsOnboarding);
  };

  const completeOnboarding = async (collegeName: string, university?: string): Promise<User> => {
    const res = await api.post('/auth/onboarding', { collegeName, university });
    const { token: receivedToken, user: receivedUser, college } = res.data;

    if (receivedToken) {
      localStorage.setItem('debugarena_token', receivedToken);
      setToken(receivedToken);
    }
    if (college?._id) {
      localStorage.setItem('debugarena_active_college_id', college._id);
    }

    const formattedUser: User = {
      id: receivedUser.id || receivedUser._id,
      username: receivedUser.username,
      name: receivedUser.name,
      email: receivedUser.email,
      role: receivedUser.role,
      collegeId: receivedUser.collegeId,
      hasPasskey: Boolean(receivedUser.hasPasskey ?? user?.hasPasskey),
      needsOnboarding: false
    };

    setUser(formattedUser);
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

  const loginWithPasskey = async (passkey: string, email?: string): Promise<PasskeyLoginResult> => {
    const res = await api.post('/auth/passkey/login', { passkey, email });
    if (res.data.requiresEmail) {
      return res.data as PasskeyLoginDisambiguation;
    }
    if (res.data.requiresEmailVerification) {
      return res.data as PasskeyLoginEmailVerification;
    }

    const { token: receivedToken, user: receivedUser, needsOnboarding } = res.data;
    return setSession(receivedToken, receivedUser, needsOnboarding);
  };

  const verifyPasskeyMagicToken = async (magicToken: string, sessionId?: string): Promise<AuthResult> => {
    const res = await api.post('/auth/passkey/verify-magic-token', { token: magicToken, sessionId });
    const { token: receivedToken, user: receivedUser, needsOnboarding } = res.data;
    return setSession(receivedToken, receivedUser, needsOnboarding);
  };

  const setupPasskey = async (passkey: string): Promise<{ success: boolean; message: string; hasPasskey: boolean }> => {
    const res = await api.post('/auth/passkey/setup', { passkey });
    setUser(prev => prev ? { ...prev, hasPasskey: true } : prev);
    return res.data;
  };

  const revokePasskey = async (): Promise<void> => {
    await api.delete('/auth/passkey');
    setUser(prev => prev ? { ...prev, hasPasskey: false } : prev);
  };

  const logout = () => {
    localStorage.removeItem('debugarena_token');
    localStorage.removeItem('debugarena_active_college_id');
    localStorage.removeItem('debugarena_active_event_id');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerAdmin,
        loginWithGoogle,
        loginWithPasskey,
        verifyPasskeyMagicToken,
        setSession,
        setupPasskey,
        revokePasskey,
        completeOnboarding,
        joinEventByCode,
        logout,
        refreshUser
      }}
    >
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
