import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../lib/auth';
import type { User, RegisterData, ProfileUpdateData } from '../lib/auth';
export { type User };
import { deleteToken, getToken, saveToken, saveRefreshToken, getRefreshToken, deleteRefreshToken } from '../lib/authStorage';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  updateUser: (data: ProfileUpdateData) => Promise<void>;
  updateAvatar: (imageUri: string, mimeType?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        let t = await getToken();
        if (t) {
          try {
            const currentUser = await authApi.getCurrentUser(t);
            setToken(t);
            setUser(currentUser);
          } catch {
            // Access token may be expired — try refreshing
            const rt = await getRefreshToken();
            if (rt) {
              try {
                const refreshed = await authApi.refreshAccessToken(rt);
                await saveToken(refreshed.token);
                await saveRefreshToken(refreshed.refresh_token);
                const currentUser = await authApi.getCurrentUser(refreshed.token);
                setToken(refreshed.token);
                setUser(currentUser);
              } catch {
                await deleteToken();
                await deleteRefreshToken();
                setToken(null);
                setUser(null);
              }
            } else {
              await deleteToken();
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore session', e);
        await deleteToken();
        await deleteRefreshToken();
        setToken(null);
        setUser(null);
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
        if (resp.refresh_token) await saveRefreshToken(resp.refresh_token);
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

  async function updateUser(data: ProfileUpdateData) {
    if (!token) throw new Error('Not authenticated');
    const updated = await authApi.updateProfile(token, data);
    setUser(updated);
  }

  async function updateAvatar(imageUri: string, mimeType?: string) {
    if (!token) throw new Error('Not authenticated');
    const updated = await authApi.uploadAvatar(token, imageUri, mimeType);
    setUser(updated);
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!token) throw new Error('Not authenticated');
    await authApi.changePassword(token, currentPassword, newPassword);
  }

  async function logout() {
    setLoading(true);
    try {
      const rt = await getRefreshToken();
      if (rt) await authApi.serverLogout(rt);
      await deleteToken();
      await deleteRefreshToken();
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
    <AuthContext.Provider value={{ user, token, loading, login, register, forgotPassword, logout, updateUser, updateAvatar, changePassword }}>
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
