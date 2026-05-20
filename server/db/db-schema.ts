// Database Entity Interfaces

export interface Day {
  id: number;
  date: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  weekday: number; // 0=Sunday … 6=Saturday
  weekday_name: string;
}

export interface Draw {
  id: number;
  event_number: number;
  day_id: number;
  source: string; // 'alpha' | 'lucky'
}

export interface NumberSet {
  id: number;
  draw_id: number;
  set_type: 'N' | 'M'; // N for main numbers, M for mega numbers
}

export interface Number {
  id: number;
  number_set_id: number;
  position: number; // 1-5
  value: number;
}

export interface User {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  country_code: string;
  mobile_number: string;
  referral_code: string | null;
  password_hash: string;
  date_of_birth: string; // YYYY-MM-DD
  reset_token: string | null;
  reset_token_expires: string | null;
  created_at: string;
}

// Auth request/response interfaces
export interface RegisterRequest {
  firstname: string;
  surname: string;
  email: string;
  country_code: string;
  mobile_number: string;
  referral_code?: string;
  password: string;
  date_of_birth: string;
}

export interface LoginRequest {
  identifier: string; // email or phone number
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password_hash' | 'reset_token' | 'reset_token_expires'>;
}

export interface Prediction {
  id: number;
  user_id: number | null;
  predicted_numbers: string; // JSON string
  prediction_date: string;
}

export interface CommunityGroup {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  is_private: 0 | 1;
  join_code: string | null;
  created_at: string;
}

export interface CommunityPost {
  id: number;
  group_id: number;
  user_id: number;
  title: string;
  body: string;
  post_type: 'discussion' | 'forecast';
  predicted_numbers: string | null;
  created_at: string;
}

// Flat view interface for easy data access
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

// API Request/Response interfaces
export interface CreateDrawRequest {
  event_number: number;
  date: string;
  n_numbers: number[]; // Array of 5 main numbers
  m_numbers?: number[]; // Array of 5 mega numbers (optional)
}

export interface DrawResponse extends DrawFlat {
  id: number;
}

// Utility types
export type NumberSetType = 'N' | 'M';
export type WeekdayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;
