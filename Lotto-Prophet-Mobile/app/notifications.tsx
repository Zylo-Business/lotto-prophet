import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';

const NOTIFICATION_SETTINGS = [
  { key: 'jackpot', label: 'Jackpot events', icon: 'trophy', description: 'Get notified when jackpots reach record amounts' },
  { key: 'results', label: 'Draw results', icon: 'checkmark-circle', description: 'Receive results immediately after each draw' },
  { key: 'promo', label: 'Promotions', icon: 'gift', description: 'Special offers and bonus opportunities' },
  { key: 'predictions', label: 'Predictions', icon: 'analytics', description: 'AI-powered number predictions and insights' },
  { key: 'reminders', label: 'Draw reminders', icon: 'alarm', description: 'Never miss a draw with timely reminders' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', description: 'General updates and news' },
];

type SettingsState = Record<string, boolean>;

export default function Notifications() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [settings, setSettings] = useState<SettingsState>({
    jackpot: true,
    results: true,
    promo: false,
    predictions: true,
    reminders: true,
    other: false,
  });

  const toggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Manage your alert preferences</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.card}>
        {NOTIFICATION_SETTINGS.map((item, index) => (
          <Animated.View 
            key={item.key}
            entering={FadeInDown.delay(150 + index * 50).duration(400)}
            style={[styles.row, index === NOTIFICATION_SETTINGS.length - 1 && styles.lastRow]}
          >
            <View style={[styles.iconContainer, { backgroundColor: settings[item.key] ? `${COLORS.primary}15` : `${COLORS.textSecondary}10` }]}>
              <Ionicons 
                name={item.icon as any} 
                size={22} 
                color={settings[item.key] ? COLORS.primary : COLORS.textSecondary} 
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={() => toggle(item.key)}
              trackColor={{ false: '#E5E7EB', true: `${COLORS.primary}50` }}
              thumbColor={settings[item.key] ? COLORS.primary : '#f4f3f4'}
              ios_backgroundColor="#E5E7EB"
            />
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          You can change these settings at any time. Push notifications require device permissions.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = (COLORS: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
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
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    padding: 16,
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
