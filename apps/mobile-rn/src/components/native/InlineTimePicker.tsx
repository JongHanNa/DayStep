/**
 * InlineTimePicker — 플랫폼 통합 인라인 휠 타임 피커
 * iOS: @react-native-community/datetimepicker display="spinner" (기존 그대로)
 * Android: NativeTimePicker (Kotlin Compose 커스텀 휠 피커)
 */
import React, {useCallback, useRef} from 'react';
import {
  Platform,
  UIManager,
  requireNativeComponent,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Android Native Component ───
interface NativeTimePickerNativeProps {
  hour: number;
  minute: number;
  heightDp: number;
  minuteInterval: number;
  onTimeChange: (e: {nativeEvent: {hour: number; minute: number}}) => void;
  style?: StyleProp<ViewStyle>;
}

const hasAndroidNative =
  Platform.OS === 'android' &&
  UIManager.getViewManagerConfig('NativeTimePicker') != null;

const AndroidNativeTimePicker = hasAndroidNative
  ? requireNativeComponent<NativeTimePickerNativeProps>('NativeTimePicker')
  : null;

// ─── Public API ───
interface InlineTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  height?: number;
  minuteInterval?: number;
  /** 'time': 시·분만 (Android 네이티브 휠 사용 가능) | 'datetime': 날짜+시·분 통합 휠 */
  mode?: 'time' | 'datetime';
  style?: StyleProp<ViewStyle>;
}

export function InlineTimePicker({
  value,
  onChange,
  height = 150,
  minuteInterval = 1,
  mode = 'time',
  style,
}: InlineTimePickerProps) {
  // Debounce to prevent rapid re-renders
  const lastEmitRef = useRef<string>('');

  const handleAndroidChange = useCallback(
    (e: {nativeEvent: {hour: number; minute: number}}) => {
      const {hour, minute} = e.nativeEvent;
      const key = `${hour}:${minute}`;
      if (key === lastEmitRef.current) return;
      lastEmitRef.current = key;

      const newDate = new Date(value);
      newDate.setHours(hour);
      newDate.setMinutes(minute);
      newDate.setSeconds(0);
      onChange(newDate);
    },
    [value, onChange],
  );

  const handleIOSChange = useCallback(
    (_event: any, selectedDate?: Date) => {
      if (selectedDate) {
        onChange(selectedDate);
      }
    },
    [onChange],
  );

  // ─── iOS: 기존 DateTimePicker 사용 (datetime 모드는 동일 컴포넌트, mode만 변경) ───
  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode={mode as any}
        display={'spinner' as const}
        locale="ko"
        minuteInterval={minuteInterval as any}
        onChange={handleIOSChange}
        style={[{height}, style]}
      />
    );
  }

  // ─── Android: time 모드는 네이티브 휠 피커, datetime 모드는 라이브러리 폴백 ───
  if (mode === 'time' && AndroidNativeTimePicker) {
    return (
      <View style={[{height, overflow: 'hidden'}, style]}>
        <AndroidNativeTimePicker
          hour={value.getHours()}
          minute={value.getMinutes()}
          heightDp={height}
          minuteInterval={minuteInterval}
          onTimeChange={handleAndroidChange}
          style={{height, width: '100%' as any}}
        />
      </View>
    );
  }

  // ─── Fallback: time/datetime 공통 — 라이브러리 기본 DateTimePicker ───
  return (
    <DateTimePicker
      value={value}
      mode={mode as any}
      display={'spinner' as const}
      locale="ko"
      minuteInterval={minuteInterval as any}
      onChange={handleIOSChange}
      style={[{height}, style]}
    />
  );
}
