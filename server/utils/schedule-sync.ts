/**
 * Cron Job Setup for Google Drive Sync
 */

import * as cron from 'node-cron';
import { syncGoogleDrive } from './sync-google-drive.js';

export function setupSyncCron() {
  console.log('Setting up cron job for Google Drive sync...');

  // Schedule to run every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled Google Drive sync...');
    try {
      await syncGoogleDrive();
      console.log('Scheduled sync completed');
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  });

  console.log('Cron job scheduled. The sync will run every day at 2 AM.');
}

// Allow running directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupSyncCron();
}
