import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types/torii';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    email: 'socio1@torii.com',
    password: 'socio123',
    user: {
      id: '2',
      email: 'socio1@torii.com',
      name: 'Carlos Mendez',
      role: 'socio',
    },
  },
  {
    email: 'socio2@torii.com',
    password: 'socio123',
    user: {
      id: '3',
      email: 'socio2@torii.com',
      name: 'Ana García',
      role: 'socio',
    },
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    const found = USERS.find(
      (u) => u.email === email && u.password === password
    );
    if (found) {
      setUser(found.user);
      return true;
    }
    return false;
  };

  const logout = () => {
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
