import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from './context/AuthContext';
import { useTheme, type AppColors } from './context/ThemeContext';
import { fetchPredictions, purchasePrediction, type PublicPrediction } from './lib/predictions';

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (C: AppColors) =>
  StyleSheet.create({
    // screen
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: C.background },
    list: { padding: 16, paddingBottom: 32 },
    header: { marginBottom: 16 },
    headerTitle: { fontSize: 26, fontWeight: '700', color: C.text },
    headerSub: { fontSize: 14, marginTop: 4, color: C.textSecondary },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
    emptySub: { fontSize: 13, textAlign: 'center', color: C.textSecondary },
    errorText: { fontSize: 15, textAlign: 'center', maxWidth: 260, color: C.textSecondary },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: C.primary },
    retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    // card
    card: {
      borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
      backgroundColor: C.card, borderColor: C.border,
    },
    cardLocked: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B40' },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    cardTitle: { fontSize: 15, fontWeight: '600', flexShrink: 1, color: C.text },
    cardMeta: { fontSize: 12, color: C.textSecondary },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    payBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 10, minWidth: 56, justifyContent: 'center',
    },
    payBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    ballsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    ball: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    ballText: { fontSize: 13, fontWeight: '700' },
    separator: { marginHorizontal: 4, fontSize: 16, color: C.textSecondary },
    lockHint: { marginTop: 8, fontSize: 12, color: '#B45309', fontStyle: 'italic' },
    notes: { marginTop: 8, fontSize: 12, fontStyle: 'italic', color: C.textSecondary },
  });

// ─── Number Ball ──────────────────────────────────────────────────────────────

function NumberBall({
  n, locked, type, s, colors,
}: {
  n: number | '?';
  locked: boolean;
  type: 'N' | 'M';
  s: ReturnType<typeof createStyles>;
  colors: AppColors;
}) {
  const bg = locked ? colors.border : type === 'N' ? `${colors.primary}20` : '#F59E0B20';
  const fg = locked ? colors.textSecondary : type === 'N' ? colors.primary : '#D97706';
  return (
    <View style={[s.ball, { backgroundColor: bg }]}>
      <Text style={[s.ballText, { color: fg }]}>{locked ? '?' : n}</Text>
    </View>
  );
}

// ─── Prediction Card ──────────────────────────────────────────────────────────

function PredictionCard({
  item, onPay, paying, colors,
}: {
  item: PublicPrediction;
  onPay: (p: PublicPrediction) => void;
  paying: boolean;
  colors: AppColors;
}) {
  const s = useMemo(() => createStyles(colors), [colors]);
  const locked = !item.is_unlocked;

  let nums: number[] = [];
  let mNums: number[] = [];
  if (!locked) {
    try { if (item.numbers) nums = JSON.parse(item.numbers); } catch {}
    try { if (item.machine_numbers) mNums = JSON.parse(item.machine_numbers); } catch {}
  }

  return (
    <View style={[s.card, locked && s.cardLocked]}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.prediction_type === 'paid' && (
              <View style={[s.badge, { backgroundColor: locked ? '#FEF3C7' : '#D1FAE5' }]}>
                <Text style={[s.badgeText, { color: locked ? '#B45309' : '#065F46' }]}>
                  {locked ? `GHS ${Number(item.price).toFixed(2)}` : 'Unlocked'}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.cardMeta}>{item.game_name} · {item.draw_date?.slice(0, 10)}</Text>
        </View>

        {locked && item.prediction_type === 'paid' && (
          <Pressable
            style={({ pressed }) => [s.payBtn, pressed && { opacity: 0.75 }]}
            onPress={() => onPay(item)}
            disabled={paying}
          >
            {paying
              ? <ActivityIndicator size="small" color="#fff" />
              : (
                <>
                  <Ionicons name="lock-closed" size={12} color="#fff" />
                  <Text style={s.payBtnText}>Pay</Text>
                </>
              )}
          </Pressable>
        )}
      </View>

      <View style={s.ballsRow}>
        {locked
          ? Array.from({ length: item.numbers_count ?? 5 }, (_, i) => (
              <NumberBall key={i} n="?" locked type="N" s={s} colors={colors} />
            ))
          : nums.map((n, i) => (
              <NumberBall key={i} n={n} locked={false} type="N" s={s} colors={colors} />
            ))}
        {!locked && mNums.length > 0 && (
          <>
            <Text style={s.separator}>|</Text>
            {mNums.map((n, i) => (
              <NumberBall key={i} n={n} locked={false} type="M" s={s} colors={colors} />
            ))}
          </>
        )}
      </View>

      {locked && item.prediction_type === 'paid' && (
        <Text style={s.lockHint}>Pay GHS {Number(item.price).toFixed(2)} to reveal numbers</Text>
      )}
      {item.notes && !locked && (
        <Text style={s.notes}>{item.notes}</Text>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PredictionsScreen() {
  const { loading: authLoading } = useAuth();
  const { colors: COLORS } = useTheme();
  const s = useMemo(() => createStyles(COLORS), [COLORS]);

  const [predictions, setPredictions] = useState<PublicPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      setPredictions(await fetchPredictions());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  async function handlePay(pred: PublicPrediction) {
    if (paying) return;
    setPaying(pred.id);
    try {
      const unlocked = await purchasePrediction(pred.id);
      setPredictions(prev => prev.map(p => p.id === unlocked.id ? unlocked : p));
    } catch {
      // payment handled externally; silently fail
    } finally {
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Ionicons name="cloud-offline" size={48} color={COLORS.textSecondary} />
        <Text style={s.errorText}>{error}</Text>
        <Pressable style={s.retryBtn} onPress={() => load()}>
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: COLORS.background }}
      data={predictions}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={s.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor={COLORS.primary}
        />
      }
      ListHeaderComponent={null}
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
          <Text style={s.emptyText}>No predictions yet</Text>
          <Text style={s.emptySub}>Admin predictions will appear here</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(80 * index).duration(400)}>
          <PredictionCard
            item={item}
            onPay={handlePay}
            paying={paying === item.id}
            colors={COLORS}
          />
        </Animated.View>
      )}
    />
  );
}
