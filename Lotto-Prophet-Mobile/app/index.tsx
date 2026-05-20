import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from './context/AuthContext';
import { useTheme, type AppColors } from './context/ThemeContext';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'analytics-outline' as const,
    title: 'Smart Analytics',
    description: 'AI-powered predictions based on historical data',
    color: '#6C63FF',
  },
  {
    icon: 'trending-up-outline' as const,
    title: 'Hot Numbers',
    description: 'Track trending numbers and patterns',
    color: '#FF6B6B',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: 'Statistics',
    description: 'Comprehensive number frequency analysis',
    color: '#10B981',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Alerts',
    description: 'Get notified about prediction updates',
    color: '#F59E0B',
  },
];

export default function Index() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View entering={FadeInUp.delay(100).duration(600)} style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/images/logo.jpeg')} style={styles.logoImage} />
          </View>
          
          <Text style={styles.heroTitle}>Lotto Prophet</Text>
          <Text style={styles.heroSubtitle}>
            Your intelligent companion for lottery predictions
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>95%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>50K+</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1M+</Text>
              <Text style={styles.statLabel}>Predictions</Text>
            </View>
          </View>
        </Animated.View>

        {/* Auth Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          {token ? (
            <View style={styles.authCard}>
              <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                  <Ionicons name="person" size={32} color={COLORS.primary} />
                </View>
                <View style={styles.userTextContainer}>
                  <Text style={styles.welcomeBack}>Welcome back!</Text>
                  <Text style={styles.userEmail}>{user?.name || user?.email || 'User'}</Text>
                </View>
              </View>
              
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.push('/dashboard')}
              >
                <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.logoutButtonPressed,
                ]}
                onPress={() => logout()}
              >
                <Ionicons name="log-out-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authCard}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={() => router.push('/register')}
              >
                <Text style={styles.secondaryButtonText}>Create Account</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* Features Section */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why Choose Us?</Text>
          
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, index) => (
              <Animated.View 
                key={feature.title}
                entering={FadeInDown.delay(400 + index * 100).duration(500)}
                style={styles.featureCard}
              >
                <View style={[styles.featureIconContainer, { backgroundColor: `${feature.color}15` }]}>
                  <Ionicons name={feature.icon} size={28} color={feature.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Quick Navigation (uses sample-images as guide) */}
        <Animated.View entering={FadeInDown.delay(450).duration(600)} style={styles.quickNavSection}>
          <Text style={styles.sectionTitle}>Quick Navigation</Text>
          <View style={styles.navRow}>
            <Pressable style={styles.navCard} onPress={() => router.push('/dashboard')}>
              <Image source={require('../sample-images/navigation.jpeg')} style={styles.navImage} />
              <Text style={styles.navTitle}>Dashboard</Text>
            </Pressable>

            <Pressable style={styles.navCard} onPress={() => router.push('/notifications')}>
              <Image source={require('../sample-images/notifications.jpeg')} style={styles.navImage} />
              <Text style={styles.navTitle}>Notifications</Text>
            </Pressable>
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.navCard} onPress={() => router.push('/profile')}>
              <Image source={require('../sample-images/profile-setting-editor.jpeg')} style={styles.navImage} />
              <Text style={styles.navTitle}>Profile</Text>
            </Pressable>

            <Pressable style={styles.navCard} onPress={() => router.push('/contact')}>
              <Image source={require('../sample-images/contact-page.jpeg')} style={styles.navImage} />
              <Text style={styles.navTitle}>Contact</Text>
            </Pressable>
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.navCard} onPress={() => router.push('/university')}>
              <View style={[styles.navImagePlaceholder, { backgroundColor: `${COLORS.primary}15` }]}>  
                <Ionicons name="school" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.navTitle}>University</Text>
            </Pressable>

            <Pressable style={styles.navCard} onPress={() => router.push('/buy-chart')}>
              <View style={[styles.navImagePlaceholder, { backgroundColor: '#FF6B6B15' }]}>  
                <Ionicons name="cart" size={36} color="#FF6B6B" />
              </View>
              <Text style={styles.navTitle}>Buy My Chart</Text>
            </Pressable>
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.navCard} onPress={() => router.push('/settings')}>
              <Image source={require('../sample-images/profile-settings-editor-2.jpeg')} style={styles.navImage} />
              <Text style={styles.navTitle}>Settings</Text>
            </Pressable>

            <Pressable style={styles.navCard} onPress={() => router.push('/subscription')}>
              <View style={[styles.navImagePlaceholder, { backgroundColor: '#FFD70020' }]}>  
                <Ionicons name="diamond" size={36} color="#FFD700" />
              </View>
              <Text style={styles.navTitle}>Subscription</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.footer}>
          <Text style={styles.footerText}>
            Play responsibly. Predictions are for entertainment purposes only.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoImage: {
    width: 150,
    height: 150,
    borderRadius: 38,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  authCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 32,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  welcomeBack: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  secondaryButtonPressed: {
    backgroundColor: COLORS.background,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  logoutButtonPressed: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  featureCard: {
    width: (width - 64) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  quickNavSection: {
    marginBottom: 28,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    width: (width - 80) / 2,
    alignItems: 'center',
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  navImage: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
  },
  navImagePlaceholder: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
});
