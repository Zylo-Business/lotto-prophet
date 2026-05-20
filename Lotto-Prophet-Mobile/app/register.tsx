import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import DatePickerModal from './components/DatePickerModal';
import { useAuth } from './context/AuthContext';
import { useTheme, type AppColors } from './context/ThemeContext';

type FormErrors = {
  firstName?: string;
  surname?: string;
  email?: string;
  countryCode?: string;
  mobile?: string;
  dateOfBirth?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  general?: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+27');
  const [mobile, setMobile] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedDobDate, setSelectedDobDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Max date: 18 years ago from today
  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const { register, loading } = useAuth();

  const scrollToInput = (yOffset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 100);
  };

  function validate() {
    const newErrors: FormErrors = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!surname.trim()) {
      newErrors.surname = 'Surname is required';
    } else if (surname.trim().length < 2) {
      newErrors.surname = 'Surname must be at least 2 characters';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) newErrors.email = 'Enter a valid email address';
    }

    if (!countryCode.trim()) {
      newErrors.countryCode = 'Country code is required';
    } else {
      const codeRe = /^\+?\d{1,4}$/;
      if (!codeRe.test(countryCode.trim())) newErrors.countryCode = 'Invalid country code';
    }

    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else {
      const mobileRe = /^\d{10}$/;
      if (!mobileRe.test(mobile.replace(/\s/g, ''))) newErrors.mobile = 'Enter a valid 10-digit mobile number';
    }

    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const dobDate = new Date(dateOfBirth);
      if (isNaN(dobDate.getTime())) {
        newErrors.dateOfBirth = 'Enter a valid date (YYYY-MM-DD)';
      } else {
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        const isOldEnough = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())
          ? age - 1 >= 18
          : age >= 18;
        if (!isOldEnough) newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function onSubmit() {
    if (!validate()) return;
    setErrors(prev => ({ ...prev, general: undefined }));

    try {
      await register({
        firstname: firstName.trim(),
        surname: surname.trim(),
        email: email.trim(),
        country_code: countryCode.trim(),
        mobile_number: mobile.replace(/\s/g, ''),
        referral_code: referralCode.trim() || undefined,
        password,
        date_of_birth: dateOfBirth.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        router.replace('/login');
      }, 3000);
    } catch (e: any) {
      setErrors(prev => ({ ...prev, general: e.message || 'Registration failed' }));
    }
  }

  const clearError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const openTerms = () => {
    // Replace with your actual terms URL
    Linking.openURL('https://lottoprophet.com/terms');
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeInUp.duration(500)} style={styles.successContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </View>
            <Text style={styles.successTitle}>Account Created!</Text>
            <Text style={styles.successMessage}>
              Your account has been created successfully.{"\n"}You will be redirected to the sign-in page shortly.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                { marginTop: 24, width: '100%' },
              ]}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.submitButtonText}>Sign In Now</Text>
            </Pressable>
            <Text style={styles.redirectText}>Redirecting in a few seconds...</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.delay(100).duration(600)} style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('../assets/images/logo.jpeg')} style={styles.logoImage} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Lotto Prophet and start winning</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.formCard}>
            {/* General Error */}
            {errors.general && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            )}

            {/* First Name & Surname Row */}
            <View style={styles.rowContainer}>
              {/* First Name Field */}
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>First Name</Text>
                <View style={[styles.inputContainer, errors.firstName && styles.inputError]}>
                  <TextInput
                    autoCapitalize="words"
                    autoComplete="given-name"
                    placeholder="John"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (errors.firstName) clearError('firstName');
                    }}
                  />
                </View>
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>

              {/* Surname Field */}
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Surname</Text>
                <View style={[styles.inputContainer, errors.surname && styles.inputError]}>
                  <TextInput
                    autoCapitalize="words"
                    autoComplete="family-name"
                    placeholder="Doe"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={surname}
                    onChangeText={(text) => {
                      setSurname(text);
                      if (errors.surname) clearError('surname');
                    }}
                  />
                </View>
                {errors.surname && <Text style={styles.errorText}>{errors.surname}</Text>}
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) clearError('email');
                  }}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Mobile Number Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.mobileRow}>
                {/* Country Code */}
                <View style={[styles.countryCodeContainer, errors.countryCode && styles.inputError]}>
                  <TextInput
                    keyboardType="phone-pad"
                    placeholder="+27"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.countryCodeInput}
                    value={countryCode}
                    onChangeText={(text) => {
                      setCountryCode(text);
                      if (errors.countryCode) clearError('countryCode');
                    }}
                  />
                </View>
                {/* Mobile Number */}
                <View style={[styles.mobileInputContainer, errors.mobile && styles.inputError]}>
                  <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    placeholder="1234567890"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                    value={mobile}
                    onChangeText={(text) => {
                      setMobile(text);
                      if (errors.mobile) clearError('mobile');
                    }}
                    onFocus={() => scrollToInput(100)}
                  />
                </View>
              </View>
              {errors.countryCode && <Text style={styles.errorText}>{errors.countryCode}</Text>}
              {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
            </View>

            {/* Date of Birth Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <Pressable
                style={[styles.inputContainer, errors.dateOfBirth && styles.inputError]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
                  {dateOfBirth || 'Select your date of birth'}
                </Text>
              </Pressable>
              <Text style={styles.helperText}>Must be 18 years or older</Text>
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>

            <DatePickerModal
              visible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              selectedDate={selectedDobDate}
              maxDate={maxDobDate}
              onSelect={(date) => {
                setSelectedDobDate(date);
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                setDateOfBirth(`${yyyy}-${mm}-${dd}`);
                if (errors.dateOfBirth) clearError('dateOfBirth');
              }}
            />

            {/* Referral Code Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Referral Code <Text style={styles.optionalLabel}>(Optional)</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="gift-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  autoCapitalize="characters"
                  placeholder="Enter referral code"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={referralCode}
                  onChangeText={setReferralCode}
                  onFocus={() => scrollToInput(180)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Create a password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) clearError('password');
                  }}
                  onFocus={() => scrollToInput(260)}
                />
                <Pressable onPress={() => setShowPassword(s => !s)} style={styles.eyeIcon}>
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </Pressable>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Confirm your password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) clearError('confirmPassword');
                  }}
                  onFocus={() => scrollToInput(340)}
                />
                <Pressable onPress={() => setShowConfirmPassword(s => !s)} style={styles.eyeIcon}>
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </Pressable>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Read Terms Link */}
            <Pressable style={styles.readTermsButton} onPress={openTerms}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
              <Text style={styles.readTermsText}>Read Terms and Conditions</Text>
              <Ionicons name="open-outline" size={16} color={COLORS.primary} />
            </Pressable>

            {/* Accept Terms Checkbox */}
            <Pressable 
              style={styles.checkboxContainer} 
              onPress={() => {
                setAcceptedTerms(!acceptedTerms);
                if (errors.terms) clearError('terms');
              }}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked, errors.terms && styles.checkboxError]}>
                {acceptedTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the <Text style={styles.termsLink}>Terms and Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>
            {errors.terms && <Text style={[styles.errorText, { marginTop: 4, marginBottom: 12 }]}>{errors.terms}</Text>}

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}> Sign In</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (COLORS: AppColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  optionalLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: COLORS.text,
  },
  mobileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeContainer: {
    width: 72,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeInput: {
    height: 52,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  mobileInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  dateText: {
    flex: 1,
    height: 52,
    lineHeight: 52,
    fontSize: 16,
    color: COLORS.text,
  },
  datePlaceholder: {
    color: COLORS.textSecondary,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  readTermsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  readTermsText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxError: {
    borderColor: COLORS.error,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  submitButton: {
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
  submitButtonPressed: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#3B1515' : '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successContent: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  redirectText: {
    marginTop: 16,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
