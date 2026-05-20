/**
 * Google AdMob Configuration
 * 
 * Replace these with your actual AdMob unit IDs from:
 * https://apps.admob.com
 * 
 * Test IDs are provided for development - DO NOT use in production
 */

import { Platform } from 'react-native';

// AdMob App ID (configure in app.json)
export const ADMOB_APP_ID = Platform.select({
  ios: 'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy',
  android: 'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy',
});

// Test Ad Unit IDs (safe to use during development)
const TEST_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  }),
  rewarded: Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
  }),
  rewardedInterstitial: Platform.select({
    ios: 'ca-app-pub-3940256099942544/6978759866',
    android: 'ca-app-pub-3940256099942544/5354046379',
  }),
  native: Platform.select({
    ios: 'ca-app-pub-3940256099942544/3986624511',
    android: 'ca-app-pub-3940256099942544/2247696110',
  }),
};

// Production Ad Unit IDs (replace with your actual IDs)
const PRODUCTION_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-YOUR_ID/BANNER_IOS',
    android: 'ca-app-pub-YOUR_ID/BANNER_ANDROID',
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-YOUR_ID/INTERSTITIAL_IOS',
    android: 'ca-app-pub-YOUR_ID/INTERSTITIAL_ANDROID',
  }),
  rewarded: Platform.select({
    ios: 'ca-app-pub-YOUR_ID/REWARDED_IOS',
    android: 'ca-app-pub-YOUR_ID/REWARDED_ANDROID',
  }),
  rewardedInterstitial: Platform.select({
    ios: 'ca-app-pub-YOUR_ID/REWARDED_INT_IOS',
    android: 'ca-app-pub-YOUR_ID/REWARDED_INT_ANDROID',
  }),
  native: Platform.select({
    ios: 'ca-app-pub-YOUR_ID/NATIVE_IOS',
    android: 'ca-app-pub-YOUR_ID/NATIVE_ANDROID',
  }),
};

// Set to false for production
const USE_TEST_ADS = __DEV__;

export const AD_UNIT_IDS = USE_TEST_ADS ? TEST_IDS : PRODUCTION_IDS;

// Ad configuration
export const AD_CONFIG = {
  // Show interstitial after this many screen navigations
  interstitialFrequency: 3,
  
  // Cooldown between interstitials (ms)
  interstitialCooldown: 60000, // 1 minute
  
  // Reward amounts for watching ads
  rewards: {
    freePrediction: 1,
    bonusNumbers: 3,
    unlockFeature: 1,
  },
  
  // Banner refresh rate (ms)
  bannerRefreshRate: 30000, // 30 seconds
};
