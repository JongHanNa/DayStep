import './global.css';
import React, {useEffect} from 'react';
import {AppState, StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider, initialWindowMetrics} from 'react-native-safe-area-context';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {ThemeProvider} from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import {setupNotificationChannel} from './src/lib/notifications';
import {reloadWidgetTimelines} from './src/lib/widgetBridge';

function App() {
  useEffect(() => {
    setupNotificationChannel();
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
      <BottomSheetModalProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <ThemeProvider>
            <NavigationContainer
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
              <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              />
              <RootNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

export default App;
