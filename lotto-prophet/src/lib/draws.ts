import axios, { AxiosError } from "axios";

// ─── Types ───────────────────────────────────────────────────────────

export type DrawSource = {
  source: string;
  draw_count: number;
};

export type DrawFlat = {
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
};

export type DrawsBySourceResponse = {
  source: string;
  total: number;
  limit: number;
  offset: number;
  draws: DrawFlat[];
};

// ─── Base URL ────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: `${BASE_URL}/api/draws`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data?.error) {
    return err.response.data.error;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Display helpers ─────────────────────────────────────────────────

const DISPLAY_NAMES: Record<string, string> = {
  lucky: "Lucky Tuesday",
  alpha: "Alpha Lotto",
  "alpha one": "Alpha One",
  "alpha express": "Alpha Express",
  express: "Alpha Express",
  nla: "NLA",
  "nla rush": "NLA Rush",
  rush: "NLA Rush",
};

const SOURCE_COLORS: Record<string, string> = {
  lucky: "#F59E0B",
  alpha: "#6C63FF",
  "alpha one": "#8B5CF6",
  "alpha express": "#EC4899",
  express: "#EC4899",
  nla: "#10B981",
  "nla rush": "#EF4444",
  rush: "#EF4444",
};

const SOURCE_ICONS: Record<string, string> = {
  lucky: "⭐",
  alpha: "🏆",
  "alpha one": "🥇",
  "alpha express": "⚡",
  express: "⚡",
  nla: "🎯",
  "nla rush": "🚀",
  rush: "🚀",
};

export function getDrawDisplayName(source: string): string {
  return DISPLAY_NAMES[source.toLowerCase()] ?? source;
}

export function getDrawColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] ?? "#10B981";
}

export function getDrawIcon(source: string): string {
  return SOURCE_ICONS[source.toLowerCase()] ?? "🎲";
}

// ─── API functions ───────────────────────────────────────────────────

export async function fetchDrawSources(): Promise<DrawSource[]> {
  try {
    const { data } = await api.get<DrawSource[]>("/sources");
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to load draws"));
  }
}

export async function fetchDrawsBySource(
  source: string,
  limit = 30,
  offset = 0,
): Promise<DrawsBySourceResponse> {
  try {
    const { data } = await api.get<DrawsBySourceResponse>(
      `/${encodeURIComponent(source)}`,
      { params: { limit, offset } },
    );
    return data;
  } catch (err) {
    throw new Error(
      extractError(err, `Failed to load ${source} draws`),
    );
  }
}
