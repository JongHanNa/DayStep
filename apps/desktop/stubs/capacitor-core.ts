/**
 * Capacitor Core 스텁 - Electron 빌드에서 @capacitor/core를 대체
 */

const noopPlugin: any = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === 'then') return undefined; // Promise처럼 동작하지 않도록
      // 어떤 프로퍼티든 함수를 반환하고, 그 함수는 빈 객체를 resolve하는 Promise 반환
      return (..._args: any[]) => Promise.resolve({});
    },
  }
);

export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
  isPluginAvailable: () => false,
  convertFileSrc: (filePath: string) => filePath,
  registerPlugin: (_name: string, _config?: any) => noopPlugin,
};

export function registerPlugin(_name: string, _config?: any): any {
  // config에 web 팩토리가 있으면 호출
  if (_config?.web) {
    try {
      const result = _config.web();
      if (result && typeof result.then === 'function') {
        // Promise를 반환하는 경우 동기적으로 noopPlugin 반환
        return noopPlugin;
      }
      return result || noopPlugin;
    } catch {
      return noopPlugin;
    }
  }
  return noopPlugin;
}

export class WebPlugin {
  // no-op base class
}
