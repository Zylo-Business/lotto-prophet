import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchPredictions, purchasePrediction, type PublicPrediction } from './lib/predictions';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Digit Rain (landing page only) ───────────────────────────────────────────

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

// ─── Landing page data ─────────────────────────────────────────────────────────

const FEATURES = [
  { colors: ['#6366F1', '#9333EA'] as [string, string], icon: 'flash' as const,         title: 'Expert Predictions', desc: 'Free and premium picks curated daily for every major game.' },
  { colors: ['#10B981', '#14B8A6'] as [string, string], icon: 'git-compare' as const,   title: 'Lapping Analysis',   desc: 'Detect repeating number patterns across consecutive draws.' },
  { colors: ['#F59E0B', '#F97316'] as [string, string], icon: 'ticket' as const,         title: 'Full Draw History',  desc: 'Thousands of draws across NLA, Alpha, Rush and more.' },
  { colors: ['#A855F7', '#EC4899'] as [string, string], icon: 'school' as const,         title: 'Lotto University',   desc: 'Courses on foundations, lapping strategies and game theory.' },
  { colors: ['#F43F5E', '#EF4444'] as [string, string], icon: 'people' as const,         title: 'Community',          desc: 'Share forecasts and strategies with players nationwide.' },
  { colors: ['#0EA5E9', '#3B82F6'] as [string, string], icon: 'notifications' as const,  title: 'Draw Alerts',        desc: 'Instant notifications when new predictions are published.' },
];

const STATS = [
  { v: '10K+', l: 'Active players' },
  { v: '5',    l: 'Game types'     },
  { v: 'Daily',l: 'Expert picks'   },
  { v: 'Free', l: 'To join'        },
];

// ─── Landing page view (not logged in) ────────────────────────────────────────

