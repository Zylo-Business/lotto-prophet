import axios, { AxiosError } from "axios";
import type { DrawFlat } from "./draws";

// ─── Types ───────────────────────────────────────────────────────────

export interface Lapping2Response {
  source: string;
  columns: "main" | "machine" | "all";
  total: number;
  draws: DrawFlat[];
  grid: number[][];
  columnNames: string[];
  highlights: boolean[][];
  lappingRows: number[];
  patternRows: number[][]; // 2 × numCols
}

export interface Lapping3Response {
  source: string;
  columns: "main" | "machine" | "all";
  total: number;
  draws: DrawFlat[];
  grid: number[][];
  columnNames: string[];
  highlights: boolean[][];
  lappingRows: number[];
  patternRows: number[][]; // 3 × numCols
}

// ─── Base URL ────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: `${BASE_URL}/api/tools`,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data?.error) {
    return err.response.data.error;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── API functions ───────────────────────────────────────────────────

/**
 * Fetch lapping-2 analysis.
 * @param patternRows - optional 2×numCols grid. If omitted, server detects all two-lapping.
 */
export async function fetchLapping2(
  source: string,
  columns: "main" | "machine" | "all" = "main",
  limit = 200,
  patternRows?: number[][],
): Promise<Lapping2Response> {
  try {
    const params: Record<string, string | number> = { columns, limit };
    if (patternRows && patternRows.length >= 2) {
      params.row1 = patternRows[0].join(",");
      params.row2 = patternRows[1].join(",");
    }
    const { data } = await api.get<Lapping2Response>(
      `/lapping-2/${encodeURIComponent(source)}`,
      { params },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to run lapping-2 analysis"));
  }
}

/**
 * Fetch lapping-3 analysis.
 * @param patternRows - optional 3×numCols grid. If omitted, server uses default pattern.
 */
export async function fetchLapping3(
  source: string,
  columns: "main" | "machine" | "all" = "main",
  limit = 200,
  patternRows?: number[][],
): Promise<Lapping3Response> {
  try {
    const params: Record<string, string | number> = { columns, limit };
    if (patternRows && patternRows.length >= 3) {
      params.row1 = patternRows[0].join(",");
      params.row2 = patternRows[1].join(",");
      params.row3 = patternRows[2].join(",");
    }
    const { data } = await api.get<Lapping3Response>(
      `/lapping-3/${encodeURIComponent(source)}`,
      { params },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to run lapping-3 analysis"));
  }
}
