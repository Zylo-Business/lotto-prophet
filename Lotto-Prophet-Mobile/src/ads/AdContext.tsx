import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { AD_CONFIG } from './config';

interface AdContextType {
  // State
  isSubscribed: boolean;
  adsEnabled: boolean;
  interstitialLoaded: boolean;
  rewardedLoaded: boolean;
  
  // Actions
  showInterstitial: () => Promise<boolean>;
  showRewarded: (onReward: (amount: number, type: string) => void) => Promise<boolean>;
  incrementScreenCount: () => void;
  setSubscribed: (value: boolean) => void;
  
  // Stats
  screenCount: number;
  lastInterstitialTime: number;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

interface AdProviderProps {
  children: ReactNode;
}

/**
 * Ad Provider - Expo Go Compatible Version
 * 
 * This uses simulated ads that work in Expo Go.
 * For real ads, you need to create a development build:
 * 
 * npx expo prebuild
 * npx expo run:android
 * 
 * Then the native AdMob modules will be available.
 */
export function AdProvider({ children }: AdProviderProps) {
  const [isSubscribed, setSubscribed] = useState(false);
  const [screenCount, setScreenCount] = useState(0);
  const [lastInterstitialTime, setLastInterstitialTime] = useState(0);

  const adsEnabled = !isSubscribed;
  
  // In Expo Go, ads are always "loaded" (simulated)
  const interstitialLoaded = adsEnabled;
  const rewardedLoaded = adsEnabled;

  // Show simulated interstitial ad
  const showInterstitial = useCallback(async (): Promise<boolean> => {
    if (!adsEnabled) return false;

    // Check cooldown
    const now = Date.now();
    if (now - lastInterstitialTime < AD_CONFIG.interstitialCooldown) {
      return false;
    }

    // Simulate interstitial (in dev, this would be a real full-screen ad)
    return new Promise((resolve) => {
      Alert.alert(
        '📺 Ad Preview',
        'This is where an interstitial ad would appear.\n\nIn a development build with AdMob configured, a real full-screen ad will show here.',
        [
          {
            text: 'Close Ad',
            onPress: () => {
              setLastInterstitialTime(now);
              resolve(true);
            },
          },
        ]
      );
    });
  }, [adsEnabled, lastInterstitialTime]);

  // Show simulated rewarded ad
  const showRewarded = useCallback(
    async (onReward: (amount: number, type: string) => void): Promise<boolean> => {
      if (!adsEnabled) return false;

      return new Promise((resolve) => {
        Alert.alert(
          '🎬 Watch Video Ad',
          'This is where a rewarded video ad would play.\n\nIn a development build with AdMob configured, watching the full video will grant your reward.',
          [
            {
              text: 'Skip',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Watch & Earn',
              onPress: () => {
                // Simulate reward
                onReward(AD_CONFIG.rewards.freePrediction, 'prediction');
                resolve(true);
              },
            },
          ]
        );
      });
    },
    [adsEnabled]
  );

  // Increment screen count and maybe show interstitial
  const incrementScreenCount = useCallback(() => {
    if (!adsEnabled) return;

    setScreenCount((prev) => {
      const newCount = prev + 1;
      
      // Show interstitial every N screens
      if (newCount >= AD_CONFIG.interstitialFrequency) {
        showInterstitial();
        return 0;
      }
      
      return newCount;
    });
  }, [adsEnabled, showInterstitial]);

  const value: AdContextType = {
    isSubscribed,
    adsEnabled,
    interstitialLoaded,
    rewardedLoaded,
    showInterstitial,
    showRewarded,
    incrementScreenCount,
    setSubscribed,
    screenCount,
    lastInterstitialTime,
  };

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAds() {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
}
