import { apiClient } from "./api-client";

export type PublicPrediction = {
  id: number;
  title: string;
  game_name: string;
  draw_date: string;
  numbers: string | null;
  numbers_count: number;
  machine_numbers: string | null;
  notes: string | null;
  prediction_type: "free" | "paid";
  price: number;
  is_unlocked: boolean;
  created_at: string;
};

export async function fetchPredictions(): Promise<PublicPrediction[]> {
  const { data } = await apiClient.get<PublicPrediction[]>("/api/predictions");
  return data;
}

export async function purchasePrediction(id: number): Promise<PublicPrediction> {
  const { data } = await apiClient.post<PublicPrediction>(`/api/predictions/${id}/purchase`);
  return data;
}
