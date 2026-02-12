import './global.css';
import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {ThemeProvider} from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <NavigationContainer>
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
