import './global.css';
import React, {useEffect} from 'react';
import {AppState, StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider, initialWindowMetrics} from 'react-native-safe-area-context';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import notifee from '@notifee/react-native';
import {ThemeProvider} from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import {setupNotificationChannel} from './src/lib/notifications';
import {reloadWidgetTimelines} from './src/lib/widgetBridge';
import {useSleepStore} from './src/stores/sleepStore';

const linking = {
  prefixes: ['daystep://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: {
            screens: {
              MonthlyPlanner: 'monthly',
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

  // 포그라운드 이벤트 핸들러 등록 → iOS UNUserNotificationCenterDelegate가 배너+소리 표시
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({type, detail}) => {
      // 포그라운드 알림 이벤트 수신 시 iOS가 자동으로 배너+소리 표시
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
            linking={linking}
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
