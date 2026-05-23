import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';

export default function SplashScreen() {
  const router = useRouter();
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.logoContainer}>
        <Image source={require('../assets/images/logo.jpeg')} style={styles.logoImage} />
      </Animated.View>

      <Animated.Text entering={FadeIn.delay(400).duration(600)} style={styles.logo}>
        LOTTO PROPHET
      </Animated.Text>

      <Animated.Text entering={FadeIn.delay(600).duration(600)} style={styles.tagline}>
        Your intelligent lottery companion
      </Animated.Text>

      <Animated.View entering={FadeIn.delay(800).duration(600)} style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </Animated.View>

      <Animated.Text entering={FadeIn.delay(1000).duration(600)} style={styles.version}>
        Version 1.0.0
      </Animated.Text>
    </View>
  );
}

const createStyles = (COLORS: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 48,
  },
  loaderContainer: {
    marginBottom: 24,
  },
  version: {
    marginTop: 24,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
