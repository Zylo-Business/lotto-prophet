import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';

const CONTACT_OPTIONS = [
  { icon: 'mail', label: 'Email', value: 'support@lottoprophet.com', action: 'mailto:support@lottoprophet.com' },
  { icon: 'call', label: 'Phone', value: '+1 (800) 123-4567', action: 'tel:+18001234567' },
  { icon: 'logo-whatsapp', label: 'WhatsApp', value: '+1 (800) 123-4567', action: 'https://wa.me/18001234567' },
  { icon: 'globe', label: 'Website', value: 'www.lottoprophet.com', action: 'https://lottoprophet.com' },
];

export default function Contact() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');

  const handleContact = (action: string) => {
    Linking.openURL(action);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <Text style={styles.headerSubtitle}>We'd love to hear from you</Text>
      </Animated.View>

      {/* Contact Options */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.optionsCard}>
        {CONTACT_OPTIONS.map((option, index) => (
          <Pressable
            key={option.label}
            style={({ pressed }) => [
              styles.optionRow,
              index === CONTACT_OPTIONS.length - 1 && styles.lastRow,
              pressed && styles.optionPressed,
            ]}
            onPress={() => handleContact(option.action)}
          >
            <View style={styles.optionIcon}>
              <Ionicons name={option.icon as any} size={22} color={COLORS.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionValue}>{option.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </Pressable>
        ))}
      </Animated.View>

      {/* Message Form */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.formCard}>
        <Text style={styles.formTitle}>Send us a message</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subject</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="What's this about?"
              placeholderTextColor={COLORS.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Message</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us how we can help..."
              placeholderTextColor={COLORS.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        <Pressable style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
          <Text style={styles.sendBtnText}>Send Message</Text>
        </Pressable>
      </Animated.View>

      {/* FAQ Link */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.faqCard}>
        <Ionicons name="help-circle" size={32} color={COLORS.primary} />
        <View style={styles.faqText}>
          <Text style={styles.faqTitle}>Need quick answers?</Text>
          <Text style={styles.faqSubtitle}>Check out our FAQ section</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
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
  optionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  optionPressed: {
    backgroundColor: COLORS.inputBg,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
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
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
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
  textArea: {
    height: 120,
    paddingTop: 0,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnPressed: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  faqCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqText: {
    flex: 1,
    marginLeft: 14,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  faqSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
