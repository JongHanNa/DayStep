/**
 * useExternalInput
 * 외부 입력 통합 훅 — Share Extension, Siri, Google Assistant, Deep Link, Call Reminder
 * 앱이 활성화될 때 pending 데이터를 확인하고 TodoCreatePanel을 prefill 데이터와 함께 오픈
 */
import {useEffect, useRef, useCallback} from 'react';
import {AppState, Linking, NativeModules, Platform} from 'react-native';
import {parseKoreanAppointment, appointmentToFormData} from '@/lib/koreanNLP';
import {useUIStore} from '@/stores/uiStore';
import {storage} from '@/lib/mmkv';

const MMKV_CALL_REMINDER_NAV = 'pending-call-reminder-nav';

/** 네이티브 모듈에서 pending text 읽기 (플랫폼별) */
async function getNativeSharedText(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const mod = NativeModules.DayStepShareModule;
      if (mod?.getPendingSharedText) {
        return await mod.getPendingSharedText();
      }
    } else {
      const mod = NativeModules.ShareIntentModule;
      if (mod?.getPendingSharedText) {
        return await mod.getPendingSharedText();
      }
    }
  } catch {
    // 네이티브 모듈 미설치 시 무시
  }
  return null;
}

/** 네이티브 모듈에서 Siri pending text 읽기 (iOS only) */
async function getSiriPendingText(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const mod = NativeModules.DayStepShareModule;
    if (mod?.getSiriPendingText) {
      return await mod.getSiriPendingText();
    }
  } catch {
    // 무시
  }
  return null;
}

/** 텍스트를 파싱하고 uiStore에 prefill 설정 */
function processExternalText(text: string) {
  if (!text.trim()) return;
  const parsed = parseKoreanAppointment(text);
  const formData = appointmentToFormData(parsed);
  useUIStore.getState().openTodoCreateWithPrefill(formData);
}

/** Deep link URL에서 텍스트 추출 */
function extractTextFromUrl(url: string): string | null {
  try {
    // daystep://share?text=... 또는 daystep://add-todo?text=...
    if (url.includes('share') || url.includes('add-todo')) {
      const match = url.match(/[?&]text=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
  } catch {
    // URL 파싱 실패 무시
  }
  return null;
}

export function useExternalInput() {
  const checkedRef = useRef(false);

  const checkPendingInputs = useCallback(async () => {
    // 1. 네이티브 공유 텍스트 확인 (Share Extension / Share Intent)
    const sharedText = await getNativeSharedText();
    if (sharedText) {
      processExternalText(sharedText);
      return; // 하나만 처리
    }

    // 2. Siri pending text 확인 (iOS)
    const siriText = await getSiriPendingText();
    if (siriText) {
      processExternalText(siriText);
      return;
    }

    // 3. Call reminder flag 확인 (MMKV — 백그라운드 알림 탭)
    if (storage.getBoolean(MMKV_CALL_REMINDER_NAV)) {
      storage.remove(MMKV_CALL_REMINDER_NAV);
      useUIStore.getState().openTodoCreateWithPrefill({});
      return;
    }

    // 4. Call reminder flag 확인 (네이티브 UserDefaults — iOS에서 직접 설정)
    try {
      const mod = NativeModules.CallDetectorModule;
      if (mod?.getPendingCallEnded) {
        const pending = await mod.getPendingCallEnded();
        if (pending) {
          useUIStore.getState().openTodoCreateWithPrefill({});
          return;
        }
      }
    } catch {
      // 무시
    }
  }, []);

  // 앱 활성화 시 확인
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        checkPendingInputs();
      }
    });

    // 최초 마운트 시에도 확인 (cold start에서 share로 열린 경우)
    if (!checkedRef.current) {
      checkedRef.current = true;
      checkPendingInputs();
    }

    return () => subscription.remove();
  }, [checkPendingInputs]);

  // Deep link 이벤트 리스닝
  useEffect(() => {
    const handleUrl = ({url}: {url: string}) => {
      const text = extractTextFromUrl(url);
      if (text) {
        processExternalText(text);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    // 앱이 deep link로 cold start된 경우
    Linking.getInitialURL().then(url => {
      if (url) {
        const text = extractTextFromUrl(url);
        if (text) {
          processExternalText(text);
        }
      }
    });

    return () => subscription.remove();
  }, []);
}
