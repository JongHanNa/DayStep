/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import notifee from '@notifee/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// 백그라운드/종료 상태에서 알림 탭 처리 (AppRegistry 전에 등록 필수)
notifee.onBackgroundEvent(async ({type, detail}) => {
  // 탭 시 앱이 자동으로 포그라운드로 전환됨
});

AppRegistry.registerComponent(appName, () => App);
