import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';

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
};

function SettingItem({
  icon,
  iconColor,
  label,
  description,
  hasSwitch,
  switchValue,
  onSwitchChange,
  onPress,
  showChevron = true,
  danger = false,
  colors,
  isDark,
}: SettingItemProps) {
  const color = iconColor ?? colors.primary;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        pressed && !hasSwitch && { backgroundColor: isDark ? '#1E2233' : '#F9FAFB' },
      ]}
      onPress={hasSwitch ? undefined : onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.settingText}>
        <Text style={[{ fontSize: 16, fontWeight: '500', color: colors.text }, danger && { color: colors.accent }]}>
          {label}
        </Text>
        {description && (
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{description}</Text>
        )}
      </View>
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.border, true: `${colors.primary}50` }}
          thumbColor={switchValue ? colors.primary : isDark ? '#555' : '#f4f3f4'}
          ios_backgroundColor={colors.border}
        />
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { colors, isDark, setMode } = useTheme();
  const [biometrics, setBiometrics] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => router.replace('/login') },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive' },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 4 }}>
          Customize your experience
        </Text>
      </Animated.View>

      {/* Appearance */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="moon"
            label="Dark Mode"
            description="Switch to dark theme"
            hasSwitch
            switchValue={isDark}
            onSwitchChange={() => setMode(isDark ? 'light' : 'dark')}
            colors={colors}
            isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* Security */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="finger-print"
            iconColor={colors.success}
            label="Biometric Login"
            description="Use fingerprint or face ID"
            hasSwitch
            switchValue={biometrics}
            onSwitchChange={() => setBiometrics(!biometrics)}
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="lock-closed"
            iconColor={colors.success}
            label="Change Password"
            onPress={() => router.push('/profile')}
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="shield-checkmark"
            iconColor={colors.success}
            label="Two-Factor Authentication"
            colors={colors}
            isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* Privacy */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Privacy</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="analytics"
            iconColor={colors.warning}
            label="Analytics"
            description="Help us improve the app"
            hasSwitch
            switchValue={analytics}
            onSwitchChange={() => setAnalytics(!analytics)}
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="document-text"
            iconColor={colors.warning}
            label="Privacy Policy"
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="reader"
            iconColor={colors.warning}
            label="Terms of Service"
            colors={colors}
            isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* About */}
      <Animated.View entering={FadeInDown.delay(250).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="information-circle"
            label="App Version"
            description="1.0.0"
            showChevron={false}
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="star"
            label="Rate the App"
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="share-social"
            label="Share with Friends"
            colors={colors}
            isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* Account Actions */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingItem
            icon="log-out"
            iconColor={colors.accent}
            label="Sign Out"
            onPress={handleLogout}
            danger
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="trash"
            iconColor={colors.accent}
            label="Delete Account"
            onPress={handleDeleteAccount}
            danger
            colors={colors}
            isDark={isDark}
          />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingText: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginLeft: 74,
  },
});
