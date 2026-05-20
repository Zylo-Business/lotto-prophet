import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef, useMemo } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Paystack, paystackProps } from 'react-native-paystack-webview';
import { useTheme, type AppColors } from './context/ThemeContext';

const { width } = Dimensions.get('window');
const GOLD = '#FFD700';

export default function SubscriptionScreen() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);
  const paystackWebViewRef = useRef<paystackProps.PayStackRef>(null);

  // Subscription Plans
  const PLANS = [
    {
      id: 'basic',
      name: 'Basic',
      price: 1999,
      currency: 'NGN',
      period: 'month',
      icon: 'star-outline' as const,
      color: COLORS.primary,
      popular: false,
      features: [
        'Daily number predictions',
        'Basic statistics',
        'Email notifications',
        '5 saved combinations',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 4999,
      currency: 'NGN',
      period: 'month',
      icon: 'star-half' as const,
      color: COLORS.warning,
      popular: true,
      features: [
        'All Basic features',
        'AI-powered predictions',
        'Advanced analytics',
        'Unlimited combinations',
        'Priority support',
        'Weekly hot numbers',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 9999,
      currency: 'NGN',
      period: 'month',
      icon: 'star' as const,
      color: GOLD,
      popular: false,
      features: [
        'All Pro features',
        'VIP predictions',
        'Personal number consultant',
        'Early access to features',
        'Exclusive lottery pools',
        'Money-back guarantee',
        '24/7 priority support',
      ],
    },
  ];

  // Replace with your actual Paystack public key
  const PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  
  // User email - should come from auth context in production
  const userEmail = 'user@example.com';

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a subscription plan to continue.');
      return;
    }
    setShowPaystack(true);
  };

  const getSelectedPlanDetails = () => {
    return PLANS.find(p => p.id === selectedPlan);
  };

  const handlePaystackSuccess = (response: any) => {
    setShowPaystack(false);
    setIsProcessing(true);
    
    // In production, verify the transaction on your backend
    console.log('Payment Success:', response);
    
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert(
        'Subscription Active! 🎉',
        `Your ${getSelectedPlanDetails()?.name} plan is now active. Enjoy premium features!`,
        [{ text: 'Start Winning', style: 'default' }]
      );
    }, 1500);
  };

  const handlePaystackCancel = () => {
    setShowPaystack(false);
    Alert.alert('Payment Cancelled', 'Your subscription was not completed.');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
          <View style={styles.crownContainer}>
            <Ionicons name="diamond" size={48} color={GOLD} />
          </View>
          <Text style={styles.headerTitle}>Unlock Premium</Text>
          <Text style={styles.headerSubtitle}>
            Get access to AI-powered predictions and increase your chances of winning
          </Text>
        </Animated.View>

        {/* Plans */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.plansContainer}>
          {PLANS.map((plan, index) => (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.popular && styles.planCardPopular,
              ]}
              onPress={() => handleSelectPlan(plan.id)}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <View style={[styles.planIconContainer, { backgroundColor: `${plan.color}20` }]}>
                  <Ionicons name={plan.icon} size={28} color={plan.color} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                    <Text style={styles.planPeriod}>/{plan.period}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioOuter,
                  selectedPlan === plan.id && styles.radioOuterSelected,
                ]}>
                  {selectedPlan === plan.id && <View style={styles.radioInner} />}
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </Animated.View>

        {/* Benefits */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Why Subscribe?</Text>
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitItem}>
              <Ionicons name="trending-up" size={24} color={COLORS.success} />
              <Text style={styles.benefitLabel}>85% accuracy</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <Text style={styles.benefitLabel}>Secure payment</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="refresh" size={24} color={COLORS.warning} />
              <Text style={styles.benefitLabel}>Cancel anytime</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="headset" size={24} color={COLORS.accent} />
              <Text style={styles.benefitLabel}>24/7 support</Text>
            </View>
          </View>
        </Animated.View>

        {/* Trust Badges */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.trustSection}>
          <View style={styles.trustBadge}>
            <Ionicons name="lock-closed" size={16} color={COLORS.success} />
            <Text style={styles.trustText}>Secured by Paystack</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="card" size={16} color={COLORS.primary} />
            <Text style={styles.trustText}>Cards & Bank Transfer</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Subscribe Button */}
      <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.bottomContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.subscribeButton,
            !selectedPlan && styles.subscribeButtonDisabled,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSubscribe}
          disabled={!selectedPlan || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="diamond" size={20} color="#FFFFFF" />
              <Text style={styles.subscribeButtonText}>
                {selectedPlan 
                  ? `Subscribe to ${getSelectedPlanDetails()?.name} - ${formatPrice(getSelectedPlanDetails()?.price || 0)}`
                  : 'Select a Plan'
                }
              </Text>
            </>
          )}
        </Pressable>
        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service
        </Text>
      </Animated.View>

      {/* Paystack Payment Modal */}
      {showPaystack && selectedPlan && (
        <Modal visible={showPaystack} animationType="slide" transparent={false}>
          <View style={styles.paystackContainer}>
            <Paystack
              paystackKey={PAYSTACK_PUBLIC_KEY}
              billingEmail={userEmail}
              amount={getSelectedPlanDetails()?.price || 0}
              currency="NGN"
              onCancel={handlePaystackCancel}
              onSuccess={handlePaystackSuccess}
              ref={paystackWebViewRef}
              autoStart={true}
              channels={['card', 'bank', 'ussd', 'bank_transfer']}
              activityIndicatorColor={COLORS.primary}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const createStyles = (COLORS: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${GOLD}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}05`,
  },
  planCardPopular: {
    borderColor: COLORS.warning,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -60,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planInfo: {
    flex: 1,
    marginLeft: 14,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  planPeriod: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  featuresContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
  },
  benefitsSection: {
    marginTop: 28,
    padding: 20,
    backgroundColor: COLORS.card,
    borderRadius: 16,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  benefitItem: {
    width: (width - 80) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  benefitLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  trustText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  subscribeButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  subscribeButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  paystackContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
