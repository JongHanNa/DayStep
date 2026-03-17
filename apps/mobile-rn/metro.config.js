const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Expo가 모노레포 루트를 unstable_serverRoot로 설정하는 것을 앱 디렉터리로 오버라이드
config.server.unstable_serverRoot = __dirname;

module.exports = withNativeWind(config, { input: './global.css' });
