import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { storage } from './lib/storage';
import { useTheme, type AppColors } from './context/ThemeContext';

const PREFS_KEY = 'notification_prefs';

const NOTIFICATION_SETTINGS = [
  { key: 'jackpot', label: 'Jackpot Events', icon: 'trophy', description: 'Get notified when jackpots reach record amounts', defaultOn: true },
  { key: 'results', label: 'Draw Results', icon: 'checkmark-circle', description: 'Receive results immediately after each draw', defaultOn: true },
  { key: 'predictions', label: 'AI Predictions', icon: 'analytics', description: 'AI-powered number predictions and insights', defaultOn: true },
  { key: 'reminders', label: 'Draw Reminders', icon: 'alarm', description: 'Never miss a draw with timely reminders', defaultOn: true },
  { key: 'promo', label: 'Promotions', icon: 'gift', description: 'Special offers and bonus opportunities', defaultOn: false },
  { key: 'news', label: 'App News', icon: 'newspaper', description: 'New features, updates and announcements', defaultOn: false },
];

const DEFAULT_STATE = Object.fromEntries(NOTIFICATION_SETTINGS.map(s => [s.key, s.defaultOn]));

type SettingsState = Record<string, boolean>;

export default function Notifications() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    storage.getItem(PREFS_KEY).then(raw => {
      if (raw) {
        try { setSettings({ ...DEFAULT_STATE, ...JSON.parse(raw) }); } catch {}
      }
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (key: string) => {
    setSaved(false);
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    await storage.setItem(PREFS_KEY, JSON.stringify(settings));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const enabledCount = Object.values(settings).filter(Boolean).length;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Manage your alert preferences</Text>
      </Animated.View>

      {/* Summary pill */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.summaryRow}>
        <View style={[styles.summaryPill, { backgroundColor: `${COLORS.primary}15` }]}>
          <Ionicons name="notifications" size={16} color={COLORS.primary} />
          <Text style={[styles.summaryText, { color: COLORS.primary }]}>
            {enabledCount} of {NOTIFICATION_SETTINGS.length} alerts enabled
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.card}>
        {NOTIFICATION_SETTINGS.map((item, index) => (
          <Animated.View
            key={item.key}
            entering={FadeInDown.delay(150 + index * 50).duration(400)}
            style={[styles.row, index === NOTIFICATION_SETTINGS.length - 1 && styles.lastRow]}
          >
            <View style={[styles.iconContainer, { backgroundColor: settings[item.key] ? `${COLORS.primary}15` : `${COLORS.textSecondary}10` }]}>
              <Ionicons name={item.icon as any} size={22} color={settings[item.key] ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={() => toggle(item.key)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings[item.key] ? COLORS.primary : '#f4f3f4'}
              ios_backgroundColor={COLORS.border}
            />
          </Animated.View>
        ))}
      </Animated.View>

      {/* Save button */}
      <Animated.View entering={FadeInDown.delay(500).duration(400)}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, saved && styles.savedBtn]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : saved
              ? (<><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.saveBtnText}>Preferences Saved</Text></>)
              : (<><Ionicons name="save-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>Save Preferences</Text></>)
          }
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(550).duration(400)} style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Push notifications require device permissions. Changes take effect immediately after saving.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = (COLORS: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  summaryRow: { marginBottom: 16 },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  summaryText: { fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: COLORS.card, borderRadius: 20, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  lastRow: { borderBottomWidth: 0 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  textContainer: { flex: 1, marginRight: 12 },
  label: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  description: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, marginBottom: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  savedBtn: { backgroundColor: COLORS.success },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, backgroundColor: `${COLORS.primary}08`, borderRadius: 12 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
