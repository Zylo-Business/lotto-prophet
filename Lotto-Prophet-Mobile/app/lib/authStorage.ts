import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export async function saveToken(token: string) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    console.warn('Failed to save token', e);
    throw e;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    console.warn('Failed to get token', e);
    return null;
  }
}

export async function deleteToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {
    console.warn('Failed to delete token', e);
    throw e;
  }
}

export async function saveRefreshToken(token: string) {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (e) {
    console.warn('Failed to save refresh token', e);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.warn('Failed to get refresh token', e);
    return null;
  }
}

export async function deleteRefreshToken() {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.warn('Failed to delete refresh token', e);
  }
}

// Placeholder default export so Expo Router will not treat this file as a screen route
export default function _AuthStorageRoute() {
  return null;
}
