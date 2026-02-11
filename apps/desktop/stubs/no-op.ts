/**
 * No-op 스텁 - Electron 빌드에서 Capacitor 플러그인을 대체
 *
 * 모든 named export와 default export를 빈 프록시로 제공합니다.
 */
const noopProxy = new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true;
    if (prop === 'default') return noopProxy;
    // 함수 호출 시 빈 객체 반환
    return async (..._args: any[]) => ({});
  },
});

// Named exports that various Capacitor plugins commonly use
export const Preferences = {
  get: async (_opts: any) => ({ value: null }),
  set: async (_opts: any) => {},
  remove: async (_opts: any) => {},
  clear: async () => {},
  keys: async () => ({ keys: [] }),
};

export const App = {
  addListener: (_event: string, _cb: any) => ({ remove: async () => {} }),
  getInfo: async () => ({ name: '', id: '', build: '', version: '' }),
  getState: async () => ({ isActive: true }),
  exitApp: async () => {},
};

export const Browser = {
  open: async (_opts: any) => {},
  close: async () => {},
  addListener: (_event: string, _cb: any) => ({ remove: async () => {} }),
};

export const Keyboard = {
  addListener: (_event: string, _cb: any) => ({ remove: async () => {} }),
  show: async () => {},
  hide: async () => {},
};

export const LocalNotifications = {
  schedule: async (_opts: any) => ({ notifications: [] }),
  getPending: async () => ({ notifications: [] }),
  cancel: async (_opts: any) => {},
  addListener: (_event: string, _cb: any) => ({ remove: async () => {} }),
  checkPermissions: async () => ({ display: 'granted' }),
  requestPermissions: async () => ({ display: 'granted' }),
};

export const PushNotifications = {
  addListener: (_event: string, _cb: any) => ({ remove: async () => {} }),
  register: async () => {},
  checkPermissions: async () => ({ receive: 'granted' }),
  requestPermissions: async () => ({ receive: 'granted' }),
};

export const StatusBar = {
  setStyle: async (_opts: any) => {},
  setBackgroundColor: async (_opts: any) => {},
  show: async () => {},
  hide: async () => {},
};

export enum Style {
  Dark = 'DARK',
  Light = 'LIGHT',
  Default = 'DEFAULT',
}

export const SocialLogin = {
  initialize: async (_opts: any) => {},
  login: async (_opts: any) => ({ provider: 'google', result: {} }),
  logout: async (_opts: any) => {},
  isLoggedIn: async (_opts: any) => ({ isLoggedIn: false }),
};

export const Purchases = {
  configure: async (_opts: any) => {},
  getOfferings: async () => ({ all: {}, current: null }),
  purchasePackage: async (_opts: any) => ({}),
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  restorePurchases: async () => ({ entitlements: { active: {} } }),
};

export const LOG_LEVEL = {
  VERBOSE: 'VERBOSE',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

export const PurchasesOfferings = {};
export const CustomerInfo = {};

export default noopProxy;
