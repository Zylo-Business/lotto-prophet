import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from './context/AuthContext';
import { useTheme, type AppColors } from './context/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Digit Rain ────────────────────────────────────────────────────────────────

function FallingStream({
  x, speed, delay, chars, opacity,
}: {
  x: number; speed: number; delay: number; chars: string[]; opacity: number;
}) {
  const y = useSharedValue(-SCREEN_H * 0.4);

  useEffect(() => {
    y.value = -SCREEN_H * 0.4;
    y.value = withDelay(delay, withRepeat(withTiming(SCREEN_H * 1.1, { duration: speed }), -1));
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x }, style]} pointerEvents="none">
      {chars.map((ch, idx) => (
        <Text
          key={idx}
          style={{
            color: `rgba(99,102,241,${(opacity * (1 - idx / chars.length)).toFixed(3)})`,
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 'bold',
            lineHeight: 18,
          }}
        >
          {ch}
        </Text>
      ))}
    </Animated.View>
  );
}

function DigitRainBackground() {
  const streams = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      x: (i / 25) * SCREEN_W + Math.random() * (SCREEN_W / 25),
      speed: Math.random() * 4000 + 4000,
      delay: Math.random() * 4000,
      chars: Array.from({ length: Math.floor(Math.random() * 8 + 5) }, () =>
        String(Math.floor(Math.random() * 10)),
      ),
      opacity: Math.random() * 0.22 + 0.06,
    })),
  []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {streams.map((s, i) => <FallingStream key={i} {...s} />)}
    </View>
  );
}

// ─── Feature data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    colors: ['#6366F1', '#9333EA'] as [string, string],
    icon: 'flash' as const,
    title: 'Expert Predictions',
    desc: 'Free and premium picks curated daily for every major game.',
  },
  {
    colors: ['#10B981', '#14B8A6'] as [string, string],
    icon: 'git-compare' as const,
    title: 'Lapping Analysis',
    desc: 'Detect repeating number patterns across consecutive draws.',
  },
  {
    colors: ['#F59E0B', '#F97316'] as [string, string],
    icon: 'ticket' as const,
    title: 'Full Draw History',
    desc: 'Thousands of draws across NLA, Alpha, Rush and more.',
  },
  {
    colors: ['#A855F7', '#EC4899'] as [string, string],
    icon: 'school' as const,
    title: 'Lotto University',
    desc: 'Courses on foundations, lapping strategies and game theory.',
  },
  {
    colors: ['#F43F5E', '#EF4444'] as [string, string],
    icon: 'people' as const,
    title: 'Community',
    desc: 'Share forecasts and strategies with players nationwide.',
  },
  {
    colors: ['#0EA5E9', '#3B82F6'] as [string, string],
    icon: 'notifications' as const,
    title: 'Draw Alerts',
    desc: 'Instant notifications when new predictions are published.',
  },
];

