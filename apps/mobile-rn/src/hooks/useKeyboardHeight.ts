/**
 * useKeyboardHeight
 * 키보드 높이를 Reanimated SharedValue로 추적
 * iOS: keyboardWillShow/Hide, Android: keyboardDidShow/Hide
 */
import {useEffect} from 'react';
import {Keyboard, Platform} from 'react-native';
import {
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export function useKeyboardHeight(): SharedValue<number> {
  const height = useSharedValue(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      const duration =
        Platform.OS === 'ios' ? e.duration || 250 : 150;
      height.value = withTiming(e.endCoordinates.height, {
        duration,
      });
    });

    const hideSub = Keyboard.addListener(hideEvent, e => {
      const duration =
        Platform.OS === 'ios' ? (e as any).duration || 250 : 150;
      height.value = withTiming(0, {duration});
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [height]);

  return height;
}
