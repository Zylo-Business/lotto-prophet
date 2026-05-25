import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Types matching the server schema ────────────────────────────────

export type User = {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  country_code: string;
  mobile_number: string;
  referral_code: string | null;
  date_of_birth: string;
  created_at: string;
  avatar_url?: string | null;
};

export type AuthResponse = {
  message: string;
  token?: string;
  refresh_token?: string;
  user?: User;
};

export type RegisterData = {
  firstname: string;
  surname: string;
  email: string;
  country_code: string;
  mobile_number: string;
  referral_code?: string;
  password: string;
  date_of_birth: string;
};

export type ForgotPasswordResponse = {
  message: string;
  reset_token?: string; // only in dev
};

export type ResetPasswordResponse = {
  message: string;
};

// ─── Base URL helper ─────────────────────────────────────────────────

// IPv4 regex to distinguish real IPs from tunnel hostnames like *.exp.direct
const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function getDevHost(): string {
  // Try every known Expo constant that carries the dev machine IP.
  // These are populated when you run `npx expo start` in LAN mode.
  const candidates: (string | undefined | null)[] = [
    (Constants.expoConfig as any)?.hostUri,
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost,
    (Constants.manifest as any)?.debuggerHost,
    (Constants.manifest2 as any)?.launchAsset?.url,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;

    // Extract hostname/IP — strip port, strip protocol
    let host = raw;
    // Remove protocol if present (http://...)
    host = host.replace(/^https?:\/\//, '');
    // Remove path
    host = host.split('/')[0];
    // Remove port
    host = host.split(':')[0];

    if (host && IPV4_RE.test(host)) {
      console.log('[auth] Resolved dev host IP from Expo:', host);
      return host;
    }
    console.log('[auth] Expo constant skipped (not an IPv4):', host);
  }

  console.warn('[auth] Could not auto-detect dev host IP from Expo constants.');

  // Android emulator localhost alias
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

const SERVER_PORT = 3001;
const resolvedHost = getDevHost();
const BASE_URL = `http://${resolvedHost}:${SERVER_PORT}`;

console.log('[auth] Platform:', Platform.OS);
console.log('[auth] API base URL:', BASE_URL);
console.log('[auth] Expo constants debug:', JSON.stringify({
  hostUri: (Constants.expoConfig as any)?.hostUri ?? null,
  debuggerHost: (Constants.manifest as any)?.debuggerHost ?? null,
  manifest2DebuggerHost: (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost ?? null,
}, null, 2));

// ─── Axios instance ──────────────────────────────────────────────────

const api = axios.create({
  baseURL: `${BASE_URL}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000, // 20 seconds – generous for slow networks
});

/** Extract a readable error message from an Axios error */
function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    // Server returned an error response
    if (err.response?.data?.error) return err.response.data.error;
    if (err.response?.data?.message) return err.response.data.message;

    // Network-level errors (no response received)
    if (err.code === 'ECONNABORTED')
      return 'Request timed out. Check your connection.';
    if (err.code === 'ERR_NETWORK')
      return `Cannot reach the server at ${BASE_URL}. Make sure the server is running and your device is on the same Wi-Fi network.`;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Connectivity check ─────────────────────────────────────────────

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await axios.get(BASE_URL, { timeout: 5000 });
    console.log('[auth] Server health check OK:', res.status);
    return true;
  } catch (err) {
    console.warn('[auth] Server health check FAILED:', (err as any)?.message);
    return false;
  }
}

// ─── API functions ───────────────────────────────────────────────────

export async function getCurrentUser(token: string): Promise<User> {
  try {
    const { data } = await axios.get<{ user: User }>(
      `${BASE_URL}/api/auth/me`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data.user;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to restore user session'));
  }
}

export async function login(
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  try {
    console.log('[auth] Logging in...');
    const { data } = await api.post<AuthResponse>('/login', {
      identifier,
      password,
    });
    console.log('[auth] Login success');
    return data;
  } catch (err) {
    console.error('[auth] Login error:', (err as any)?.message);
    throw new Error(extractError(err, 'Login failed'));
  }
}

export async function register(
  registerData: RegisterData,
): Promise<AuthResponse> {
  try {
    console.log('[auth] Registering to:', `${BASE_URL}/api/auth/register`);
    console.log('[auth] Payload keys:', Object.keys(registerData).join(', '));
    const { data } = await api.post<AuthResponse>('/register', registerData);
    console.log('[auth] Register success:', data.message);
    return data;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.error('[auth] Register error detail:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        serverError: err.response?.data,
        url: err.config?.url,
        baseURL: err.config?.baseURL,
      });
    } else {
      console.error('[auth] Register error:', err);
    }
    throw new Error(extractError(err, 'Registration failed'));
  }
}

export async function forgotPassword(
  email: string,
): Promise<ForgotPasswordResponse> {
  try {
    const { data } = await api.post<ForgotPasswordResponse>(
      '/forgot-password',
      { email },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to send reset request'));
  }
}

export type ProfileUpdateData = {
  firstname: string;
  surname: string;
  country_code: string;
  mobile_number: string;
  date_of_birth: string;
};

export async function updateProfile(token: string, data: ProfileUpdateData): Promise<User> {
  try {
    const { data: res } = await axios.put<{ message: string; user: User }>(
      `${BASE_URL}/api/auth/profile`,
      data,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res.user;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to update profile'));
  }
}

export async function uploadAvatar(token: string, imageUri: string, mimeType = 'image/jpeg'): Promise<User> {
  const filename = imageUri.split('/').pop() ?? 'avatar.jpg';
  const formData = new FormData();
  formData.append('avatar', { uri: imageUri, type: mimeType, name: filename } as any);
  const response = await fetch(`${BASE_URL}/api/auth/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to upload avatar');
  return data.user as User;
}

export const getBaseUrl = () => BASE_URL;

export async function changePassword(
  token: string,
  current_password: string,
  new_password: string,
): Promise<void> {
  try {
    await axios.put(
      `${BASE_URL}/api/auth/change-password`,
      { current_password, new_password },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    throw new Error(extractError(err, 'Failed to change password'));
  }
}

export async function resetPassword(
  token: string,
  new_password: string,
): Promise<ResetPasswordResponse> {
  try {
    const { data } = await api.post<ResetPasswordResponse>('/reset-password', {
      token,
      new_password,
    });
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to reset password'));
  }
}

export async function refreshAccessToken(
  refresh_token: string,
): Promise<{ token: string; refresh_token: string }> {
  try {
    const { data } = await api.post<{ token: string; refresh_token: string }>(
      '/refresh',
      { refresh_token },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Session expired. Please log in again.'));
  }
}

export async function serverLogout(refresh_token: string): Promise<void> {
  try {
    await api.post('/logout', { refresh_token });
  } catch {
    // Best-effort
  }
}

// Placeholder default export so Expo Router will not treat this file as a screen route
export default function _AuthLibRoute() {
  return null;
}
