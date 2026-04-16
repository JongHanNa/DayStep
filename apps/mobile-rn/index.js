/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import notifee from '@notifee/react-native';
import { AppRegistry, LogBox } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import App from './App';
import { name as appName } from './app.json';

// 개발 환경: LogBox 배너 숨김 (터치 영역 차단 방지)
// - 치명적 오류 Red Screen (JS 크래시)은 별도 시스템이므로 계속 표시됨
// - 경고/오류는 Metro 콘솔에서 확인 가능
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

// 백그라운드/종료 상태에서 알림 탭 처리 (AppRegistry 전에 등록 필수)
notifee.onBackgroundEvent(async ({type, detail}) => {
  // PRESS (type === 3): 알림 탭 시 유형별 MMKV 플래그 저장
  if (type === 3) {
    const notifType = detail.notification?.data?.type;
    if (notifType === 'sleep-bedtime') {
      const mmkv = createMMKV({id: 'daystep-rn'});
      mmkv.set('pending-sleep-bedtime-nav', 'true');
    } else if (notifType === 'call-reminder') {
      const mmkv = createMMKV({id: 'daystep-rn'});
      mmkv.set('pending-call-reminder-nav', 'true');
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
