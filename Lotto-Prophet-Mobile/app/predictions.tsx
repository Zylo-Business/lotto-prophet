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

function NumberBall({ n, locked, type, colors }: { n: number | '?'; locked: boolean; type: 'N' | 'M'; colors: AppColors }) {
  const bg = locked
    ? colors.border
    : type === 'N'
    ? `${colors.primary}20`
    : '#F59E0B20';
  const fg = locked
    ? colors.textSecondary
    : type === 'N'
    ? colors.primary
    : '#D97706';

  return (
    <View style={[styles.ball, { backgroundColor: bg }]}>
      <Text style={[styles.ballText, { color: fg }]}>{locked ? '?' : n}</Text>
    </View>
  );
}

function PredictionCard({
  item,
  onPay,
  paying,
  colors,
}: {
  item: PublicPrediction;
  onPay: (p: PublicPrediction) => void;
  paying: boolean;
  colors: AppColors;
}) {
  const locked = !item.is_unlocked;
  let nums: number[] = [];
  let mNums: number[] = [];
  if (!locked) {
    try { if (item.numbers) nums = JSON.parse(item.numbers); } catch {}
    try { if (item.machine_numbers) mNums = JSON.parse(item.machine_numbers); } catch {}
  }

  const borderColor = locked ? '#F59E0B40' : colors.border;
  const bg = locked ? '#FFFBEB' : colors.card;

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.prediction_type === 'paid' && (
              <View style={[styles.badge, { backgroundColor: locked ? '#FEF3C7' : '#D1FAE5' }]}>
                <Text style={[styles.badgeText, { color: locked ? '#B45309' : '#065F46' }]}>
                  {locked ? `GHS ${Number(item.price).toFixed(2)}` : 'Unlocked'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {item.game_name} · {item.draw_date?.slice(0, 10)}
          </Text>
        </View>
        {locked && item.prediction_type === 'paid' && (
          <Pressable
            style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.75 }]}
            onPress={() => onPay(item)}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={12} color="#fff" />
                <Text style={styles.payBtnText}>Pay</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.ballsRow}>
        {locked
          ? Array.from({ length: item.numbers_count ?? 5 }, (_, i) => (
              <NumberBall key={i} n="?" locked type="N" colors={colors} />
            ))
          : nums.map((n, i) => <NumberBall key={i} n={n} locked={false} type="N" colors={colors} />)}
        {!locked && mNums.length > 0 && (
          <>
            <Text style={[styles.separator, { color: colors.textSecondary }]}>|</Text>
            {mNums.map((n, i) => <NumberBall key={i} n={n} locked={false} type="M" colors={colors} />)}
          </>
        )}
      </View>

      {locked && item.prediction_type === 'paid' && (
        <Text style={styles.lockHint}>Pay GHS {Number(item.price).toFixed(2)} to reveal numbers</Text>
      )}
      {item.notes && !locked && (
        <Text style={[styles.notes, { color: colors.textSecondary }]}>{item.notes}</Text>
      )}
    </View>
  );
}

export default function PredictionsScreen() {
  const { token } = useAuth();
  const { colors: COLORS } = useTheme();
  const styles2 = useMemo(() => createStyles(COLORS), [COLORS]);

  const [predictions, setPredictions] = useState<PublicPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      setPredictions(await fetchPredictions(token));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handlePay(pred: PublicPrediction) {
    if (!token || paying) return;
    setPaying(pred.id);
    try {
      const unlocked = await purchasePrediction(token, pred.id);
      setPredictions(prev => prev.map(p => p.id === unlocked.id ? unlocked : p));
    } catch {
      // payment handled externally; silently fail
    } finally {
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles2.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles2.center, { backgroundColor: COLORS.background }]}>
        <Ionicons name="cloud-offline" size={48} color={COLORS.textSecondary} />
        <Text style={[styles2.errorText, { color: COLORS.textSecondary }]}>{error}</Text>
        <Pressable style={[styles2.retryBtn, { backgroundColor: COLORS.primary }]} onPress={() => load()}>
          <Text style={styles2.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: COLORS.background }}
      data={predictions}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles2.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor={COLORS.primary}
        />
      }
      ListHeaderComponent={
        <Animated.View entering={FadeInDown.duration(400)} style={styles2.header}>
          <Text style={[styles2.headerTitle, { color: COLORS.text }]}>Predictions</Text>
          <Text style={[styles2.headerSub, { color: COLORS.textSecondary }]}>
            Admin predictions and recommended numbers
          </Text>
        </Animated.View>
      }
      ListEmptyComponent={
        <View style={styles2.empty}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
          <Text style={[styles2.emptyText, { color: COLORS.textSecondary }]}>No predictions yet</Text>
          <Text style={[styles2.emptySub, { color: COLORS.textSecondary }]}>
            Admin predictions will appear here
          </Text>
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

const styles = StyleSheet.create({
  ball: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ballText: {
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    marginHorizontal: 4,
    fontSize: 16,
  },
});

const createStyles = (COLORS: AppColors) => StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  cardMeta: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 56,
    justifyContent: 'center',
  },
  payBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ballsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  lockHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#B45309',
    fontStyle: 'italic',
  },
  notes: {
    marginTop: 8,
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 260,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
});
