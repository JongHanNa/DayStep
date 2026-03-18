/**
 * Root Navigator
 * 인증 상태 기반 분기: Login ↔ Main
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useAuthStore} from '@/stores/authStore';
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  purchaseSelectedPackage,
} from '@/lib/revenueCat';
import Purchases from 'react-native-purchases';
import {useRealtimeSync} from '@/hooks/useRealtimeSync';
import {useSettingsSync} from '@/hooks/useSettingsSync';
import {useCleaningSettingsSync} from '@/hooks/useCleaningSettingsSync';
import {useSleepSettingsSync} from '@/hooks/useSleepSettingsSync';
import {usePlanLimitsStore} from '@/stores/planLimitsStore';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {supabase} from '@/lib/supabase';
import {TrialOfferModal} from '@/components/subscription/TrialOfferModal';
import {scheduleTrialExpiryReminder} from '@/lib/notifications';
import Config from 'react-native-config';
import {useTheme} from '@/theme';
import {useSleepStore, useSleepStoreHydrated} from '@/stores/sleepStore';
import {useBedtimeMonitor} from '@/hooks/useBedtimeMonitor';
import {BedtimeModal} from '@/components/sleep/BedtimeModal';
import {useNavigation} from '@react-navigation/native';

const TRIAL_DAYS = parseInt(Config.TRIAL_DAYS || '7', 10);
import {SubscriptionView} from '@/components/settings/SubscriptionView';
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

  // ── 7일 무료 체험 제안 로직 ──
  const {user} = useAuthStore();
  const {
    isTrialEligible,
    hasSeenTrialOffer,
    hasActiveSubscription,
    loading: subLoading,
    setHasSeenTrialOffer,
    setTrialEligible,
    fetchSubscription,
    applyRevenueCatPurchase,
  } = useSubscriptionStore();

  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showTrialPaywall, setShowTrialPaywall] = useState(false);
  const trialChecked = useRef(false);

  // 트라이얼 자격 확인 (1회)
  useEffect(() => {
    if (
      !user?.id ||
      subLoading ||
      hasActiveSubscription ||
      trialChecked.current
    ) {
      return;
    }

    trialChecked.current = true;

    // subscription_history에서 trial_started 이벤트 확인
    (async () => {
      try {
        const {data} = await supabase
          .from('subscription_history')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_type', 'trial_started')
          .limit(1)
          .maybeSingle();

        if (data) {
          setTrialEligible(false);
        } else {
          setTrialEligible(true);
        }
      } catch (err) {
        console.error('[Trial] eligibility check error:', err);
      }
    })();
  }, [user?.id, subLoading, hasActiveSubscription, setTrialEligible]);

  // 자격 확인 후 모달 표시
  useEffect(() => {
    if (
      isTrialEligible &&
      !hasSeenTrialOffer &&
      !hasActiveSubscription &&
      !subLoading &&
      trialChecked.current
    ) {
      const timer = setTimeout(() => setShowTrialModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isTrialEligible, hasSeenTrialOffer, hasActiveSubscription, subLoading]);

  const handleTrialClose = useCallback(() => {
    setShowTrialModal(false);
    setShowTrialPaywall(false);
    setHasSeenTrialOffer(true);
  }, [setHasSeenTrialOffer]);

  const handleTrialShowDetails = useCallback(() => {
    setShowTrialModal(false);
    setShowTrialPaywall(true);
  }, []);

  const handleTrialStart = useCallback(async (
    plan: 'monthly' | 'yearly' = 'yearly',
    reminderEnabled: boolean = false,
  ) => {
    // App Store가 Introductory Offer를 자동 처리
    // 선택된 플랜에 따라 패키지 결정
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = plan === 'yearly'
        ? (offerings.current?.annual ?? offerings.current?.monthly)
        : (offerings.current?.monthly ?? offerings.current?.annual);
      if (!pkg) return;

      const result = await purchaseSelectedPackage(pkg);
      if (result.success) {
        const active = result.customerInfo.entitlements.active;
        if (active && Object.keys(active).length > 0) {
          applyRevenueCatPurchase(active);
        }
        if (user?.id) {
          setTimeout(() => fetchSubscription(user.id), 5000);
        }

        // 알림 스케줄링
        if (reminderEnabled) {
          scheduleTrialExpiryReminder(TRIAL_DAYS);
        }
      }
    } catch (err) {
      console.error('[Trial] purchase error:', err);
    }

    handleTrialClose();
  }, [user?.id, applyRevenueCatPurchase, fetchSubscription, handleTrialClose]);

  return (
    <>
      <MainTabNavigator />
      <BedtimeModal
        visible={showBedtimeModal}
        onStartSleep={handleBedtimeStart}
        onSnooze={onSnooze}
        onSkipTonight={onSkipTonight}
      />
      <TrialOfferModal
        visible={showTrialModal}
        onClose={handleTrialClose}
        onStartTrial={handleTrialStart}
        onShowDetails={handleTrialShowDetails}
      />
      <Modal
        visible={showTrialPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleTrialClose}>
        <SafeAreaProvider>
          <SubscriptionView onBack={handleTrialClose} trialMode />
        </SafeAreaProvider>
      </Modal>
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

  // 인증 상태 변경 시 RevenueCat 로그인/로그아웃
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
