'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  signupWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persist = useCallback((nextUser: User | null, nextToken: string | null) => {
    if (typeof window === 'undefined') return;
    if (!nextUser || !nextToken) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return;
    }
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    persist(null, null);
    // 크레딧 UI 등 즉시 갱신
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('billing:refresh'));
    }
  }, [persist]);

  const setSession = useCallback(
    (nextUser: User, nextToken: string) => {
      setUser(nextUser);
      setToken(nextToken);
      persist(nextUser, nextToken);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('billing:refresh'));
      }
    },
    [persist],
  );

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.detail || '로그인에 실패했습니다.');
      }
      setSession(
        {
          id: data?.user?.email || email,
          email: data?.user?.email || email,
          name: data?.user?.name || (email.includes('@') ? email.split('@')[0] : email),
        },
        data?.access_token,
      );
    },
    [setSession],
  );

  const signupWithPassword = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.detail || '회원가입에 실패했습니다.');
      }
      setSession(
        {
          id: data?.user?.email || email,
          email: data?.user?.email || email,
          name: data?.user?.name || (email.includes('@') ? email.split('@')[0] : email),
        },
        data?.access_token,
      );
    },
    [setSession],
  );

  // 부팅 시 토큰이 있으면 /auth/me로 검증
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (typeof window === 'undefined') return;
      try {
        const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const savedUser = localStorage.getItem(AUTH_USER_KEY);
        if (!savedToken) {
          if (!cancelled) {
            setToken(null);
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        const res = await fetch(`${BACKEND_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        const me = await safeJson(res);
        if (!res.ok) {
          // 토큰 만료/무효
          if (!cancelled) {
            logout();
            setIsLoading(false);
          }
          return;
        }

        const hydratedUser: User = {
          id: me?.email || (savedUser ? JSON.parse(savedUser).email : 'user'),
          email: me?.email || (savedUser ? JSON.parse(savedUser).email : 'user'),
          name: me?.name || (savedUser ? JSON.parse(savedUser).name : 'User'),
        };

        if (!cancelled) {
          setToken(savedToken);
          setUser(hydratedUser);
          persist(hydratedUser, savedToken);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          logout();
          setIsLoading(false);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [logout, persist]);

  // 같은 탭 내에서도 다른 컴포넌트들이 변경을 따라가도록 storage 이벤트를 사용
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_TOKEN_KEY && e.key !== AUTH_USER_KEY) return;
      const nextToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const nextUserRaw = localStorage.getItem(AUTH_USER_KEY);
      setToken(nextToken);
      setUser(nextUserRaw ? (JSON.parse(nextUserRaw) as User) : null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: user !== null && token !== null,
      isLoading,
      loginWithPassword,
      signupWithPassword,
      logout,
    }),
    [user, token, isLoading, loginWithPassword, signupWithPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}


