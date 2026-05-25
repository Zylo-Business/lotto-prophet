import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────

export interface DrawSource {
  source: string;
  draw_count: number;
}

export interface DrawFlat {
  event_number: number;
  date: string;
  source: string;
  N1: number;
  N2: number;
  N3: number;
  N4: number;
  N5: number;
  n_sum: number;
  M1: number | null;
  M2: number | null;
  M3: number | null;
  M4: number | null;
  M5: number | null;
  m_sum: number;
}

export interface DrawsBySourceResponse {
  source: string;
  total: number;
  limit: number;
  offset: number;
  draws: DrawFlat[];
}

// ─── Base URL (reuses same logic as auth.ts) ─────────────────────────

const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function getDevHost(): string {
  const candidates: (string | undefined | null)[] = [
    (Constants.expoConfig as any)?.hostUri,
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost,
    (Constants.manifest as any)?.debuggerHost,
    (Constants.manifest2 as any)?.launchAsset?.url,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    let host = raw.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    if (host && IPV4_RE.test(host)) return host;
  }

  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

const SERVER_PORT = 3001;
const BASE_URL = `http://${getDevHost()}:${SERVER_PORT}`;

console.log('[draws] API base URL:', `${BASE_URL}/api/draws`);

const api = axios.create({
  baseURL: `${BASE_URL}/api/draws`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

/** Extract a readable error message from an Axios error */
function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    if (err.response?.data?.error) return err.response.data.error;
    if (err.response?.data?.message) return err.response.data.message;
    if (err.code === 'ECONNABORTED') return 'Request timed out. Check your connection.';
    if (err.code === 'ERR_NETWORK')
      return `Cannot reach the server at ${BASE_URL}. Make sure the server is running and your device is on the same Wi-Fi network.`;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Display name mapping ────────────────────────────────────────────

/** Convert a raw source name to a user-friendly display name */
export function getDrawDisplayName(source: string): string {
  const map: Record<string, string> = {
    lucky: 'Lucky Tuesday',
    alpha: 'Alpha Lotto',
    'alpha one': 'Alpha One',
    'alpha express': 'Alpha Express',
    express: 'Alpha Express',
    nla: 'NLA',
    'nla rush': 'NLA Rush',
    rush: 'NLA Rush',
  };
  return map[source.toLowerCase()] ?? source;
}

/** Get an icon name for a draw source */
export function getDrawIcon(source: string): string {
  const map: Record<string, string> = {
    lucky: 'star',
    alpha: 'trophy',
    'alpha one': 'medal',
    'alpha express': 'flash',
    express: 'flash',
    nla: 'radio-button-on',
    'nla rush': 'rocket',
    rush: 'rocket',
  };
  return map[source.toLowerCase()] ?? 'ticket';
}

/** Get a color for a draw source */
export function getDrawColor(source: string): string {
  const map: Record<string, string> = {
    lucky: '#F59E0B',
    alpha: '#6C63FF',
    'alpha one': '#8B5CF6',
    'alpha express': '#EC4899',
    express: '#EC4899',
    nla: '#10B981',
    'nla rush': '#EF4444',
    rush: '#EF4444',
  };
  return map[source.toLowerCase()] ?? '#10B981';
}

// ─── API functions ───────────────────────────────────────────────────

/** Fetch all distinct draw sources with their counts */
export async function fetchDrawSources(): Promise<DrawSource[]> {
  try {
    console.log('[draws] Fetching sources from:', `${BASE_URL}/api/draws/sources`);
    const { data } = await api.get<DrawSource[]>('/sources');
    console.log('[draws] Sources loaded:', data.length);
    return data;
  } catch (err) {
    console.error('[draws] Error fetching sources:', (err as any)?.message);
    throw new Error(extractError(err, 'Failed to load draws'));
  }
}

/** Fetch draws for a specific source with pagination */
export async function fetchDrawsBySource(
  source: string,
  limit = 30,
  offset = 0,
): Promise<DrawsBySourceResponse> {
  try {
    console.log('[draws] Fetching draws for:', source, 'limit:', limit, 'offset:', offset);
    const { data } = await api.get<DrawsBySourceResponse>(
      `/${encodeURIComponent(source)}`,
      { params: { limit, offset } },
    );
    console.log('[draws] Draws loaded:', data.draws?.length, 'of', data.total);
    return data;
  } catch (err) {
    console.error('[draws] Error fetching draws for source:', source, (err as any)?.message);
    throw new Error(extractError(err, `Failed to load ${source} draws`));
  }
}

// Placeholder default export so Expo Router will not treat this file as a screen route
export default function _DrawsLibRoute() {
  return null;
}
