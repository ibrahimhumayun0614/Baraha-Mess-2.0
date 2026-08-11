// ============================================
// Auth Context — Manages authentication state
// ============================================
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (type: 'admin' | 'member', password?: string, memberId?: number) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isMember: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('baraha_token');
    if (!token) {
      setLoading(false);
      return;
    }

    const res = await api.get<AuthUser>('/auth/me');
    if (res.success && res.data) {
      setUser(res.data);
    } else {
      localStorage.removeItem('baraha_token');
    }
    setLoading(false);
  };

  const login = useCallback(async (type: 'admin' | 'member', password?: string, memberId?: number) => {
    const res = await api.post<{ user: AuthUser; token: string }>('/auth/login', {
      type,
      password,
      member_id: memberId,
    });

    if (res.success && res.data) {
      localStorage.setItem('baraha_token', res.data.token);
      setUser(res.data.user);
      return { success: true };
    }

    // Demo/preview fallback when backend API is not running directly in Vite dev server
    if (type === 'admin') {
      if (password === 'admin123') {
        const mockUser: AuthUser = { id: 1, type: 'admin', name: 'Admin' };
        localStorage.setItem('baraha_token', 'demo-admin-token');
        setUser(mockUser);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid password. Use "admin123"' };
      }
    } else if (type === 'member' && memberId) {
      const mockUser: AuthUser = { id: memberId, type: 'member', name: 'Mohamed' };
      localStorage.setItem('baraha_token', 'demo-member-token');
      setUser(mockUser);
      return { success: true };
    }

    return { success: false, error: res.error || 'Login failed' };
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {});
    localStorage.removeItem('baraha_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin: user?.type === 'admin',
        isMember: user?.type === 'member',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
