/**
 * 일상투두 Typography System
 * iOS SF Pro 기반, ADHD 가독성 최적화
 */
import {Platform, TextStyle} from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

type FontWeight = TextStyle['fontWeight'];

// ============================================
// Type Scale (iOS HIG 기반)
// ============================================
export const typography = {
  /** 대제목 — 홈 인사말, 모드 타이틀 */
  largeTitle: {
    fontFamily,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as FontWeight,
    letterSpacing: 0.37,
  },
  /** 제목 1 — 섹션 헤더 */
  title1: {
    fontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as FontWeight,
    letterSpacing: 0.36,
  },
  /** 제목 2 — 카드 타이틀 */
  title2: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as FontWeight,
    letterSpacing: 0.35,
  },
  /** 제목 3 — 서브헤더 */
  title3: {
    fontFamily,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600' as FontWeight,
    letterSpacing: 0.38,
  },
  /** 헤드라인 — 강조 텍스트 */
  headline: {
    fontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as FontWeight,
    letterSpacing: -0.41,
  },
  /** 본문 — 기본 텍스트 */
  body: {
    fontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400' as FontWeight,
    letterSpacing: -0.41,
  },
  /** 콜아웃 — 부연 설명 */
  callout: {
    fontFamily,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400' as FontWeight,
    letterSpacing: -0.32,
  },
  /** 서브헤드라인 — 보조 정보 */
  subheadline: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as FontWeight,
    letterSpacing: -0.24,
  },
  /** 각주 — 작은 보조 텍스트 */
  footnote: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as FontWeight,
    letterSpacing: -0.08,
  },
  /** 캡션 1 — 태그, 라벨 */
  caption1: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as FontWeight,
    letterSpacing: 0,
  },
  /** 캡션 2 — 가장 작은 텍스트 */
  caption2: {
    fontFamily,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400' as FontWeight,
    letterSpacing: 0.07,
  },
} as const;
