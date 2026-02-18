/**
 * Root Navigator
 * 인증 상태 기반 분기: Login ↔ Main
 */
import React, {useEffect, useRef} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuthStore} from '@/stores/authStore';
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
} from '@/lib/revenueCat';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}

export default function RootNavigator() {
  const {isAuthenticated, initializing, initialize, user} = useAuthStore();
  const rcInitialized = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // RevenueCat SDK 초기화 (1회)
  useEffect(() => {
    if (!rcInitialized.current) {
      initRevenueCat();
      rcInitialized.current = true;
    }
  }, []);

  // 인증 상태 변경 시 RevenueCat 로그인/로그아웃
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loginRevenueCat(user.id);
    } else if (!isAuthenticated && rcInitialized.current) {
      logoutRevenueCat();
    }
  }, [isAuthenticated, user?.id]);

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