function LandingView({ s, C }: { s: ReturnType<typeof createStyles>; C: AppColors }) {
  const router = useRouter();
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <DigitRainBackground />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)} style={s.header}>
          <View style={s.logoRow}>
            <Image source={require('../assets/images/logo.jpeg')} style={s.logo} />
            <Text style={s.logoText}>Lotto Prophet</Text>
          </View>
          <Pressable onPress={() => router.push('/login')} style={s.headerBtn}>
            <Text style={s.headerBtnText}>Sign in</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).duration(600)} style={s.hero}>
          <View style={s.badge}>
            <View style={s.badgeDot} />
            <Text style={s.badgeText}>Live predictions · Updated daily</Text>
          </View>
          <Text style={s.headline}>
            <Text style={s.headlineMain}>Play smarter.{'\n'}</Text>
            <Text style={s.headlinePurple}>Win smarter.</Text>
          </Text>
          <Text style={s.subline}>
            Expert picks, pattern analysis, and full draw history — built for Ghana's serious lottery players.
          </Text>
          <View style={s.ctaGroup}>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]} onPress={() => router.push('/register')}>
              <LinearGradient colors={['#6366F1', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaPrimary}>
                <Text style={s.ctaPrimaryText}>Start for free — it's instant</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => router.push('/login')} style={s.ctaSecondary}>
              <Text style={s.ctaSecondaryText}>
                Already have an account? <Text style={{ color: '#6366F1' }}>Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </Animated.View>

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

        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={s.section}>
          <LinearGradient colors={['#6366F1', '#9333EA', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bigCta}>
            <Text style={s.bigCtaEmoji}>🎯</Text>
            <Text style={s.bigCtaTitle}>Ready to win smarter?</Text>
            <Text style={s.bigCtaSub}>Join thousands of players using data and patterns to make better picks every single day.</Text>
            <Pressable onPress={() => router.push('/register')} style={({ pressed }) => [s.bigCtaBtn, pressed && { opacity: 0.85 }]}>
              <Text style={s.bigCtaBtnText}>Get started for free</Text>
              <Ionicons name="arrow-forward" size={16} color="#6366F1" />
            </Pressable>
            <Pressable onPress={() => router.push('/login')} style={s.bigCtaSignIn}>
              <Text style={s.bigCtaSignInText}>Sign in</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

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

// ─── Dashboard components ──────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'New Prediction',  icon: 'git-compare' as const,  color: '#6366F1', bg: '#6366F115', route: '/lapping-2'      },
  { label: 'View Statistics', icon: 'bar-chart'  as const,   color: '#10B981', bg: '#10B98115', route: '/dashboard'      },
  { label: 'Set Draw Alerts', icon: 'notifications' as const,color: '#F59E0B', bg: '#F59E0B15', route: '/notifications'  },
  { label: 'Upgrade Plan',    icon: 'star'       as const,   color: '#F59E0B', bg: '#F59E0B15', route: '/subscription'   },
];

function NumberBall({ n, type, s, C }: {
  n: number | '?';
  type: 'N' | 'M';
  s: ReturnType<typeof createStyles>;
  C: AppColors;
}) {
  const bg = n === '?' ? C.border : type === 'N' ? `${C.primary}20` : '#F59E0B20';
  const fg = n === '?' ? C.textSecondary : type === 'N' ? C.primary : '#D97706';
  return (
    <View style={[s.ball, { backgroundColor: bg }]}>
      <Text style={[s.ballText, { color: fg }]}>{n}</Text>
    </View>
  );
}

function DashboardView({
  s, C,
  predictions, predLoading,
  paying, onPay,
}: {
  s: ReturnType<typeof createStyles>;
  C: AppColors;
  predictions: PublicPrediction[];
  predLoading: boolean;
  paying: number | null;
  onPay: (p: PublicPrediction) => void;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const plan = (user as any)?.subscription_plan ?? 'free';
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const statCards = [
    { label: 'Predictions Made', value: String(predictions.length), sub: 'Admin predictions available', icon: 'analytics' as const,   color: '#6366F1' },
    { label: 'Win Rate',         value: '—',                        sub: 'No data yet',                  icon: 'bar-chart'  as const,   color: '#10B981' },
    { label: 'Draws Tracked',    value: '0',                        sub: 'Lotto draws followed',          icon: 'ticket'     as const,   color: '#8B5CF6' },
    { label: 'Subscription',     value: planLabel,                  sub: 'Current plan',                  icon: 'star'       as const,   color: '#F59E0B' },
  ];

  return (
    <ScrollView style={[s.root, { backgroundColor: C.background }]} contentContainerStyle={s.dashScroll} showsVerticalScrollIndicator={false}>
      {/* Welcome header */}
      <Animated.View entering={FadeInDown.duration(400)} style={s.dashHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.welcomeHeading, { color: C.text }]}>
            Welcome back, {user ? `${(user as any).firstname}` : 'Player'} 👋
          </Text>
          <Text style={[s.welcomeSub, { color: C.textSecondary }]}>Here's your Lotto Prophet dashboard</Text>
        </View>
      </Animated.View>

      {/* Stat cards */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.statRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statRowScroll}>
          {statCards.map((sc) => (
            <View key={sc.label} style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[s.statCardIcon, { backgroundColor: `${sc.color}15` }]}>
                <Ionicons name={sc.icon} size={20} color={sc.color} />
              </View>
              <Text style={[s.statCardLabel, { color: C.textSecondary }]}>{sc.label}</Text>
              {sc.label === 'Subscription' ? (
                <View style={[s.planBadge, { backgroundColor: `${sc.color}20` }]}>
                  <Text style={[s.planBadgeText, { color: sc.color }]}>{sc.value}</Text>
                </View>
              ) : (
                <Text style={[s.statCardValue, { color: C.text }]}>{sc.value}</Text>
              )}
              <Text style={[s.statCardSub, { color: C.textSecondary }]}>{sc.sub}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Latest Predictions */}
      <Animated.View entering={FadeInDown.delay(160).duration(400)} style={[s.panel, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[s.panelTitle, { color: C.text }]}>Latest Predictions</Text>
        <Text style={[s.panelSub, { color: C.textSecondary }]}>Admin predictions and recommended numbers</Text>

        {predLoading ? (
          <View style={s.predLoading}>
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        ) : predictions.length === 0 ? (
          <View style={s.predEmpty}>
            <Ionicons name="document-text-outline" size={40} color={C.textSecondary} />
            <Text style={[s.predEmptyText, { color: C.textSecondary }]}>No predictions yet</Text>
          </View>
        ) : (
          predictions.slice(0, 5).map((p) => {
            const locked = !p.is_unlocked;
            let nums: number[] = [];
            let mNums: number[] = [];
            if (!locked) {
              try { if (p.numbers) nums = JSON.parse(p.numbers); } catch {}
              try { if (p.machine_numbers) mNums = JSON.parse(p.machine_numbers); } catch {}
            }
            return (
              <View
                key={p.id}
                style={[
                  s.predCard,
                  locked
                    ? { backgroundColor: '#FFFBEB', borderColor: '#F59E0B40' }
                    : { backgroundColor: C.background, borderColor: C.border },
                ]}
              >
                <View style={s.predCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={s.predTitleRow}>
                      <Text style={[s.predTitle, { color: C.text }]} numberOfLines={1}>{p.title}</Text>
                      {p.prediction_type === 'paid' && (
                        <View style={[s.predBadge, { backgroundColor: locked ? '#FEF3C7' : '#D1FAE5' }]}>
                          <Text style={[s.predBadgeText, { color: locked ? '#B45309' : '#065F46' }]}>
                            {locked ? `GHS ${Number(p.price).toFixed(2)}` : 'Unlocked'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.predMeta, { color: C.textSecondary }]}>{p.game_name} · {p.draw_date?.slice(0, 10)}</Text>
                  </View>
                  {locked && p.prediction_type === 'paid' && (
                    <Pressable
                      style={({ pressed }) => [s.payBtn, pressed && { opacity: 0.75 }]}
                      onPress={() => onPay(p)}
                      disabled={paying === p.id}
                    >
                      {paying === p.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : (
                          <>
                            <Ionicons name="lock-closed" size={11} color="#fff" />
                            <Text style={s.payBtnText}>Click to Pay</Text>
                          </>
                        )}
                    </Pressable>
                  )}
                </View>

                <View style={s.ballsRow}>
                  {locked
                    ? Array.from({ length: p.numbers_count ?? 5 }, (_, i) => (
                        <NumberBall key={i} n="?" type="N" s={s} C={C} />
                      ))
                    : nums.map((n, i) => <NumberBall key={i} n={n} type="N" s={s} C={C} />)}
                  {!locked && mNums.length > 0 && (
                    <>
                      <Text style={[s.separator, { color: C.textSecondary }]}>|</Text>
                      {mNums.map((n, i) => <NumberBall key={i} n={n} type="M" s={s} C={C} />)}
                    </>
                  )}
                </View>
                {locked && p.prediction_type === 'paid' && (
                  <Text style={s.lockHint}>Pay GHS {Number(p.price).toFixed(2)} to unlock</Text>
                )}
                {p.notes && !locked && (
                  <Text style={[s.predNotes, { color: C.textSecondary }]}>{p.notes}</Text>
                )}
              </View>
            );
          })
        )}

        {predictions.length > 5 && (
          <Pressable onPress={() => router.push('/predictions')} style={s.viewAllBtn}>
            <Text style={[s.viewAllText, { color: C.primary }]}>View all predictions</Text>
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          </Pressable>
        )}
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(240).duration(400)} style={[s.panel, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[s.panelTitle, { color: C.text }]}>Quick Actions</Text>
        <Text style={[s.panelSub, { color: C.textSecondary }]}>Get started with Lotto Prophet</Text>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [s.quickAction, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push(a.route as any)}
          >
            <View style={[s.quickActionIcon, { backgroundColor: a.bg }]}>
              <Ionicons name={a.icon} size={18} color={a.color} />
            </View>
            <Text style={[s.quickActionLabel, { color: C.text, flex: 1 }]}>{a.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
          </Pressable>
        ))}
      </Animated.View>

      {/* Analysis Tools */}
      <Animated.View entering={FadeInDown.delay(320).duration(400)} style={s.toolsSection}>
        <Text style={[s.panelTitle, { color: C.text }]}>Analysis Tools</Text>
        <View style={s.toolsRow}>
          <Pressable
            style={[s.toolCard, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={() => router.push('/lapping-2')}
          >
            <View style={[s.toolIconBox, { backgroundColor: '#6366F115' }]}>
              <Ionicons name="git-compare" size={22} color="#6366F1" />
            </View>
            <Text style={[s.toolName, { color: C.text }]}>Lapping 2</Text>
            <Text style={[s.toolDesc, { color: C.textSecondary }]}>2-row pattern analysis</Text>
            <Text style={[s.toolBody, { color: C.textSecondary }]}>
              Scan 2 consecutive rows per column to find overlapping patterns in draw history.
            </Text>
          </Pressable>

          <Pressable
            style={[s.toolCard, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={() => router.push('/lapping-3')}
          >
            <View style={[s.toolIconBox, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="git-network" size={22} color="#F59E0B" />
            </View>
            <Text style={[s.toolName, { color: C.text }]}>Lapping 3</Text>
            <Text style={[s.toolDesc, { color: C.textSecondary }]}>3-row pattern analysis</Text>
            <Text style={[s.toolBody, { color: C.textSecondary }]}>
              Scan 3 consecutive rows per column with pre-filled default patterns for deeper analysis.
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Root screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, token, loading: authLoading } = useAuth();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [predictions, setPredictions] = useState<PublicPrediction[]>([]);
  const [predLoading, setPredLoading] = useState(false);
  const [paying, setPaying] = useState<number | null>(null);

  const loadPredictions = useCallback(async () => {
    setPredLoading(true);
    try { setPredictions(await fetchPredictions()); } catch {}
    finally { setPredLoading(false); }
  }, []);

  useEffect(() => {
    if (!authLoading && token) loadPredictions();
  }, [authLoading, token, loadPredictions]);

  async function handlePay(pred: PublicPrediction) {
    if (paying) return;
    setPaying(pred.id);
    try {
      const unlocked = await purchasePrediction(pred.id);
      setPredictions(prev => prev.map(p => p.id === unlocked.id ? unlocked : p));
    } catch {}
    finally { setPaying(null); }
  }

  if (authLoading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!token) {
    return <LandingView s={s} C={C} />;
  }

  return (
    <DashboardView
      s={s}
      C={C}
      predictions={predictions}
      predLoading={predLoading}
      paying={paying}
      onPay={handlePay}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (C: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },

  // ── Landing ──────────────────────────────────────────────────────────────────
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10 },
  logoText: { fontSize: 17, fontWeight: '700', color: C.text },
  headerBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: C.text },

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
  headlineMain: { color: C.text },
  headlinePurple: { color: '#8B5CF6' },
  subline: { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 23, maxWidth: 300, marginBottom: 28 },
  ctaGroup: { width: '100%', gap: 12, alignItems: 'center' },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  ctaPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ctaSecondary: { paddingVertical: 8 },
  ctaSecondaryText: { fontSize: 13, color: C.textSecondary, textAlign: 'center' },

  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, borderRadius: 16, overflow: 'hidden',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  statItem: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#6366F1' },
  statLabel: { fontSize: 11, color: C.textSecondary, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: C.border },

  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionEyebrow: { fontSize: 11, fontWeight: '700', color: '#6366F1', letterSpacing: 2, marginBottom: 6 },
  sectionTitle: { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 8 },
  sectionSub: { fontSize: 14, color: C.textSecondary, lineHeight: 20, marginBottom: 20 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: {
    width: (SCREEN_W - 52) / 2, borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  featureIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  featureDesc: { fontSize: 12, lineHeight: 17 },

  bigCta: { borderRadius: 24, padding: 28, alignItems: 'center' },
  bigCtaEmoji: { fontSize: 36, marginBottom: 12 },
  bigCtaTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  bigCtaSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 21, marginBottom: 24, maxWidth: 260 },
  bigCtaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginBottom: 12,
  },
  bigCtaBtnText: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  bigCtaSignIn: { paddingVertical: 8 },
  bigCtaSignInText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLogo: { width: 22, height: 22, borderRadius: 6, opacity: 0.6 },
  footerText: { fontSize: 12 },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  dashScroll: { paddingBottom: 40 },
  dashHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20,
  },
  welcomeHeading: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  welcomeSub: { fontSize: 14, marginTop: 4 },

  statRow: { marginBottom: 4 },
  statRowScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  statCard: {
    width: 150, borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statCardIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statCardLabel: { fontSize: 12, marginBottom: 6 },
  statCardValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  statCardSub: { fontSize: 11 },
  planBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginBottom: 4 },
  planBadgeText: { fontSize: 13, fontWeight: '700' },

  panel: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  panelTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  panelSub: { fontSize: 13, marginBottom: 16 },

  predLoading: { paddingVertical: 24, alignItems: 'center' },
  predEmpty: { paddingVertical: 32, alignItems: 'center', gap: 8 },
  predEmptyText: { fontSize: 14, fontWeight: '500' },

  predCard: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  predCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  predTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  predTitle: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  predBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  predBadgeText: { fontSize: 10, fontWeight: '700' },
  predMeta: { fontSize: 12 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, minWidth: 90, justifyContent: 'center',
  },
  payBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  ballsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  ball: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  ballText: { fontSize: 12, fontWeight: '700' },
  separator: { marginHorizontal: 2, fontSize: 14 },
  lockHint: { marginTop: 8, fontSize: 11, color: '#B45309', fontStyle: 'italic' },
  predNotes: { marginTop: 6, fontSize: 11, fontStyle: 'italic' },

  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 12, gap: 4,
  },
  viewAllText: { fontSize: 14, fontWeight: '600' },

  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderRadius: 10,
  },
  quickActionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 14, fontWeight: '500' },

  toolsSection: { paddingHorizontal: 16, marginBottom: 16 },
  toolsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  toolCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  toolIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  toolName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  toolDesc: { fontSize: 11, marginBottom: 8 },
  toolBody: { fontSize: 12, lineHeight: 17 },
});