const STATS = [
  { v: '10K+', l: 'Active players' },
  { v: '5',    l: 'Game types'    },
  { v: 'Daily',l: 'Expert picks'  },
  { v: 'Free', l: 'To join'       },
];

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  if (loading) return <View style={s.loader}><Text style={{ color: C.textSecondary }}>Loading…</Text></View>;

  const isLoggedIn = !!token;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <DigitRainBackground />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(500)} style={s.header}>
          <View style={s.logoRow}>
            <Image source={require('../assets/images/logo.jpeg')} style={s.logo} />
            <Text style={s.logoText}>Lotto Prophet</Text>
          </View>
          {isLoggedIn ? (
            <Pressable onPress={() => router.push('/dashboard')} style={s.headerBtn}>
              <Text style={s.headerBtnText}>Dashboard</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/login')} style={s.headerBtn}>
              <Text style={s.headerBtnText}>Sign in</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* ── Hero ── */}
        <Animated.View entering={FadeInUp.delay(100).duration(600)} style={s.hero}>
          {/* Badge */}
          <View style={s.badge}>
            <View style={s.badgeDot} />
            <Text style={s.badgeText}>Live predictions · Updated daily</Text>
          </View>

          {/* Headline */}
          <Text style={s.headline}>
            <Text style={s.headlineWhite}>Play smarter.{'\n'}</Text>
            <Text style={s.headlinePurple}>Win smarter.</Text>
          </Text>

          <Text style={s.subline}>
            Expert picks, pattern analysis, and full draw history — built for Ghana's serious lottery players.
          </Text>

          {/* CTA */}
          {isLoggedIn ? (
            <View style={s.ctaGroup}>
              <Text style={s.welcomeText}>
                Welcome back, {user ? `${user.firstname} ${user.surname}`.trim() : 'Player'} 👋
              </Text>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push('/dashboard')}
              >
                <LinearGradient colors={['#6366F1', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaPrimary}>
                  <Text style={s.ctaPrimaryText}>Go to Dashboard</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => logout()} style={s.ctaSecondary}>
                <Text style={s.ctaSecondaryText}>Sign out</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.ctaGroup}>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push('/register')}
              >
                <LinearGradient colors={['#6366F1', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaPrimary}>
                  <Text style={s.ctaPrimaryText}>Start for free — it's instant</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => router.push('/login')} style={s.ctaSecondary}>
                <Text style={s.ctaSecondaryText}>Already have an account? <Text style={{ color: '#6366F1' }}>Sign in</Text></Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* ── Stats bar ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={s.statsBar}>
          {STATS.map((st, i) => (
            <React.Fragment key={st.l}>
              {i > 0 && <View style={s.statDivider} />}
              <View style={s.statItem}>
                <Text style={s.statValue}>{st.v}</Text>
                <Text style={s.statLabel}>{st.l}</Text>
              </View>
            </React.Fragment>
          ))}
        </Animated.View>

        {/* ── Features ── */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.section}>
          <Text style={s.sectionEyebrow}>FEATURES</Text>
          <Text style={s.sectionTitle}>Everything in one place</Text>
          <Text style={s.sectionSub}>Built for serious players across Ghana's major lottery games.</Text>

          <View style={s.featureGrid}>
            {FEATURES.map((f, idx) => (
              <Animated.View
                key={f.title}
                entering={FadeInDown.delay(350 + idx * 60).duration(400)}
                style={[s.featureCard, { backgroundColor: C.card, borderColor: C.border }]}
              >
                <LinearGradient colors={f.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.featureIcon}>
                  <Ionicons name={f.icon} size={20} color="#fff" />
                </LinearGradient>
                <Text style={[s.featureTitle, { color: C.text }]}>{f.title}</Text>
                <Text style={[s.featureDesc, { color: C.textSecondary }]}>{f.desc}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* ── Bottom CTA ── */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={s.section}>
          <LinearGradient colors={['#6366F1', '#9333EA', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bigCta}>
            <Text style={s.bigCtaEmoji}>🎯</Text>
            <Text style={s.bigCtaTitle}>Ready to win smarter?</Text>
            <Text style={s.bigCtaSub}>
              Join thousands of players using data and patterns to make better picks every single day.
            </Text>
            <Pressable
              onPress={() => router.push(isLoggedIn ? '/dashboard' : '/register')}
              style={({ pressed }) => [s.bigCtaBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={s.bigCtaBtnText}>{isLoggedIn ? 'Go to Dashboard' : 'Get started for free'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#6366F1" />
            </Pressable>
            {!isLoggedIn && (
              <Pressable onPress={() => router.push('/login')} style={s.bigCtaSignIn}>
                <Text style={s.bigCtaSignInText}>Sign in</Text>
              </Pressable>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── Footer ── */}
        <Animated.View entering={FadeInUp.delay(600).duration(400)} style={s.footer}>
          <View style={s.footerLeft}>
            <Image source={require('../assets/images/logo.jpeg')} style={s.footerLogo} />
            <Text style={[s.footerText, { color: C.textSecondary }]}>© {new Date().getFullYear()} Lotto Prophet</Text>
          </View>
          <Text style={[s.footerText, { color: C.textSecondary }]}>Play responsibly</Text>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (C: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  scroll: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10 },
  logoText: { fontSize: 17, fontWeight: '700', color: C.text },
  headerBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: C.text },

  // Hero
  hero: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 99, borderWidth: 1, borderColor: '#6366F130',
    backgroundColor: '#6366F110', marginBottom: 24,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#6366F1' },
  headline: { fontSize: 40, fontWeight: '900', textAlign: 'center', lineHeight: 46, marginBottom: 16 },
  headlineWhite: { color: C.text },
  headlinePurple: { color: '#8B5CF6' },
  subline: { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 23, maxWidth: 300, marginBottom: 28 },

  // CTA
  ctaGroup: { width: '100%', gap: 12, alignItems: 'center' },
  welcomeText: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'center', marginBottom: 4 },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  ctaPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ctaSecondary: { paddingVertical: 8 },
  ctaSecondaryText: { fontSize: 13, color: C.textSecondary, textAlign: 'center' },

  // Stats
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, borderRadius: 16, overflow: 'hidden',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    marginBottom: 8,
  },
  statItem: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#6366F1' },
  statLabel: { fontSize: 11, color: C.textSecondary, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: C.border },

  // Features
  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionEyebrow: { fontSize: 11, fontWeight: '700', color: '#6366F1', letterSpacing: 2, marginBottom: 6 },
  sectionTitle: { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 8 },
  sectionSub: { fontSize: 14, color: C.textSecondary, lineHeight: 20, marginBottom: 20 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: {
    width: (SCREEN_W - 52) / 2,
    borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  featureIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  featureDesc: { fontSize: 12, lineHeight: 17 },

  // Bottom CTA
  bigCta: { borderRadius: 24, padding: 28, alignItems: 'center' },
  bigCtaEmoji: { fontSize: 36, marginBottom: 12 },
  bigCtaTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  bigCtaSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 21, marginBottom: 24, maxWidth: 260 },
  bigCtaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, marginBottom: 12,
  },
  bigCtaBtnText: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  bigCtaSignIn: { paddingVertical: 8 },
  bigCtaSignInText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLogo: { width: 22, height: 22, borderRadius: 6, opacity: 0.6 },
  footerText: { fontSize: 12 },
});
