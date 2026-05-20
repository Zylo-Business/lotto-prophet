import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { useTheme, type AppColors } from './context/ThemeContext';
import {
  fetchCourse,
  fetchProgress,
  getLevelColor,
  getLevelBadge,
  type CourseWithLessons,
  type LessonSummary,
  type UserProgress,
} from './lib/university';

export default function CourseDetail() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();

  const [course, setCourse] = useState<CourseWithLessons | null>(null);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCourse(slug);
      setCourse(data);

      // Try loading progress
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        try {
          const prog = await fetchProgress(token);
          setProgress(prog);
        } catch {
          // Progress is optional
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.loadingText}>{error || 'Course not found'}</Text>
        <Pressable style={styles.retryButton} onPress={loadCourse}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const color = getLevelColor(course.level);
  const badge = getLevelBadge(course.level);
  const completedIds = new Set(
    progress.filter((p) => p.course_id === course.id).map((p) => p.lesson_id)
  );
  const completedCount = course.lessons.filter((l) => completedIds.has(l.id)).length;
  const progressPercent =
    course.lessons.length > 0
      ? Math.round((completedCount / course.lessons.length) * 100)
      : 0;

  const renderLesson = ({ item, index }: { item: LessonSummary; index: number }) => {
    const isCompleted = completedIds.has(item.id);
    return (
      <Animated.View entering={FadeInDown.delay(80 * index).duration(300)}>
        <Pressable
          style={({ pressed }) => [
            styles.lessonCard,
            isCompleted && styles.lessonCompleted,
            pressed && styles.cardPressed,
          ]}
          onPress={() =>
            router.push({
              pathname: '/lesson-detail',
              params: {
                courseSlug: course.slug,
                lessonSlug: item.slug,
                courseName: course.title,
                lessonName: item.title,
              },
            })
          }
        >
          <View
            style={[
              styles.lessonNumber,
              isCompleted
                ? { backgroundColor: '#10B981' }
                : { backgroundColor: COLORS.inputBg || '#F3F4F6' },
            ]}
          >
            <Text
              style={[
                styles.lessonNumberText,
                isCompleted ? { color: '#fff' } : { color: COLORS.textSecondary },
              ]}
            >
              {isCompleted ? '✓' : index + 1}
            </Text>
          </View>
          <Text style={styles.lessonTitle}>{item.title}</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={course.lessons}
        keyExtractor={(item) => item.slug}
        renderItem={renderLesson}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View entering={FadeInUp.duration(500)}>
            {/* Course info */}
            <View style={styles.courseHeader}>
              <View style={[styles.courseIcon, { backgroundColor: `${color}15` }]}>
                <Text style={styles.courseIconText}>{course.icon}</Text>
              </View>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Text style={styles.badgeText}>Level {course.level}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
                  <Text style={[styles.badgeText, { color }]}>{badge}</Text>
                </View>
              </View>
              <Text style={styles.courseDescription}>
                {course.description || 'Content coming soon...'}
              </Text>

              {/* Progress bar */}
              {course.lessons.length > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>
                      {completedCount} of {course.lessons.length} lessons
                    </Text>
                    <Text style={[styles.progressPercent, { color }]}>{progressPercent}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Lessons heading */}
            {course.lessons.length > 0 && (
              <Text style={styles.sectionTitle}>Lessons</Text>
            )}
          </Animated.View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Lessons coming soon</Text>
            <Text style={styles.emptySubtitle}>
              The content for this course is being prepared. Check back soon!
            </Text>
          </View>
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
    list: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    courseHeader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    courseIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    courseIconText: {
      fontSize: 32,
    },
    courseTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: COLORS.text,
      textAlign: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    courseDescription: {
      fontSize: 15,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 22,
      paddingHorizontal: 8,
    },
    progressContainer: {
      width: '100%',
      marginTop: 20,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    progressPercent: {
      fontSize: 13,
      fontWeight: '600',
    },
    progressBarBg: {
      width: '100%',
      height: 6,
      backgroundColor: COLORS.inputBg || '#F3F4F6',
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.text,
      marginTop: 8,
      marginBottom: 12,
    },
    lessonCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    lessonCompleted: {
      backgroundColor: '#ECFDF5',
    },
    cardPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    lessonNumber: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    lessonNumberText: {
      fontWeight: '700',
      fontSize: 14,
    },
    lessonTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: COLORS.text,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginTop: 6,
      paddingHorizontal: 32,
    },
  });
