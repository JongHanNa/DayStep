/**
 * 유틸리티 함수들
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 환경별 동적 사이트 URL 가져오기
 */
// 환경 감지 결과를 캐시하여 성능 향상
let cachedEnvironment: 'electron' | 'browser' | null = null;

function detectEnvironment(): 'electron' | 'browser' {
  if (cachedEnvironment) {
    return cachedEnvironment;
  }

  // Electron 감지 (electronAPI 객체 확인)
  if ((window as any).electronAPI) {
    cachedEnvironment = 'electron';
    return 'electron';
  }

  cachedEnvironment = 'browser';
  return 'browser';
}

export function getDynamicSiteURL(): string {
  // 서버 사이드: 기본 URL 사용
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }

  // 클라이언트 사이드

  // 브라우저 환경 (기본값)
  return process.env.NEXT_PUBLIC_SITE_URL_BROWSER || 'http://localhost:3000';
}

/**
 * Nextbase 패턴: 안전한 사이트 URL 생성
 * OAuth 콜백에서 next 파라미터를 처리할 때 사용
 * 환경별 자동 URL 적용
 */
export function toSiteURL(path: string): string {
  const siteUrl = getDynamicSiteURL();
  console.log('🎯 [URL 생성] 환경별 사이트 URL:', siteUrl);
  return `${siteUrl}${path}`;
}

/**
 * Electron 환경인지 확인하는 유틸리티 함수
 */
export function isElectronEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return detectEnvironment() === 'electron';
}

/**
 * 클라이언트/서버에서 안전하게 베이스 URL 가져오기
 */
export function getBaseURL(): string {
  // 서버 사이드
  if (typeof window === 'undefined') {
    return getDynamicSiteURL();
  }
  
  // 클라이언트 사이드: 현재 origin 우선, 폴백으로 동적 URL
  try {
    return window.location.origin;
  } catch (error) {
    return getDynamicSiteURL();
  }
}