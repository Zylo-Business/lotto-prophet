import 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useRef } from 'react';
import { Image, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme, LightColors } from './context/ThemeContext';

// Static fallback for StyleSheet (overridden inline with dynamic colors)
const COLORS = LightColors;

function CustomDrawerContent(props: any) {
  const { colors, isDark, setMode } = useTheme();
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [supportOpen, setSupportOpen] = React.useState(false);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.drawerContent, { backgroundColor: colors.card }]}
    >
      {/* Header */}
      <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.logoContainer, { backgroundColor: `${colors.primary}15` }]}>
          <Image source={require('../assets/images/logo.jpeg')} style={styles.logoImage} />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>Lotto Prophet</Text>
        <Text style={[styles.appTagline, { color: colors.textSecondary }]}>Your lucky companion</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.drawerItems}>
        {/* ── Main ──────────────────────────────── */}
        <DrawerItem
          label="Home"
          icon={({ size }) => <Ionicons name="home" size={size} color={colors.primary} />}
          onPress={() => props.navigation.navigate('index')}
          labelStyle={[styles.drawerLabel, { color: colors.text }]}
        />
        <DrawerItem
          label="Draws"
          icon={({ size }) => <Ionicons name="ticket" size={size} color={colors.primary} />}
          onPress={() => props.navigation.navigate('dashboard')}
          labelStyle={[styles.drawerLabel, { color: colors.text }]}
        />

        {/* ── Learn & Shop ─────────────────────── */}
        <View style={[styles.sectionDivider, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Learn & Shop</Text>
        </View>
        <DrawerItem
          label="University"
          icon={({ size }) => <Ionicons name="school" size={size} color={colors.primary} />}
          onPress={() => props.navigation.navigate('university')}
          labelStyle={[styles.drawerLabel, { color: colors.text }]}
        />
        <DrawerItem
          label="Buy My Chart"
          icon={({ size }) => <Ionicons name="cart" size={size} color={colors.primary} />}
          onPress={() => props.navigation.navigate('buy-chart')}
          labelStyle={[styles.drawerLabel, { color: colors.text }]}
        />
        <DrawerItem
          label="Community"
          icon={({ size }) => <Ionicons name="people" size={size} color={colors.primary} />}
          onPress={() => props.navigation.navigate('community')}
          labelStyle={[styles.drawerLabel, { color: colors.text }]}
        />

        {/* ── Tools (dropdown) ─────────────────── */}
        <Pressable
          style={[styles.toolsSectionHeader, { borderTopColor: colors.border }]}
          onPress={() => setToolsOpen((prev) => !prev)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="build" size={16} color={colors.textSecondary} />
            <Text style={[styles.toolsSectionLabel, { color: colors.textSecondary }]}>Tools</Text>
          </View>
          <Ionicons
            name={toolsOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
        {toolsOpen && (
          <>
            <DrawerItem
              label="Lapping 2"
              icon={({ size }) => <Ionicons name="git-compare" size={size} color={colors.primary} />}
              onPress={() => props.navigation.navigate('lapping-2')}
              labelStyle={[styles.drawerLabel, { color: colors.text }]}
            />
            <DrawerItem
              label="Lapping 3"
              icon={({ size }) => <Ionicons name="git-network" size={size} color="#F59E0B" />}
              onPress={() => props.navigation.navigate('lapping-3')}
              labelStyle={[styles.drawerLabel, { color: colors.text }]}
            />
          </>
        )}

        {/* ── Account (dropdown) ───────────────── */}
        <Pressable
          style={[styles.toolsSectionHeader, { borderTopColor: colors.border }]}
          onPress={() => setAccountOpen((prev) => !prev)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="person-circle" size={16} color={colors.textSecondary} />
            <Text style={[styles.toolsSectionLabel, { color: colors.textSecondary }]}>Account</Text>
          </View>
          <Ionicons
            name={accountOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
        {accountOpen && (
          <>
            <DrawerItem
              label="Profile"
              icon={({ size }) => <Ionicons name="person" size={size} color={colors.primary} />}
              onPress={() => props.navigation.navigate('profile')}
              labelStyle={[styles.drawerLabel, { color: colors.text }]}
            />
            <DrawerItem
              label="Notifications"
              icon={({ size }) => <Ionicons name="notifications" size={size} color={colors.primary} />}
              onPress={() => props.navigation.navigate('notifications')}
              labelStyle={[styles.drawerLabel, { color: colors.text }]}
            />
            <DrawerItem
              label="Settings"
              icon={({ size }) => <Ionicons name="settings" size={size} color={colors.primary} />}
              onPress={() => props.navigation.navigate('settings')}
              labelStyle={[styles.drawerLabel, { color: colors.text }]}
            />
            <DrawerItem
              label="Subscription"
              icon={({ size }) => <Ionicons name="diamond" size={size} color="#FFD700" />}
              onPress={() => props.navigation.navigate('subscription')}
              labelStyle={[styles.drawerLabel, { color: '#FFD700', fontWeight: '600' }]}
            />
          </>
        )}

        {/* ── Support (dropdown) ───────────────── */}
        <Pressable
          style={[styles.toolsSectionHeader, { borderTopColor: colors.border }]}
          onPress={() => setSupportOpen((prev) => !prev)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="help-circle" size={16} color={colors.textSecondary} />
            <Text style={[styles.toolsSectionLabel, { color: colors.textSecondary }]}>Support</Text>
          </View>
          <Ionicons
            name={supportOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
        {supportOpen && (
          <>
            <DrawerItem
              label="Contact"
              icon={({ size }) => <Ionicons name="chatbubbles" size={size} color={colors.primary} />}
              onPress={() => props.navigation.navigate('contact')}
              labelStyle={[styles.drawerLabel, { color: colors.text }]}
            />
          </>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
        {/* Dark Mode Toggle */}
        <Pressable
          style={styles.themeToggleRow}
          onPress={() => setMode(isDark ? 'light' : 'dark')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={colors.primary} />
            <Text style={[styles.drawerLabel, { color: colors.text }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(val) => setMode(val ? 'dark' : 'light')}
            trackColor={{ false: colors.border, true: `${colors.primary}50` }}
            thumbColor={isDark ? colors.primary : '#f4f3f4'}
            ios_backgroundColor={colors.border}
          />
        </Pressable>
        <DrawerItem
          label="Sign Out"
          icon={({ size }) => <Ionicons name="log-out" size={size} color="#FF6B6B" />}
          onPress={() => props.navigation.navigate('login')}
          labelStyle={[styles.drawerLabel, { color: '#FF6B6B' }]}
        />
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}

function AppDrawer() {
  const { colors } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        drawerStyle: { backgroundColor: colors.card, width: 280 },
        drawerActiveBackgroundColor: `${colors.primary}15`,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Home', headerTitle: 'Lotto Prophet' }} />
      <Drawer.Screen name="splash" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="login" options={{ title: 'Login', headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="register" options={{ title: 'Register', headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="forgot-password" options={{ title: 'Forgot Password', headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="dashboard" options={{ title: 'Draws' }} />
      <Drawer.Screen name="draw-detail" options={{ title: 'Draw Data', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
      <Drawer.Screen name="contact" options={{ title: 'Contact Us' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      <Drawer.Screen name="subscription" options={{ title: 'Premium Plans' }} />
      <Drawer.Screen name="university" options={{ title: 'University' }} />
      <Drawer.Screen name="buy-chart" options={{ title: 'Buy My Chart' }} />
      <Drawer.Screen name="course-detail" options={{ title: 'Course', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="lesson-detail" options={{ title: 'Lesson', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="lapping-2" options={{ title: 'Lapping 2' }} />
      <Drawer.Screen name="lapping-3" options={{ title: 'Lapping 3' }} />
      <Drawer.Screen name="community" options={{ title: 'Community' }} />
    </Drawer>
  );
}

export default function RootLayout() {
  const router = useRouter();

  // TODO: Re-enable push notifications once EAS project is configured
  // useEffect(() => {
  //   registerForPushNotifications();
  //   ...
  // }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppDrawer />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 10,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  appTagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  drawerItems: {
    flex: 1,
    paddingTop: 10,
  },
  drawerLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: -16,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    paddingBottom: 20,
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  toolsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    marginTop: 4,
    borderTopWidth: 1,
  },
  toolsSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDivider: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
