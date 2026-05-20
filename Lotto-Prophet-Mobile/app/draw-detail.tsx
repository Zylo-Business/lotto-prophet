import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';
import {
  fetchDrawsBySource,
  getDrawDisplayName,
  getDrawColor,
  type DrawFlat,
} from './lib/draws';

const PAGE_SIZE = 30;

export default function DrawDetail() {
  const { source, name } = useLocalSearchParams<{ source: string; name: string }>();
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [draws, setDraws] = useState<DrawFlat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const displayName = name || getDrawDisplayName(source || '');
  const accentColor = getDrawColor(source || '');

  const copyFirst50 = async () => {
    const first50 = draws.slice(0, 50);
    if (first50.length === 0) return;

    const lines = first50.map((d) => {
      const main = [d.N1, d.N2, d.N3, d.N4, d.N5].join(', ');
      const machine = [d.M1, d.M2, d.M3, d.M4, d.M5].filter((n) => n !== null && n !== undefined);
      const machineStr = machine.length > 0 ? ` | Machine: ${machine.join(', ')}` : '';
      return `#${d.event_number} (${d.date}) Draw: ${main}${machineStr}`;
    });

    const text = `${displayName} — First ${first50.length} Draws\n${'—'.repeat(30)}\n${lines.join('\n')}`;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadDraws = useCallback(async (offset = 0) => {
    if (!source) return;
    try {
      if (offset === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const data = await fetchDrawsBySource(source, PAGE_SIZE, offset);
      setTotal(data.total);

      if (offset === 0) {
        setDraws(data.draws);
      } else {
        setDraws((prev) => [...prev, ...data.draws]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load draw data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [source]);

  useEffect(() => {
    loadDraws(0);
  }, [loadDraws]);

  const loadMore = () => {
    if (loadingMore || draws.length >= total) return;
    loadDraws(draws.length);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading {displayName} draws...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.loadingText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadDraws(0)}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const renderNumberBall = (value: number | null, index: number, color: string) => {
    if (value === null || value === undefined) return null;
    return (
      <View key={index} style={[styles.numberBall, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.numberText, { color }]}>{value}</Text>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: DrawFlat; index: number }) => {
    const mainNumbers = [item.N1, item.N2, item.N3, item.N4, item.N5];
    const megaNumbers = [item.M1, item.M2, item.M3, item.M4, item.M5];
    const hasMega = megaNumbers.some((n) => n !== null && n !== undefined);

    return (
      <Animated.View entering={FadeInDown.delay(50 * Math.min(index, 10)).duration(300)}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.eventNumber}>Draw #{item.event_number}</Text>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>

          {/* Main Numbers */}
          <View style={styles.numbersSection}>
            <Text style={styles.numbersLabel}>Draw</Text>
            <View style={styles.numbersRow}>
              {mainNumbers.map((n, i) => renderNumberBall(n, i, accentColor))}
              <View style={styles.sumBadge}>
                <Text style={styles.sumText}>= {item.n_sum}</Text>
              </View>
            </View>
          </View>

          {/* Mega Numbers */}
          {hasMega && (
            <View style={styles.numbersSection}>
              <Text style={styles.numbersLabel}>Machine</Text>
              <View style={styles.numbersRow}>
                {megaNumbers.map((n, i) => renderNumberBall(n, i, COLORS.accent))}
                <View style={styles.sumBadge}>
                  <Text style={styles.sumText}>= {item.m_sum}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{displayName}</Text>
            <Text style={styles.headerSubtitle}>{total} draws available</Text>
          </View>
          {draws.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.copyButton,
                copied && styles.copyButtonDone,
                pressed && { opacity: 0.7 },
              ]}
              onPress={copyFirst50}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copied ? '#fff' : COLORS.primary}
              />
              <Text style={[styles.copyButtonText, copied && { color: '#fff' }]}>
                {copied ? 'Copied!' : 'Copy 50'}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>

      <FlatList
        data={draws}
        keyExtractor={(item) => `${item.source}-${item.event_number}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const createStyles = (COLORS: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      padding: 20,
      paddingTop: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: COLORS.text,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerSubtitle: {
      fontSize: 16,
      color: COLORS.textSecondary,
      marginTop: 4,
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: `${COLORS.primary}15`,
      borderWidth: 1,
      borderColor: `${COLORS.primary}30`,
    },
    copyButtonDone: {
      backgroundColor: COLORS.success,
      borderColor: COLORS.success,
    },
    copyButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: COLORS.primary,
      borderRadius: 10,
    },
    retryText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    eventNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.text,
    },
    dateText: {
      fontSize: 14,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    numbersSection: {
      marginBottom: 8,
    },
    numbersLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    numbersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    numberBall: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    numberText: {
      fontSize: 16,
      fontWeight: '700',
    },
    sumBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: `${COLORS.textSecondary}15`,
      borderRadius: 8,
      marginLeft: 4,
    },
    sumText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.textSecondary,
    },
    footerLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
  });
