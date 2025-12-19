import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/torii';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const SESSION_KEY = 'torii_session';

interface StoredSession {
  user: User;
  expiresAt: number;
}

// Hardcoded users
const USERS: { email: string; password: string; user: User }[] = [
  {
    email: 'admin@torii.com',
    password: 'admin123',
    user: {
      id: '1',
      email: 'admin@torii.com',
      name: 'Admin Torii',
      role: 'admin',
    },
  },
  {
    email: 'benjamin@torii.com',
    password: 'benjamin123',
    user: {
      id: '2',
      email: 'benjamin@torii.com',
      name: 'Benjamin',
      role: 'socio',
    },
  },
  {
    email: 'luciano@torii.com',
    password: 'luciano123',
    user: {
      id: '3',
      email: 'luciano@torii.com',
      name: 'Luciano',
      role: 'socio',
    },
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const session: StoredSession = JSON.parse(storedSession);
        if (session.expiresAt > Date.now()) {
          setUser(session.user);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  // Check session expiry periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        try {
          const session: StoredSession = JSON.parse(storedSession);
          if (session.expiresAt <= Date.now()) {
            setUser(null);
            localStorage.removeItem(SESSION_KEY);
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const login = (email: string, password: string): boolean => {
    const found = USERS.find(
      (u) => u.email === email && u.password === password
    );
    if (found) {
      const session: StoredSession = {
        user: found.user,
        expiresAt: Date.now() + SESSION_DURATION,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser(found.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
