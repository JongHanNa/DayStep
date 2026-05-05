const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Expo가 모노레포 루트를 unstable_serverRoot로 설정하는 것을 앱 디렉터리로 오버라이드
config.server.unstable_serverRoot = __dirname;

// Expo virtual entry URL 호환성: expo/virtual-metro-entry-bundle → index.bundle
const originalRewrite = config.server.rewriteRequestUrl;
config.server.rewriteRequestUrl = (url) => {
  // Monorepo fix: Expo virtual entry resolves entry relative to workspace root,
  // causing doubled paths. Bypass virtual entry and serve index.bundle directly.
  if (url.includes('.virtual-metro-entry')) {
    const params = url.includes('?') ? url.substring(url.indexOf('?')) : '';
    const rewritten = '/index.bundle' + params;
    return rewritten;
  }
  return originalRewrite ? originalRewrite(url) : url;
};

module.exports = withNativeWind(config, { input: './global.css' });
