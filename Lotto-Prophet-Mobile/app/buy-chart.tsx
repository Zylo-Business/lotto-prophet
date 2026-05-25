import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';

const FEATURES = [
  'Full historical draw data with trend analysis',
  'Machine-specific pattern breakdowns',
  'Hot & cold number tables',
  'Frequency distribution charts',
  'AI-assisted prediction highlights',
  'Regular updates with new draw results',
];

export default function BuyChart() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="analytics" size={36} color="#fff" />
        </View>
      </Animated.View>

      {/* What's Included */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.card}>
        <Text style={styles.cardTitle}>What's Included</Text>
        {FEATURES.map((item, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.featureText}>{item}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Pricing */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.priceCard}>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>One-time purchase</Text>
            <Text style={styles.priceAmount}>R150</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Best Value</Text>
          </View>
        </View>
        <Text style={styles.priceNote}>
          Pay once, receive the chart via email. Includes future updates for 3 months.
        </Text>
      </Animated.View>

      {/* Payment Methods */}
      <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.card}>
        <Text style={styles.cardTitle}>How to Pay</Text>

        {/* EFT */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentHeader}>
            <Ionicons name="card" size={20} color={COLORS.primary} />
            <Text style={styles.paymentTitle}>EFT / Bank Transfer</Text>
          </View>
          <View style={styles.paymentBody}>
            <Text style={styles.paymentLine}><Text style={styles.bold}>Bank:</Text> FNB</Text>
            <Text style={styles.paymentLine}><Text style={styles.bold}>Account:</Text> 123 456 7890</Text>
            <Text style={styles.paymentLine}><Text style={styles.bold}>Branch:</Text> 250655</Text>
            <Text style={styles.paymentLine}><Text style={styles.bold}>Reference:</Text> Your email address</Text>
          </View>
        </View>

        {/* E-Wallet */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentHeader}>
            <Ionicons name="phone-portrait" size={20} color={COLORS.primary} />
            <Text style={styles.paymentTitle}>E-Wallet / Send Money</Text>
          </View>
          <View style={styles.paymentBody}>
            <Text style={styles.paymentLine}><Text style={styles.bold}>Number:</Text> 071 234 5678</Text>
            <Text style={styles.paymentLine}><Text style={styles.bold}>Name:</Text> Lotto Prophet</Text>
            <Text style={styles.paymentLine}><Text style={styles.bold}>Reference:</Text> Your email address</Text>
          </View>
        </View>
      </Animated.View>

      {/* After Payment */}
      <Animated.View entering={FadeInDown.delay(800).duration(500)} style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={20} color="#f59e0b" />
          <Text style={styles.infoTitle}>After Payment</Text>
        </View>
        <Text style={styles.infoText}>
          Once payment is confirmed, the Excel chart will be sent to your registered email within 24 hours. WhatsApp us your proof of payment at 071 234 5678 for faster delivery.
        </Text>
      </Animated.View>

      {/* WhatsApp CTA */}
      <Animated.View entering={FadeInDown.delay(1000).duration(500)} style={styles.ctaWrap}>
        <Pressable
          style={styles.ctaButton}
          onPress={() =>
            Linking.openURL(
              'https://wa.me/27712345678?text=Hi%2C%20I%20want%20to%20buy%20the%20Lotto%20Prophet%20chart'
            )
          }
        >
          <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          <Text style={styles.ctaText}>Order via WhatsApp</Text>
        </Pressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function createStyles(COLORS: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    headerIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    featureText: {
      fontSize: 14,
      color: COLORS.text,
      flex: 1,
    },
    priceCard: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    priceLabel: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    priceAmount: {
      fontSize: 32,
      fontWeight: '700',
      color: COLORS.text,
    },
    badge: {
      backgroundColor: `${COLORS.primary}20`,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.primary,
    },
    priceNote: {
      fontSize: 12,
      color: COLORS.textSecondary,
      lineHeight: 18,
    },
    paymentMethod: {
      backgroundColor: COLORS.background,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
    },
    paymentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    paymentTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.text,
    },
    paymentBody: {
      padding: 12,
      gap: 4,
    },
    paymentLine: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    bold: {
      fontWeight: '600',
      color: COLORS.text,
    },
    infoCard: {
      backgroundColor: '#fef3c720',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#f59e0b40',
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.text,
    },
    infoText: {
      fontSize: 13,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    ctaWrap: {
      alignItems: 'center',
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#16a34a',
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 14,
    },
    ctaText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
