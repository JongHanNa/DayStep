/**
 * NativeWind babel preset wrapper that filters out react-native-worklets/plugin.
 *
 * Reanimated 3.19+ bundles its own worklets runtime, so the standalone
 * react-native-worklets package is unnecessary and causes duplicate-symbol
 * linker errors if installed.  However react-native-css-interop (used by
 * NativeWind) hard-codes a require for 'react-native-worklets/plugin'.
 * This wrapper loads the preset normally and then strips that plugin out.
 */
function nativewindPresetWithoutWorklets() {
  const preset = require('react-native-css-interop/babel')();
  preset.plugins = (preset.plugins || []).filter((p) => {
    const name = typeof p === 'string' ? p : Array.isArray(p) ? p[0] : null;
    return name !== 'react-native-worklets/plugin';
  });
  return preset;
}

module.exports = {
  presets: [
    'babel-preset-expo',
    nativewindPresetWithoutWorklets,
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
        },
        extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.json'],
      },
    ],
    // Reanimated plugin must be listed LAST
    'react-native-reanimated/plugin',
  ],
};
