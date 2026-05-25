import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { storage } from './lib/storage';
import { useTheme, type AppColors } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';

const SETTINGS_KEY = 'app_settings';

type SettingItemProps = {
  icon: string;
  iconColor?: string;
  label: string;
  description?: string;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: () => void;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
  colors: AppColors;
  isDark: boolean;
  valueLabel?: string;
};

function SettingItem({ icon, iconColor, label, description, hasSwitch, switchValue, onSwitchChange, onPress, showChevron = true, danger = false, colors, isDark, valueLabel }: SettingItemProps) {
  const color = iconColor ?? colors.primary;
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, pressed && !hasSwitch && { backgroundColor: isDark ? '#1E2233' : '#F9FAFB' }]}
      onPress={hasSwitch ? undefined : onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.settingText}>
        <Text style={[{ fontSize: 16, fontWeight: '500', color: colors.text }, danger && { color: colors.accent }]}>{label}</Text>
        {description && <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{description}</Text>}
      </View>
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.border, true: `${colors.primary}50` }}
          thumbColor={switchValue ? colors.primary : isDark ? '#555' : '#f4f3f4'}
          ios_backgroundColor={colors.border}
        />
      ) : valueLabel ? (
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginRight: 6 }}>{valueLabel}</Text>
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { colors, isDark, setMode } = useTheme();
  const { logout, user } = useAuth();
  const [biometrics, setBiometrics] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    storage.getItem(SETTINGS_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (saved.biometrics !== undefined) setBiometrics(saved.biometrics);
          if (saved.analytics !== undefined) setAnalytics(saved.analytics);
        } catch {}
      }
    });
  }, []);

  const persistSetting = async (key: string, value: boolean) => {
    const raw = await storage.getItem(SETTINGS_KEY).catch(() => null);
    const current = raw ? JSON.parse(raw) : {};
    await storage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, [key]: value }));
  };

  const handleBiometrics = () => {
    const next = !biometrics;
    setBiometrics(next);
    persistSetting('biometrics', next);
  };

  const handleAnalytics = () => {
    const next = !analytics;
    setAnalytics(next);
    persistSetting('analytics', next);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Account deletion must be requested through our support team.\n\nPlease contact support@lottoprophet.com and we will process your request within 48 hours.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>


      {/* Account info card */}
      {user && (
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={[styles.accountCard, { backgroundColor: colors.card }]}>
          <View style={[styles.accountAvatar, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={[styles.accountInitials, { color: colors.primary }]}>
              {user.firstname[0]?.toUpperCase()}{user.surname[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: colors.text }]}>{user.firstname} {user.surname}</Text>
            <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>{user.email}</Text>
          </View>
          <Pressable onPress={() => router.push('/profile')} style={[styles.editBtn, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </Pressable>
        </Animated.View>
      )}

      {/* Appearance */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="moon" label="Dark Mode" description="Switch between light and dark theme"
            hasSwitch switchValue={isDark} onSwitchChange={() => setMode(isDark ? 'light' : 'dark')}
            colors={colors} isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* Security */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="finger-print" iconColor={colors.success} label="Biometric Login"
            description="Use fingerprint or face ID to sign in"
            hasSwitch switchValue={biometrics} onSwitchChange={handleBiometrics}
            colors={colors} isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="lock-closed" iconColor={colors.success} label="Change Password"
            description="Update your account password"
            onPress={() => router.push('/profile')}
            colors={colors} isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* Notifications */}
      <Animated.View entering={FadeInDown.delay(180).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="notifications" iconColor={colors.warning} label="Notification Preferences"
            description="Choose which alerts you receive"
            onPress={() => router.push('/notifications')}
            colors={colors} isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* Privacy */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Privacy</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="analytics" iconColor={colors.warning} label="Analytics"
            description="Help us improve the app with usage data"
            hasSwitch switchValue={analytics} onSwitchChange={handleAnalytics}
            colors={colors} isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="document-text" iconColor={colors.warning} label="Privacy Policy"
            onPress={() => Linking.openURL('https://lottoprophet.com/privacy').catch(() => {})}
            colors={colors} isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="reader" iconColor={colors.warning} label="Terms of Service"
            onPress={() => Linking.openURL('https://lottoprophet.com/terms').catch(() => {})}
            colors={colors} isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* About */}
      <Animated.View entering={FadeInDown.delay(250).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="information-circle" label="App Version" valueLabel="1.0.0"
            showChevron={false} colors={colors} isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="star" iconColor="#FFD700" label="Rate the App"
            description="Enjoying Lotto Prophet? Leave a review"
            onPress={() => Alert.alert('Rate Us', 'Thank you! Rating will be available on launch.')}
            colors={colors} isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="share-social" label="Share with Friends"
            onPress={() => Alert.alert('Share', 'Sharing will be available on launch.')}
            colors={colors} isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* Account Actions */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="log-out" iconColor={colors.accent} label="Sign Out"
            onPress={handleLogout} danger colors={colors} isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="trash" iconColor={colors.accent} label="Delete Account"
            description="Permanently remove your account and data"
            onPress={handleDeleteAccount} danger colors={colors} isDark={isDark}
          />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  accountCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  accountAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  accountInitials: { fontSize: 20, fontWeight: '700' },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '700' },
  accountEmail: { fontSize: 13, marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingText: { flex: 1 },
  divider: { height: 1, marginLeft: 74 },
});
