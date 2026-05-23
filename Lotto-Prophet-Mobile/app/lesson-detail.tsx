import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { storage } from './lib/storage';
import { useTheme, type AppColors } from './context/ThemeContext';
import {
  fetchLesson,
  markLessonComplete,
  getLevelColor,
  type Lesson,
} from './lib/university';

export default function LessonDetail() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const { courseSlug, lessonSlug, courseName, lessonName } = useLocalSearchParams<{
    courseSlug: string;
    lessonSlug: string;
    courseName?: string;
    lessonName?: string;
  }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLesson = useCallback(async () => {
    if (!courseSlug || !lessonSlug) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLesson(courseSlug, lessonSlug);
      setLesson(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [courseSlug, lessonSlug]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const handleComplete = async () => {
    if (!lesson) return;
    const token = await storage.getItem('token');
    if (!token) return;

    try {
      setCompleting(true);
      await markLessonComplete(lesson.id, token);
      setCompleted(true);
    } catch {
      // Silently fail
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.loadingText}>{error || 'Lesson not found'}</Text>
        <Pressable style={styles.retryButton} onPress={loadLesson}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const color = getLevelColor(lesson.level);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Animated.View entering={FadeInUp.duration(500)}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.levelBadge, { backgroundColor: color }]}>
            <Text style={styles.levelBadgeText}>
              Level {lesson.level} — {lesson.level_name}
            </Text>
          </View>
          <Text style={styles.title}>{lesson.title}</Text>
          <Text style={styles.courseName}>{lesson.course_title}</Text>
        </View>

        {/* Content */}
        <View style={styles.contentCard}>
          {lesson.content ? (
            <Text style={styles.contentText}>{lesson.content}</Text>
          ) : (
            <View style={styles.emptyContent}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>Content coming soon</Text>
              <Text style={styles.emptySubtitle}>
                This lesson's content is being prepared. Check back soon!
              </Text>
            </View>
          )}
        </View>

        {/* Mark complete button */}
        {lesson.content && (
          <Pressable
            style={[
              styles.completeButton,
              completed
                ? { backgroundColor: '#10B981' }
                : { backgroundColor: color },
            ]}
            onPress={handleComplete}
            disabled={completing || completed}
          >
            <Text style={styles.completeButtonText}>
              {completed ? '✓ Completed' : completing ? 'Saving...' : 'Mark as Complete'}
            </Text>
          </Pressable>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          {lesson.prev ? (
            <Pressable
              style={styles.navButton}
              onPress={() =>
                router.replace({
                  pathname: '/lesson-detail',
                  params: {
                    courseSlug: lesson.course_slug,
                    lessonSlug: lesson.prev!.slug,
                    courseName: lesson.course_title,
                    lessonName: lesson.prev!.title,
                  },
                })
              }
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
              <Text style={[styles.navButtonText, { color: COLORS.primary }]} numberOfLines={1}>
                {lesson.prev.title}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          {lesson.next ? (
            <Pressable
              style={styles.navButton}
              onPress={() =>
                router.replace({
                  pathname: '/lesson-detail',
                  params: {
                    courseSlug: lesson.course_slug,
                    lessonSlug: lesson.next!.slug,
                    courseName: lesson.course_title,
                    lessonName: lesson.next!.title,
                  },
                })
              }
            >
              <Text style={[styles.navButtonText, { color: COLORS.primary }]} numberOfLines={1}>
                {lesson.next.title}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.navButton}
              onPress={() =>
                router.push({
                  pathname: '/course-detail',
                  params: { slug: lesson.course_slug, name: lesson.course_title },
                })
              }
            >
              <Text style={[styles.navButtonText, { color: COLORS.primary }]}>
                Back to Course
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = (COLORS: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
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
    },
    header: {
      marginBottom: 20,
    },
    levelBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginBottom: 10,
    },
    levelBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: COLORS.text,
    },
    courseName: {
      fontSize: 14,
      color: COLORS.textSecondary,
      marginTop: 4,
    },
    contentCard: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    contentText: {
      fontSize: 16,
      lineHeight: 26,
      color: COLORS.text,
    },
    emptyContent: {
      alignItems: 'center',
      paddingVertical: 32,
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
    },
    completeButton: {
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 20,
    },
    completeButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    navButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 10,
      maxWidth: '48%',
    },
    navButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
  });
