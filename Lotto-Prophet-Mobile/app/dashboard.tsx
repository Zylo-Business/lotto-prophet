import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from './context/AuthContext';
import { useTheme, type AppColors } from './context/ThemeContext';
import {
  fetchDrawSources,
  getDrawDisplayName,
  getDrawIcon,
  getDrawColor,
  type DrawSource,
} from './lib/draws';

export default function Dashboard() {
  const { loading: authLoading } = useAuth();
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<DrawSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) loadSources();
  }, [authLoading]);

  const loadSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDrawSources();
      setSources(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load draws');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading draws...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.loadingText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadSources}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: DrawSource; index: number }) => {
    const displayName = getDrawDisplayName(item.source);
    const icon = getDrawIcon(item.source);
    const color = getDrawColor(item.source);

    return (
      <Animated.View entering={FadeInDown.delay(100 * index).duration(400)}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() =>
            router.push({
              pathname: '/draw-detail',
              params: { source: item.source, name: displayName },
            })
          }
        >
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={28} color={color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{displayName}</Text>
            <Text style={styles.drawCount}>{item.draw_count} draws</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sources}
        keyExtractor={(item) => item.source}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={null}
        ListFooterComponent={
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.toolsSection}>
            <Text style={styles.toolsSectionTitle}>Tools</Text>
            <Text style={styles.toolsSectionSubtitle}>Analysis & pattern recognition</Text>

            <Pressable
              style={({ pressed }) => [styles.toolCard, pressed && styles.cardPressed]}
              onPress={() => router.push('/lapping-2')}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                <Ionicons name="git-compare" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Lapping 2</Text>
                <Text style={styles.drawCount}>Detect patterns across 2 consecutive draws</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.toolCard, pressed && styles.cardPressed]}
              onPress={() => router.push('/lapping-3')}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="git-network" size={28} color="#F59E0B" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Lapping 3</Text>
                <Text style={styles.drawCount}>Scan 3-row patterns across consecutive draws</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
            </Pressable>
          </Animated.View>
        }
      />
    </View>
  );
}

const createStyles = (COLORS: AppColors) => StyleSheet.create({
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
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  drawCount: {
    fontSize: 14,
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
  toolsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border ?? '#E5E7EB',
  },
  toolsSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  toolsSectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  toolCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  toolIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
});
