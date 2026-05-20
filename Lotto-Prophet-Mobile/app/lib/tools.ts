import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { DrawFlat } from './draws';

// ─── Types ───────────────────────────────────────────────────────────

export interface Lapping2Response {
  source: string;
  columns: 'main' | 'machine' | 'all';
  total: number;
  draws: DrawFlat[];
  grid: number[][];
  columnNames: string[];
  highlights: boolean[][];
  lappingRows: number[];
  patternRows: number[][];   // 2 × numCols — the pattern that was used
}

export interface Lapping3Response {
  source: string;
  columns: 'main' | 'machine' | 'all';
  total: number;
  draws: DrawFlat[];
  grid: number[][];
  columnNames: string[];
  highlights: boolean[][];
  lappingRows: number[];
  patternRows: number[][];   // 3 × numCols — the pattern that was used
}

// ─── Base URL (same logic as draws.ts) ───────────────────────────────

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

console.log('[tools] API base URL:', `${BASE_URL}/api/tools`);

const api = axios.create({
  baseURL: `${BASE_URL}/api/tools`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

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

// ─── API functions ───────────────────────────────────────────────────

/**
 * Fetch lapping-2 analysis.
 * @param patternRows - optional 2×numCols grid of user-entered pattern numbers.
 *                      If omitted or all-zero, the server detects all two-lapping.
 */
export async function fetchLapping2(
  source: string,
  columns: 'main' | 'machine' | 'all' = 'main',
  limit = 200,
  patternRows?: number[][],
): Promise<Lapping2Response> {
  try {
    const params: Record<string, string | number> = { columns, limit };
    if (patternRows && patternRows.length >= 2) {
      params.row1 = patternRows[0].join(',');
      params.row2 = patternRows[1].join(',');
    }
    console.log('[tools] Fetching lapping-2 for:', source, params);
    const { data } = await api.get<Lapping2Response>(
      `/lapping-2/${encodeURIComponent(source)}`,
      { params },
    );
    console.log('[tools] Lapping-2 result: draws=', data.total, 'lapping=', data.lappingRows.length);
    return data;
  } catch (err) {
    console.error('[tools] Error fetching lapping-2:', (err as any)?.message);
    throw new Error(extractError(err, 'Failed to run lapping-2 analysis'));
  }
}

/**
 * Fetch lapping-3 analysis.
 * @param patternRows - optional 3×numCols grid of user-entered pattern numbers.
 *                      If omitted, the server uses the default lapping-3 pattern.
 */
export async function fetchLapping3(
  source: string,
  columns: 'main' | 'machine' | 'all' = 'main',
  limit = 200,
  patternRows?: number[][],
): Promise<Lapping3Response> {
  try {
    const params: Record<string, string | number> = { columns, limit };
    if (patternRows && patternRows.length >= 3) {
      params.row1 = patternRows[0].join(',');
      params.row2 = patternRows[1].join(',');
      params.row3 = patternRows[2].join(',');
    }
    console.log('[tools] Fetching lapping-3 for:', source, params);
    const { data } = await api.get<Lapping3Response>(
      `/lapping-3/${encodeURIComponent(source)}`,
      { params },
    );
    console.log('[tools] Lapping-3 result: draws=', data.total, 'lapping=', data.lappingRows.length);
    return data;
  } catch (err) {
    console.error('[tools] Error fetching lapping-3:', (err as any)?.message);
    throw new Error(extractError(err, 'Failed to run lapping-3 analysis'));
  }
}

// Placeholder default export so Expo Router will not treat this file as a screen route
export default function _ToolsLibRoute() {
  return null;
}
