/**
 * Root Navigator
 * 인증 상태 기반 분기: Login ↔ Main
 */
import React, {useCallback, useEffect, useRef} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuthStore} from '@/stores/authStore';
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
} from '@/lib/revenueCat';
import {useRealtimeSync} from '@/hooks/useRealtimeSync';
import {useSettingsSync} from '@/hooks/useSettingsSync';
import {useCleaningSettingsSync} from '@/hooks/useCleaningSettingsSync';
import {useSleepSettingsSync} from '@/hooks/useSleepSettingsSync';
import {usePlanLimitsStore} from '@/stores/planLimitsStore';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {useTheme} from '@/theme';
import {useSleepStore, useSleepStoreHydrated} from '@/stores/sleepStore';
import {useBedtimeMonitor} from '@/hooks/useBedtimeMonitor';
import {BedtimeModal} from '@/components/sleep/BedtimeModal';
import {useNavigation} from '@react-navigation/native';

import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

/**
 * 인증된 사용자 전용 래퍼 — 글로벌 동기화 훅 마운트.
 * isAuthenticated=true 일 때만 렌더되므로 로그아웃 시 자동 cleanup.
 */
function AuthenticatedApp() {
  useRealtimeSync();
  const navigation = useNavigation<any>();

  // 설정 DB 동기화 (morePanelShowLabels 등)
  const settingsUser = useAuthStore(s => s.user);
  useSettingsSync(settingsUser?.id);
  useCleaningSettingsSync(settingsUser?.id);
  useSleepSettingsSync(settingsUser?.id);

  // 세션 복구 (hydration 완료 후)
  const hydrated = useSleepStoreHydrated();
  const sessionStatus = useSleepStore(s => s.sessionState.status);
  const recoverSession = useSleepStore(s => s.recoverSession);

  useEffect(() => {
    if (!hydrated || sessionStatus !== 'running') return;
    recoverSession().then(() => {
      const current = useSleepStore.getState().sessionState;
      if (current.status === 'running') {
        navigation.navigate('Main', {screen: 'Home', params: {screen: 'SleepSession'}});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // 자동 취침 모니터
  const {showBedtimeModal, onStartSleep, onSnooze, onSkipTonight} = useBedtimeMonitor();
  const handleBedtimeStart = useCallback(() => {
    onStartSleep();
    navigation.navigate('Main', {screen: 'Home', params: {screen: 'SleepSession'}});
  }, [onStartSleep, navigation]);

  // plan_limits fetch + Realtime 구독 (인증 완료 시 1회)
  const {fetchLimits, subscribeLimits, unsubscribeLimits} = usePlanLimitsStore();
  useEffect(() => {
    fetchLimits();
    subscribeLimits();
    return () => {
      unsubscribeLimits();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 알림 채널 생성(Android) + 권한 요청(iOS/Android 13+) + 반복 알람 초기 스케줄
  const {autoSleepEnabled, sleepGoalTime} = useSleepStore();
  useEffect(() => {
    import('@/lib/notifications').then(
      ({
        setupNotificationChannel,
        requestNotificationPermission,
        scheduleExistingRecurringAlarms,
        scheduleSleepBedtimeNotification,
      }) => {
        setupNotificationChannel();
        requestNotificationPermission().then(granted => {
          if (granted) {
            scheduleExistingRecurringAlarms();
            // 자동 취침 알림 스케줄 (앱 시작 시)
            if (autoSleepEnabled) {
              scheduleSleepBedtimeNotification(sleepGoalTime);
            }
          }
        });
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <MainTabNavigator />
      <BedtimeModal
        visible={showBedtimeModal}
        onStartSleep={handleBedtimeStart}
        onSnooze={onSnooze}
        onSkipTonight={onSkipTonight}
      />
    </>
  );
}

function LoadingScreen() {
  const {primaryColor} = useTheme();
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color={primaryColor} />
    </View>
  );
}

export default function RootNavigator() {
  const {isAuthenticated, initializing, initialize, user} = useAuthStore();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // RevenueCat SDK 초기화 (1회)
  useEffect(() => {
    initRevenueCat();
  }, []);

  // 인증 상태 변경 시 RevenueCat 로그인/로그아웃 + Grace Period 설정
  const applyRevenueCatPurchase = useSubscriptionStore(
    s => s.applyRevenueCatPurchase,
  );
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loginRevenueCat(user.id).then(customerInfo => {
        // webhook 지연/실패 시에도 RevenueCat SDK 로컬 entitlement로 구독 상태 유지
        if (customerInfo?.entitlements?.active) {
          const active = customerInfo.entitlements.active;
          if (Object.keys(active).length > 0) {
            applyRevenueCatPurchase(active);
          }
        }
      });
      // Grace period: user.created_at 기반 7일 Pro 화면 접근
      if (user.created_at) {
        useSubscriptionStore.getState().setUserCreatedAt(user.created_at);
      }
      wasAuthenticated.current = true;
    } else if (!isAuthenticated && wasAuthenticated.current) {
      logoutRevenueCat();
      useSubscriptionStore.getState().reset();
      wasAuthenticated.current = false;
    }
  }, [isAuthenticated, user?.id, applyRevenueCatPurchase]);

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
