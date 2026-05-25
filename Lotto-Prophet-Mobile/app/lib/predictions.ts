import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type PublicPrediction = {
  id: number;
  title: string;
  game_name: string;
  draw_date: string;
  numbers: string | null;
  numbers_count: number;
  machine_numbers: string | null;
  notes: string | null;
  prediction_type: 'free' | 'paid';
  price: number;
  is_unlocked: boolean;
  created_at: string;
};

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
    const host = raw.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    if (host && IPV4_RE.test(host)) return host;
  }
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

const BASE_URL = `http://${getDevHost()}:3001`;

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data?.error) return String(err.response.data.error);
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function fetchPredictions(token: string): Promise<PublicPrediction[]> {
  try {
    const { data } = await axios.get<PublicPrediction[]>(`${BASE_URL}/api/predictions`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
    });
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch predictions'));
  }
}

export async function purchasePrediction(token: string, id: number): Promise<PublicPrediction> {
  try {
    const { data } = await axios.post<PublicPrediction>(
      `${BASE_URL}/api/predictions/${id}/purchase`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, timeout: 20_000 },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to unlock prediction'));
  }
}
