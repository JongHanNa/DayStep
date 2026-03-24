import './global.css';
import React, {useEffect} from 'react';
import {AppState, LogBox, StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider, initialWindowMetrics} from 'react-native-safe-area-context';
import {NavigationContainer, DefaultTheme, createNavigationContainerRef} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import notifee from '@notifee/react-native';
import {ThemeProvider} from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import {setupNotificationChannel} from './src/lib/notifications';
import {reloadWidgetTimelines} from './src/lib/widgetBridge';
import {useSleepStore} from './src/stores/sleepStore';
import {storage} from './src/lib/mmkv';

// UI Test 모드: LogBox 완전 비활성화 (스크린샷에 경고 배너 제거)
// uitest_mode (일회용, authStore 초기화 전) 또는 uitest_active (초기화 후)
if (storage.getBoolean('uitest_mode') || storage.getBoolean('uitest_active')) {
  LogBox.ignoreAllLogs(true);
}

const navigationRef = createNavigationContainerRef<any>();

const MMKV_PENDING_SLEEP_NAV = 'pending-sleep-bedtime-nav';

/** 알림 data에서 sleep-bedtime 타입인지 확인 후 SleepSession으로 네비게이션 */
function navigateToSleepSessionIfBedtime(data: Record<string, string> | undefined) {
  if (data?.type !== 'sleep-bedtime') return;
  // 네비게이션 준비가 안됐으면 MMKV 플래그로 지연
  if (!navigationRef.isReady()) {
    storage.set(MMKV_PENDING_SLEEP_NAV, 'true');
    return;
  }
  navigationRef.navigate('Main', {screen: 'Home', params: {screen: 'SleepSession'}});
}

const linking = {
  prefixes: ['daystep://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: {
            screens: {
              MonthlyPlanner: 'monthly',
              SleepSession: 'sleep-session',
            },
          },
        },
      },
    },
  },
};

function App() {
  useEffect(() => {
    setupNotificationChannel();
  }, []);

  // 앱 시작 시 수면 세션 복구 (강제 종료/권한 해제 감지)
  useEffect(() => {
    useSleepStore.getState().recoverSession();
  }, []);

  // 콜드 스타트: 알림 탭으로 앱 실행된 경우 처리
  useEffect(() => {
    notifee.getInitialNotification().then(initialNotification => {
      if (initialNotification) {
        navigateToSleepSessionIfBedtime(initialNotification.notification.data as any);
      }
    });
  }, []);

  // 포그라운드 이벤트 핸들러 등록 → 알림 탭 시 네비게이션 + iOS 배너+소리
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({type, detail}) => {
      // PRESS 이벤트: 알림 탭 시 처리
      if (type === 3 /* EventType.PRESS */) {
        navigateToSleepSessionIfBedtime(detail.notification?.data as any);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        reloadWidgetTimelines();
      }
    });
    return () => sub.remove();
  }, []);
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            onReady={() => {
              // 백그라운드 알림 탭으로 MMKV 플래그가 세팅된 경우 처리
              const pending = storage.getString(MMKV_PENDING_SLEEP_NAV);
              if (pending === 'true') {
                storage.remove(MMKV_PENDING_SLEEP_NAV);
                navigationRef.navigate('Main', {screen: 'Home', params: {screen: 'SleepSession'}});
              }
            }}
            theme={{
              dark: false,
              colors: {
                primary: '#3B82F6',
                background: '#FFF7ED',
                card: '#FFFFFF',
                text: '#1F2937',
                border: '#E5E7EB',
                notification: '#EF4444',
              },
              fonts: DefaultTheme.fonts,
            }}>
            <BottomSheetModalProvider>
              <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              />
              <RootNavigator />
            </BottomSheetModalProvider>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
