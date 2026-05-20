import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../lib/auth';
import type { User, RegisterData } from '../lib/auth';
import { deleteToken, getToken, saveToken } from '../lib/authStorage';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // On mount, try to restore token
    (async () => {
      try {
        const t = await getToken();
        if (t) {
          setToken(t);
          // Optionally, fetch user profile with token.
          setUser(null); // placeholder: you may fetch /me
        }
      } catch (e) {
        console.warn('Failed to restore token', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(identifier: string, password: string) {
    setLoading(true);
    try {
      const resp = await authApi.login(identifier, password);
      if (resp.token) {
        await saveToken(resp.token);
        setToken(resp.token);
        setUser(resp.user ?? null);
        router.replace('/dashboard');
      } else {
        throw new Error(resp.message || 'No token returned');
      }
    } catch (e: any) {
      // Let calling screen handle the error display
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function register(data: RegisterData) {
    setLoading(true);
    try {
      await authApi.register(data);
      // Don't auto-login — let the register screen show success and redirect to login
    } catch (e: any) {
      // Let calling screen handle the error display
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword(email: string): Promise<string> {
    setLoading(true);
    try {
      const resp = await authApi.forgotPassword(email);
      return resp.message;
    } catch (e: any) {
      // Let calling screen handle the error display
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await deleteToken();
      setToken(null);
      setUser(null);
      router.replace('/');
    } catch (e) {
      console.warn('Logout failed', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, forgotPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Placeholder default export so Expo Router will not treat this file as a screen route
export default function _AuthContextRoute() {
  return null;
}
