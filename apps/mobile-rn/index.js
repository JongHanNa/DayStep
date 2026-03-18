/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import notifee from '@notifee/react-native';
import { AppRegistry } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import App from './App';
import { name as appName } from './app.json';

// 백그라운드/종료 상태에서 알림 탭 처리 (AppRegistry 전에 등록 필수)
notifee.onBackgroundEvent(async ({type, detail}) => {
  // PRESS (type === 3): 알림 탭 시 sleep-bedtime이면 MMKV 플래그 저장
  if (type === 3 && detail.notification?.data?.type === 'sleep-bedtime') {
    const mmkv = createMMKV({id: 'daystep-rn'});
    mmkv.set('pending-sleep-bedtime-nav', 'true');
  }
});

AppRegistry.registerComponent(appName, () => App);
