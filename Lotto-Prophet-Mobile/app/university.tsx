import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';
import {
  fetchCourses,
  getLevelColor,
  getLevelIcon,
  getLevelBadge,
  type Course,
} from './lib/university';

export default function University() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading university...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.loadingText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadCourses}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // Group courses by level
  const levels = [1, 2, 3];

  const renderLevel = ({ item: level, index }: { item: number; index: number }) => {
    const levelCourses = courses.filter((c) => c.level === level);
    if (levelCourses.length === 0) return null;

    const color = getLevelColor(level);
    const badge = getLevelBadge(level);

    return (
      <Animated.View entering={FadeInDown.delay(100 * index).duration(400)}>
        {/* Level header */}
        <View style={styles.levelHeader}>
          <View style={[styles.levelBadge, { backgroundColor: color }]}>
            <Text style={styles.levelNumber}>{level}</Text>
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>
              Level {level} — {levelCourses[0]?.level_name}
            </Text>
            <Text style={[styles.levelBadgeText, { color }]}>{badge}</Text>
          </View>
        </View>

        {/* Course cards for this level */}
        {levelCourses.map((course) => {
          const iconName = getLevelIcon(course.level);
          return (
            <Pressable
              key={course.slug}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() =>
                router.push({
                  pathname: '/course-detail',
                  params: { slug: course.slug, name: course.title },
                })
              }
            >
              <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Ionicons name={iconName as any} size={28} color={color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{course.title}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {course.description || 'Content coming soon...'}
                </Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.lessonBadge, { backgroundColor: `${color}15` }]}>
                    <Text style={[styles.lessonBadgeText, { color }]}>
                      {course.lesson_count} {course.lesson_count === 1 ? 'lesson' : 'lessons'}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
            </Pressable>
          );
        })}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <Text style={styles.headerTitle}>🏫 University</Text>
        <Text style={styles.headerSubtitle}>
          Learn lottery analysis from Foundation to Game Theory with AI
        </Text>
      </Animated.View>

      <FlatList
        data={levels}
        keyExtractor={(item) => String(item)}
        renderItem={renderLevel}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
      gap: 12,
    },
    loadingText: {
      color: COLORS.textSecondary,
      fontSize: 16,
      marginTop: 8,
    },
    retryButton: {
      marginTop: 12,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: COLORS.primary,
      borderRadius: 8,
    },
    retryText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
    header: {
      padding: 20,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: COLORS.text,
    },
    headerSubtitle: {
      fontSize: 15,
      color: COLORS.textSecondary,
      marginTop: 4,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    levelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 12,
    },
    levelBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    levelNumber: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    levelInfo: {
      flex: 1,
    },
    levelTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.text,
    },
    levelBadgeText: {
      fontSize: 13,
      fontWeight: '500',
      marginTop: 2,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    iconContainer: {
      width: 52,
      height: 52,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: COLORS.text,
    },
    cardDescription: {
      fontSize: 13,
      color: COLORS.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    lessonBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    lessonBadgeText: {
      fontSize: 12,
      fontWeight: '500',
    },
  });
