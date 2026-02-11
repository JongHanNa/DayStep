module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    'nativewind/babel',
  ],
  plugins: [
    // Reanimated plugin must be listed LAST
    'react-native-reanimated/plugin',
  ],
};
