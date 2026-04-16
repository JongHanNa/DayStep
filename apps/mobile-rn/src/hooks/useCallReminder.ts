/**
 * useCallReminder
 * 통화 종료 후 "약속 잡으셨나요?" 알림을 보내는 훅
 * - iOS: CXCallObserver (CallKit) — 네이티브에서 직접 알림 발송
 * - Android: TelephonyCallback — READ_PHONE_STATE 런타임 권한 필요
 * - 설정에서 opt-in (기본 off)
 */
import {useEffect} from 'react';
import {NativeModules, Platform, PermissionsAndroid} from 'react-native';
import {useSettingsStore} from '@/stores/settingsStore';

async function requestPhoneStatePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title: '통화 상태 감지',
        message: '통화 종료 후 일정 등록 알림을 보내려면 전화 상태 접근 권한이 필요합니다.',
        buttonPositive: '허용',
        buttonNegative: '거부',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function useCallReminder() {
  const callReminderEnabled = useSettingsStore(s => s.callReminderEnabled);

  useEffect(() => {
    if (!callReminderEnabled) return;

    const setup = async () => {
      // Android: 권한 요청
      if (Platform.OS === 'android') {
        const granted = await requestPhoneStatePermission();
        if (!granted) return;
      }

      const mod = NativeModules.CallDetectorModule;
      if (!mod) return;

      try {
        await mod.startListening();
      } catch {
        // 모듈 초기화 실패 시 무시
      }
    };

    setup();

    return () => {
      const mod = NativeModules.CallDetectorModule;
      if (mod?.stopListening) {
        mod.stopListening().catch(() => {});
      }
    };
  }, [callReminderEnabled]);
}
