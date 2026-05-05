/**
 * Jest Setup — 네이티브 모듈 Mock
 */

// ============================================
// react-native-mmkv
// ============================================
jest.mock('react-native-mmkv', () => {
  const stores = new Map<string, Map<string, string>>();

  function createMMKV(config?: {id?: string}) {
    const id = config?.id ?? 'default';
    if (!stores.has(id)) {
      stores.set(id, new Map());
    }
    const store = stores.get(id)!;

    return {
      getString: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
      remove: (key: string) => store.delete(key),
      clearAll: () => store.clear(),
      getAllKeys: () => Array.from(store.keys()),
      contains: (key: string) => store.has(key),
    };
  }

  return {createMMKV};
});

// ============================================
// react-native-reanimated
// ============================================
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = require('react-native').View;
  const Pressable = require('react-native').Pressable;

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: any) => Component,
      View,
    },
    useSharedValue: (initialValue: any) => ({value: initialValue}),
    useAnimatedStyle: (fn: () => any) => fn(),
    withSpring: (value: any) => value,
    withTiming: (value: any) => value,
    withSequence: (...values: any[]) => values[values.length - 1],
    FadeInDown: {delay: () => ({duration: () => ({})})},
    Layout: {springify: () => ({})},
    Easing: {
      bezier: () => ({}),
      linear: {},
      ease: {},
    },
  };
});

// ============================================
// react-native-gesture-handler
// ============================================
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    ScrollView: require('react-native').ScrollView,
    FlatList: require('react-native').FlatList,
    gestureHandlerRootHOC: (component: any) => component,
  };
});

// ============================================
// @supabase/supabase-js
// ============================================
const mockSupabaseFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({data: null, error: null}),
  maybeSingle: jest.fn().mockResolvedValue({data: null, error: null}),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({data: {session: null}, error: null}),
      signInWithIdToken: jest.fn().mockResolvedValue({data: {user: null, session: null}, error: null}),
      signOut: jest.fn().mockResolvedValue({error: null}),
      refreshSession: jest.fn().mockResolvedValue({data: {session: null}, error: null}),
      onAuthStateChange: jest.fn(() => ({data: {subscription: {unsubscribe: jest.fn()}}})),
    },
  })),
}));

// ============================================
// react-native-config
// ============================================
jest.mock('react-native-config', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

// ============================================
// react-native-purchases (RevenueCat)
// ============================================
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  getOfferings: jest.fn().mockResolvedValue({current: null}),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn().mockResolvedValue({customerInfo: {entitlements: {active: {}}}}),
  getCustomerInfo: jest.fn().mockResolvedValue({entitlements: {active: {}}}),
  logIn: jest.fn(),
  logOut: jest.fn(),
}));

// ============================================
// react-native-haptic-feedback
// ============================================
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// ============================================
// @shopify/react-native-skia
// ============================================
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  Path: 'Path',
  Skia: {Path: {Make: jest.fn()}},
  useFont: jest.fn(),
}));

// ============================================
// @react-navigation/native
// ============================================
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  })),
  useFocusEffect: jest.fn((cb) => cb()),
  useRoute: jest.fn(() => ({params: {}})),
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  createNavigationContainerRef: jest.fn(),
}));

// ============================================
// @react-navigation/native-stack
// ============================================
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({children}: any) => children,
    Screen: ({children}: any) => children,
  })),
}));

// ============================================
// @gorhom/bottom-sheet
// ============================================
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: React.forwardRef(({children}: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        expand: jest.fn(),
        close: jest.fn(),
        snapToIndex: jest.fn(),
      }));
      return React.createElement(View, null, children);
    }),
    BottomSheetScrollView: View,
    BottomSheetView: View,
    BottomSheetTextInput: 'TextInput',
  };
});

// ============================================
// lucide-react-native
// ============================================
jest.mock('lucide-react-native', () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
          return (props: any) => null;
        }
        return undefined;
      },
    },
  );
});

// ============================================
// react-native-svg
// ============================================
jest.mock('react-native-svg', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Circle: 'Circle',
    Rect: 'Rect',
    Path: 'Path',
    G: 'G',
    Line: 'Line',
    Defs: 'Defs',
    LinearGradient: 'LinearGradient',
    Stop: 'Stop',
  };
});

// ============================================
// nativewind / react-native-css-interop
// ============================================
jest.mock('nativewind', () => ({
  styled: (component: any) => component,
  useColorScheme: jest.fn(() => ({colorScheme: 'light', setColorScheme: jest.fn()})),
}));

jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}));

// ============================================
// @notifee/react-native
// ============================================
jest.mock('@notifee/react-native', () => ({
  displayNotification: jest.fn(),
  createChannel: jest.fn(),
  cancelNotification: jest.fn(),
  cancelAllNotifications: jest.fn(),
  requestPermission: jest.fn().mockResolvedValue({authorizationStatus: 1}),
  getNotificationSettings: jest.fn().mockResolvedValue({authorizationStatus: 1}),
  AuthorizationStatus: {AUTHORIZED: 1, DENIED: 0},
  AndroidImportance: {HIGH: 4},
  EventType: {PRESS: 1},
}));

// ============================================
// lottie-react-native
// ============================================
jest.mock('lottie-react-native', () => 'LottieView');

// ============================================
// react-native-linear-gradient
// ============================================
jest.mock('react-native-linear-gradient', () => {
  const View = require('react-native').View;
  return {__esModule: true, default: View};
});

// ============================================
// react-native-safe-area-context
// ============================================
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: any) => children,
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: jest.fn(() => ({top: 0, right: 0, bottom: 0, left: 0})),
}));

// ============================================
// @shopify/flash-list
// ============================================
jest.mock('@shopify/flash-list', () => ({
  FlashList: require('react-native').FlatList,
}));

// ============================================
// @react-native-community/blur
// ============================================
jest.mock('@react-native-community/blur', () => ({
  BlurView: require('react-native').View,
}));

// ============================================
// @daystep/shared-core
// ============================================
jest.mock('@daystep/shared-core', () => ({
  checkActiveSubscription: jest.fn((status: string, endDate: string | null) => {
    if (status === 'active' || status === 'trialing') return true;
    return false;
  }),
  checkInTrial: jest.fn((status: string, trialEndDate: string | null) => {
    if (status !== 'trialing' || !trialEndDate) return false;
    return new Date(trialEndDate) > new Date();
  }),
  calculateDaysRemainingInTrial: jest.fn((trialEndDate: string | null) => {
    if (!trialEndDate) return null;
    const diff = new Date(trialEndDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }),
}));

// ============================================
// widgetBridge
// ============================================
jest.mock('@/lib/widgetBridge', () => ({
  syncWidgetData: jest.fn().mockResolvedValue(undefined),
}));

// ============================================
// @react-native-google-signin/google-signin
// ============================================
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
  },
}));

// ============================================
// @invertase/react-native-apple-authentication
// ============================================
jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    performRequest: jest.fn(),
    Operation: {LOGIN: 1},
    Scope: {EMAIL: 0, FULL_NAME: 1},
  },
}));

// ============================================
// moti
// ============================================
jest.mock('moti', () => ({
  MotiView: require('react-native').View,
  AnimatePresence: ({children}: any) => children,
}));

// Silence React warnings in tests
const originalError = console.error;
const originalWarn = console.warn;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
  originalError.call(console, ...args);
};
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('componentWillReceiveProps')) return;
  originalWarn.call(console, ...args);
};
