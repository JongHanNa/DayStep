/**
 * Test Utilities — 공통 렌더링 헬퍼 + Mock 팩토리
 */
import React from 'react';
import {render, RenderOptions} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';

/**
 * Provider 래핑 렌더러
 */
function AllProviders({children}: {children: React.ReactNode}) {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {wrapper: AllProviders, ...options});
}

export {render} from '@testing-library/react-native';
