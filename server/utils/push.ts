import { dbAll } from '../db/db.js';

// Expo Push Notification endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  channelId?: string;
}

/**
 * Send push notifications to all registered devices.
 * Uses Expo's push notification service — works with Expo Go and standalone builds.
 */
export async function sendPushToAll(
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<{ sent: number; failed: number }> {
  // Get all stored push tokens
  const tokens = await dbAll('SELECT token FROM push_tokens');

  if (tokens.length === 0) {
    console.log('[push] No push tokens registered — skipping notification.');
    return { sent: 0, failed: 0 };
  }

  // Build messages (batch up to 100 per request per Expo docs)
  const messages: ExpoPushMessage[] = tokens.map((row: any) => ({
    to: row.token,
    title,
    body,
    sound: 'default',
    channelId: 'draws',
    data: data ?? {},
  }));

  let sent = 0;
  let failed = 0;

  // Send in batches of 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();
      if (result.data) {
        for (const ticket of result.data) {
          if (ticket.status === 'ok') sent++;
          else failed++;
        }
      }
      console.log(`[push] Batch sent: ${batch.length} messages, ${sent} ok, ${failed} failed`);
    } catch (err) {
      console.error('[push] Failed to send batch:', err);
      failed += batch.length;
    }
  }

  return { sent, failed };
}
