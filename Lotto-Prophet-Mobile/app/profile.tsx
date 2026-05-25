import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useMemo, useEffect } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { getBaseUrl } from './lib/auth';

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

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'information' && styles.tabActive]}
          onPress={() => setActiveTab('information')}
        >
          <Ionicons name="person-outline" size={18} color={activeTab === 'information' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'information' && styles.tabTextActive]}>Information</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'password' && styles.tabActive]}
          onPress={() => setActiveTab('password')}
        >
          <Ionicons name="lock-closed-outline" size={18} color={activeTab === 'password' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>Password</Text>
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
  const { user, updateUser, updateAvatar } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    firstname: user?.firstname ?? '',
    surname: user?.surname ?? '',
    country_code: user?.country_code ?? '',
    mobile_number: user?.mobile_number ?? '',
    date_of_birth: user?.date_of_birth ? user.date_of_birth.split('T')[0] : '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstname: user.firstname,
        surname: user.surname,
        country_code: user.country_code,
        mobile_number: user.mobile_number,
        date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
      });
    }
  }, [user]);

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      await updateAvatar(asset.uri, asset.mimeType ?? 'image/jpeg');
      Alert.alert('Success', 'Profile photo updated!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!formData.firstname || !formData.surname || !formData.country_code || !formData.mobile_number || !formData.date_of_birth) {
      Alert.alert('Missing Fields', 'Please fill in all fields before saving.');
      return;
    }
    setSaving(true);
    try {
      await updateUser(formData);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <Pressable onPress={handlePickAvatar} style={styles.avatarWrapper}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: `${getBaseUrl()}${user.avatar_url}` }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {(user?.firstname?.[0] ?? '?').toUpperCase()}{(user?.surname?.[0] ?? '').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={14} color="#fff" />
            )}
          </View>
        </Pressable>
        <Text style={styles.avatarName}>{user?.firstname} {user?.surname}</Text>
        <Text style={styles.avatarEmail}>{user?.email}</Text>
        <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
          <Text style={[styles.changePhotoText, { color: COLORS.primary }]}>
            {uploadingAvatar ? 'Uploading…' : user?.avatar_url ? 'Change photo' : 'Upload photo'}
          </Text>
        </Pressable>
      </View>

      {/* Read-only email banner */}
      <View style={styles.readOnlyBanner}>
        <Ionicons name="mail" size={16} color={COLORS.textSecondary} />
        <Text style={styles.readOnlyText}>Email cannot be changed</Text>
      </View>

      <InputField label="First Name" value={formData.firstname} onChangeText={v => update('firstname', v)} icon="person-outline" />
      <InputField label="Last Name" value={formData.surname} onChangeText={v => update('surname', v)} icon="person-outline" />
      <InputField label="Country Code" value={formData.country_code} onChangeText={v => update('country_code', v)} icon="flag-outline" placeholder="+233" />
      <InputField label="Mobile Number" value={formData.mobile_number} onChangeText={v => update('mobile_number', v)} icon="call-outline" keyboardType="phone-pad" placeholder="0201234567" />
      <InputField label="Date of Birth" value={formData.date_of_birth} onChangeText={v => update('date_of_birth', v)} icon="calendar-outline" placeholder="YYYY-MM-DD" />

      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Changes</Text>
        }
      </Pressable>
    </Animated.View>
  );
}

function ProfilePassword() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { changePassword } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Password Changed', 'Your password has been updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

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
            value={currentPassword}
            onChangeText={setCurrentPassword}
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
            placeholder="Min. 8 characters"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
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
            placeholder="Repeat new password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Pressable onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.saveBtn, styles.successBtn, pressed && styles.successBtnPressed, saving && { opacity: 0.7 }]}
        onPress={handleChange}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Update Password</Text>
        }
      </Pressable>
    </Animated.View>
  );
}

function InputField({ label, value, onChangeText, icon, keyboardType = 'default', placeholder }: {
  label: string; value: string; onChangeText: (t: string) => void;
  icon: string; keyboardType?: 'default' | 'email-address' | 'phone-pad'; placeholder?: string;
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
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>
    </View>
  );
}

const createStyles = (COLORS: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 24 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  tabContainer: {
    flexDirection: 'row', marginHorizontal: 20, backgroundColor: COLORS.card,
    borderRadius: 14, padding: 6, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  tabActive: { backgroundColor: `${COLORS.primary}15` },
  tabText: { fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${COLORS.primary}20`, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.card,
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: COLORS.primary },
  avatarName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  avatarEmail: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  changePhotoText: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${COLORS.textSecondary}10`, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  readOnlyText: { fontSize: 13, color: COLORS.textSecondary },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1.5, borderColor: COLORS.border },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, fontSize: 16, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  saveBtnPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] },
  successBtn: { backgroundColor: COLORS.success, shadowColor: COLORS.success },
  successBtnPressed: { backgroundColor: '#0D9668' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  passwordIcon: { alignItems: 'center', marginBottom: 16 },
  passwordTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  passwordSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
});
