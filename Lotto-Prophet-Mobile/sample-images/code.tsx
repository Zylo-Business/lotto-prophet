import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

/* ---------------- NAVIGATORS ---------------- */
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();
const Tabs = createMaterialTopTabNavigator();

/* ---------------- SPLASH ---------------- */
function SplashScreen({ navigation }) {
  useEffect(() => {
    setTimeout(() => navigation.replace('Main'), 2000);
  }, []);

  return (
    <View style={styles.center}>
      <Text style={styles.logo}>LOTTOAGENT</Text>
      <ActivityIndicator size="large" color="#ff6a3d" />
      <Text style={styles.version}>Version 1.7.1 (25)</Text>
    </View>
  );
}

/* ---------------- DASHBOARD ---------------- */
function DashboardScreen() {
  const data = [
    { id: '1', name: 'Mega Millions', amount: '$366 Million', rollover: 'x19' },
    { id: '2', name: 'Powerball', amount: '$113 Million', rollover: 'x7' },
    { id: '3', name: 'EuroMillions', amount: '€39 Million', rollover: 'x2' },
    { id: '4', name: 'SuperLotto Plus', amount: '$27 Million', rollover: 'x20' },
    { id: '5', name: 'EuroJackpot', amount: '€22 Million', rollover: 'x2' },
  ];

  return (
    <View style={styles.screen}>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.amount}>{item.amount}</Text>
            <Text style={styles.rollover}>Rollover {item.rollover}</Text>
          </View>
        )}
      />
    </View>
  );
}

/* ---------------- NOTIFICATIONS ---------------- */
function NotificationsScreen() {
  const [state, setState] = useState({
    jackpot: true,
    results: true,
    promo: true,
    other: true,
  });

  const toggle = (key) =>
    setState((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <View style={styles.screen}>
      {[
        ['Jackpot events', 'jackpot'],
        ['Draw results', 'results'],
        ['Promotions', 'promo'],
        ['Other', 'other'],
      ].map(([label, key]) => (
        <View style={styles.row} key={key}>
          <Text style={styles.text}>{label}</Text>
          <Switch value={state[key]} onValueChange={() => toggle(key)} />
        </View>
      ))}
    </View>
  );
}

/* ---------------- PROFILE: INFO ---------------- */
function ProfileInfo() {
  return (
    <View style={styles.screen}>
      <TextInput style={styles.input} value="acceptupgrade@gmail.com" />
      <TextInput style={styles.input} value="Anthony" />
      <TextInput style={styles.input} value="Enchia" />
      <TextInput style={styles.input} value="July 10, 1994" />
      <TextInput style={styles.input} value="English" />
    </View>
  );
}

/* ---------------- PROFILE: PASSWORD ---------------- */
function ProfilePassword() {
  return (
    <View style={styles.screen}>
      <TextInput style={styles.input} placeholder="Old password" secureTextEntry />
      <TextInput style={styles.input} placeholder="New password" secureTextEntry />
      <TextInput
        style={styles.input}
        placeholder="Repeat new password"
        secureTextEntry
      />
      <TouchableOpacity style={styles.saveBtn}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------------- PROFILE TABS ---------------- */
function ProfileScreen() {
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarIndicatorStyle: { backgroundColor: '#ff6a3d' },
      }}
    >
      <Tabs.Screen name="Information" component={ProfileInfo} />
      <Tabs.Screen name="Password" component={ProfilePassword} />
    </Tabs.Navigator>
  );
}

/* ---------------- DRAWER ---------------- */
function DrawerNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: true }}>
      <Drawer.Screen name="Draws" component={DashboardScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

/* ---------------- APP ROOT ---------------- */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={DrawerNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff6a3d',
    marginBottom: 20,
  },
  version: {
    position: 'absolute',
    bottom: 20,
    color: '#aaa',
  },
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  rollover: {
    color: '#ff6a3d',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  text: {
    fontSize: 16,
  },
  input: {
    backgroundColor: '#f1f1f1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#7ed957',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
});
