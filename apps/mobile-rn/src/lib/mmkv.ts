/**
 * MMKV Storage Instance + Zustand Persist Adapter
 * AsyncStorage 대비 ~30x 빠른 동기식 KV 스토리지
 */
import {createMMKV} from 'react-native-mmkv';
import type {MMKV} from 'react-native-mmkv';
import type {StateStorage} from 'zustand/middleware';

// 기본 MMKV 인스턴스
export const storage: MMKV = createMMKV({id: 'daystep-rn'});

// Supabase 세션 전용 인스턴스 (보안 분리)
export const sessionStorage: MMKV = createMMKV({id: 'daystep-session'});

/**
 * Zustand persist용 MMKV 어댑터
 */
export const zustandMMKVStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.remove(name);
  },
};

/**
 * Supabase Auth용 MMKV 어댑터 (AsyncStorage 인터페이스 호환)
 */
export const supabaseMMKVStorage = {
  getItem: (key: string): string | null => {
    return sessionStorage.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    sessionStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    sessionStorage.remove(key);
  },
};
