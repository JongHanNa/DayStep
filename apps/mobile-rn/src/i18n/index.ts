/**
 * i18n 초기화 — 기기 로케일 자동 감지 + MMKV 저장 사용자 설정 우선
 *
 * 사용:
 *   import {useTranslation} from 'react-i18next';
 *   const {t} = useTranslation();
 *   <Text>{t('settings.title')}</Text>
 *
 * 언어 변경:
 *   import {changeLanguage} from '@/i18n';
 *   changeLanguage('en'); // 또는 'ko' | 'ja' | null(시스템 기본)
 */
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {getLocales} from 'react-native-localize';
import {storage} from '@/lib/mmkv';

import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANG_STORAGE_KEY = 'app.language';
const FALLBACK_LANG: SupportedLanguage = 'en';

/**
 * 기기 선호 언어 목록에서 지원 언어 중 첫 매칭 반환
 */
function detectDeviceLanguage(): SupportedLanguage {
  const deviceLocales = getLocales();
  for (const locale of deviceLocales) {
    const code = locale.languageCode as SupportedLanguage;
    if (SUPPORTED_LANGUAGES.includes(code)) {
      return code;
    }
  }
  return FALLBACK_LANG;
}

/**
 * MMKV 저장된 사용자 설정 언어 (null=시스템 기본 사용)
 */
function getStoredLanguage(): SupportedLanguage | null {
  const stored = storage.getString(LANG_STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
    return stored as SupportedLanguage;
  }
  return null;
}

/**
 * 사용자가 설정한 언어 (null이면 시스템 기본 감지 결과 사용)
 */
export function resolveInitialLanguage(): SupportedLanguage {
  return getStoredLanguage() ?? detectDeviceLanguage();
}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    ko: {translation: ko},
    en: {translation: en},
    ja: {translation: ja},
  },
  lng: resolveInitialLanguage(),
  fallbackLng: FALLBACK_LANG,
  interpolation: {escapeValue: false},
  returnNull: false,
});

/**
 * 언어 변경 + MMKV 저장
 * @param lang 'ko' | 'en' | 'ja' | null (null이면 시스템 기본 재감지)
 */
export function changeLanguage(lang: SupportedLanguage | null): void {
  if (lang === null) {
    storage.remove(LANG_STORAGE_KEY);
    i18n.changeLanguage(detectDeviceLanguage());
  } else {
    storage.set(LANG_STORAGE_KEY, lang);
    i18n.changeLanguage(lang);
  }
}

/**
 * 현재 사용자 선택 상태 (null = 시스템 기본 따름)
 */
export function getLanguageSetting(): SupportedLanguage | null {
  return getStoredLanguage();
}

export default i18n;
