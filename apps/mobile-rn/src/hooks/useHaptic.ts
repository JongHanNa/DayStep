/**
 * Haptic Feedback Hook
 * 모든 인터랙션에 촉각 피드백 — ADHD "했다"는 즉각적 성취감
 */
import {useCallback} from 'react';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export function useHaptic() {
  const light = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight', options);
  }, []);

  const medium = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium', options);
  }, []);

  const heavy = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactHeavy', options);
  }, []);

  const selection = useCallback(() => {
    ReactNativeHapticFeedback.trigger('selection', options);
  }, []);

  const success = useCallback(() => {
    ReactNativeHapticFeedback.trigger('notificationSuccess', options);
  }, []);

  const warning = useCallback(() => {
    ReactNativeHapticFeedback.trigger('notificationWarning', options);
  }, []);

  const error = useCallback(() => {
    ReactNativeHapticFeedback.trigger('notificationError', options);
  }, []);

  const trigger = useCallback((type: HapticFeedbackTypes) => {
    ReactNativeHapticFeedback.trigger(type, options);
  }, []);

  return {light, medium, heavy, selection, success, warning, error, trigger};
}
