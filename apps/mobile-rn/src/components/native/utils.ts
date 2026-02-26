/**
 * Native 컴포넌트 공통 유틸리티
 * 모듈 레벨에서 1회 계산 (조건부 requireNativeComponent 호출 방지)
 */
import {Platform} from 'react-native';

/** iOS 26+ 여부 — Liquid Glass 네이티브 브릿징 활성화 조건 */
export const isIOS26Plus =
  Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) >= 26;
