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
import {useRealtimeSync} from '@/hooks/useRealtimeSync';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

/**
 * 인증된 사용자 전용 래퍼 — 글로벌 동기화 훅 마운트.
 * isAuthenticated=true 일 때만 렌더되므로 로그아웃 시 자동 cleanup.
 */
function AuthenticatedApp() {
  useRealtimeSync();
  return <MainTabNavigator />;
}

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
        <Stack.Screen name="Main" component={AuthenticatedApp} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
