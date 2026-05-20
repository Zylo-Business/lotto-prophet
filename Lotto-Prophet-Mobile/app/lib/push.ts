/**
 * Push Notifications — DISABLED
 *
 * expo-notifications is not supported in Expo Go (SDK 53+).
 * All exports are stubbed as no-ops until a development build is configured.
 *
 * To re-enable:
 * 1. Run `eas init` to create a project on expo.dev
 * 2. Run `npx expo prebuild` or `eas build` to create a dev build
 * 3. Restore the original implementation from git history / server-spec
 */

// ─── No-op stubs ─────────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  console.log('[push] Push notifications are disabled (Expo Go not supported). Use a development build.');
  return null;
}

export function addNotificationReceivedListener(_callback: (notification: any) => void) {
  // no-op
  return { remove: () => {} };
}

export function addNotificationResponseListener(_callback: (response: any) => void) {
  // no-op
  return { remove: () => {} };
}

// Placeholder default export so Expo Router will not treat this file as a screen route
export default function _PushRoute() {
  return null;
}
