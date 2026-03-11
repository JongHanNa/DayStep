module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        configFile: false,
        presets: ['module:@react-native/babel-preset'],
        plugins: [
          [
            'module-resolver',
            {
              root: ['./src'],
              alias: {'@': './src'},
              extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.json'],
            },
          ],
          // reanimated plugin excluded in test — mocked in jest.setup.ts
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native|' +
      '@react-native|' +
      'react-native-reanimated|' +
      'react-native-gesture-handler|' +
      'react-native-mmkv|' +
      'react-native-config|' +
      'react-native-haptic-feedback|' +
      'react-native-safe-area-context|' +
      'react-native-screens|' +
      'react-native-svg|' +
      'react-native-css-interop|' +
      'react-native-purchases|' +
      'react-native-linear-gradient|' +
      'react-native-nitro-modules|' +
      'react-native-url-polyfill|' +
      'nativewind|' +
      'moti|' +
      '@react-navigation|' +
      '@bottom-tabs|' +
      '@gorhom/bottom-sheet|' +
      '@shopify/react-native-skia|' +
      '@shopify/flash-list|' +
      '@supabase/supabase-js|' +
      '@supabase|' +
      '@invertase|' +
      '@react-native-google-signin|' +
      '@react-native-async-storage|' +
      '@react-native-clipboard|' +
      '@react-native-community|' +
      '@notifee|' +
      'lucide-react-native|' +
      'lottie-react-native|' +
      'date-fns|' +
      '@daystep' +
    ')/)',
  ],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
    '!src/theme/tokens.ts',
    '!src/theme/colors.ts',
    '!src/theme/typography.ts',
    '!src/theme/animations.ts',
    '!src/**/__tests__/**',
  ],
};
