'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  provider?: 'google' | 'facebook' | 'microsoft';
}

const AUTH_STORAGE_KEY = 'auth_user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error('Failed to parse saved user:', e);
          // 파싱 실패 시 기본 사용자로 자동 로그인
          const defaultUser: User = {
            id: 'auto-user',
            email: 'user@example.com',
            name: 'User',
          };
          setUser(defaultUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultUser));
        }
      } else {
        // 저장된 사용자가 없으면 기본 사용자로 자동 로그인
        const defaultUser: User = {
          id: 'auto-user',
          email: 'user@example.com',
          name: 'User',
        };
        setUser(defaultUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultUser));
      }
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userData: User) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const isAuthenticated = user !== null;

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}


