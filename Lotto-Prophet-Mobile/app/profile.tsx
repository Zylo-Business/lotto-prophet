import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';

type TabType = 'information' | 'password';

export default function Profile() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [activeTab, setActiveTab] = useState<TabType>('information');

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </Animated.View>

      {/* Tab Buttons */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'information' && styles.tabActive]}
          onPress={() => setActiveTab('information')}
        >
          <Ionicons 
            name="person-outline" 
            size={18} 
            color={activeTab === 'information' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'information' && styles.tabTextActive]}>
            Information
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'password' && styles.tabActive]}
          onPress={() => setActiveTab('password')}
        >
          <Ionicons 
            name="lock-closed-outline" 
            size={18} 
            color={activeTab === 'password' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
            Password
          </Text>
        </Pressable>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'information' ? <ProfileInfo /> : <ProfilePassword />}
      </ScrollView>
    </View>
  );
}

function ProfileInfo() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [formData, setFormData] = useState({
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: 'January 15, 1990',
    language: 'English',
    phone: '+27 123 456 7890',
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={COLORS.primary} />
        </View>
        <Pressable style={styles.changeAvatarBtn}>
          <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
          <Text style={styles.changeAvatarText}>Change photo</Text>
        </Pressable>
      </View>

      <InputField label="Email" value={formData.email} onChangeText={(v) => updateField('email', v)} icon="mail-outline" keyboardType="email-address" />
      <InputField label="First Name" value={formData.firstName} onChangeText={(v) => updateField('firstName', v)} icon="person-outline" />
      <InputField label="Last Name" value={formData.lastName} onChangeText={(v) => updateField('lastName', v)} icon="person-outline" />
      <InputField label="Date of Birth" value={formData.dateOfBirth} onChangeText={(v) => updateField('dateOfBirth', v)} icon="calendar-outline" />
      <InputField label="Phone" value={formData.phone} onChangeText={(v) => updateField('phone', v)} icon="call-outline" keyboardType="phone-pad" />
      <InputField label="Language" value={formData.language} onChangeText={(v) => updateField('language', v)} icon="language-outline" />

      <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}>
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </Pressable>
    </Animated.View>
  );
}

function ProfilePassword() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
      <View style={styles.passwordIcon}>
        <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.passwordTitle}>Change Password</Text>
      <Text style={styles.passwordSubtitle}>
        For security, please enter your current password before setting a new one
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter current password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry={!showOld}
          />
          <Pressable onPress={() => setShowOld(!showOld)}>
            <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry={!showNew}
          />
          <Pressable onPress={() => setShowNew(!showNew)}>
            <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm New Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry={!showConfirm}
          />
          <Pressable onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.saveBtn, styles.successBtn, pressed && styles.successBtnPressed]}>
        <Text style={styles.saveBtnText}>Update Password</Text>
      </Pressable>
    </Animated.View>
  );
}

function InputField({ label, value, onChangeText, icon, keyboardType = 'default' }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon as any} size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeAvatarText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnPressed: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  successBtn: {
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success,
  },
  successBtnPressed: {
    backgroundColor: '#0D9668',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  passwordSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
});
