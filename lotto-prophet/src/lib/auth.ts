import axios, { AxiosError } from "axios";

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
  role: 'user' | 'admin';
  created_at: string;
};

export type AuthResponse = {
  message: string;
  token?: string;
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
  reset_token?: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type ProfileUpdateData = {
  firstname: string;
  surname: string;
  country_code: string;
  mobile_number: string;
  date_of_birth: string;
};

// ─── Base URL ────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: `${BASE_URL}/api/auth`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

/** Extract a readable error message from an Axios error */
function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data?.error) {
    return err.response.data.error;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── API functions ───────────────────────────────────────────────────

export async function login(
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>("/login", {
      identifier,
      password,
    });
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Login failed"));
  }
}

export async function register(
  registerData: RegisterData,
): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>("/register", registerData);
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Registration failed"));
  }
}

export async function forgotPassword(
  email: string,
): Promise<ForgotPasswordResponse> {
  try {
    const { data } = await api.post<ForgotPasswordResponse>(
      "/forgot-password",
      { email },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to send reset request"));
  }
}

export async function resetPassword(
  token: string,
  new_password: string,
): Promise<ResetPasswordResponse> {
  try {
    const { data } = await api.post<ResetPasswordResponse>("/reset-password", {
      token,
      new_password,
    });
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to reset password"));
  }
}

export async function getCurrentUser(token: string): Promise<User> {
  try {
    const { data } = await api.get<{ user: User }>("/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.user;
  } catch (err) {
    throw new Error(extractError(err, "Failed to fetch user"));
  }
}

export async function updateProfile(
  token: string,
  profileData: ProfileUpdateData,
): Promise<{ message: string; user: User }> {
  try {
    const { data } = await api.put<{ message: string; user: User }>(
      "/profile",
      profileData,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to update profile"));
  }
}

export async function changePassword(
  token: string,
  current_password: string,
  new_password: string,
): Promise<{ message: string }> {
  try {
    const { data } = await api.put<{ message: string }>(
      "/change-password",
      { current_password, new_password },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to change password"));
  }
}
