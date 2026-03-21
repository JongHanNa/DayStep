/**
 * useResponsiveLayout
 * iPad/태블릿 반응형 레이아웃 훅
 * 브레이크포인트: phone(<768), tablet(≥768), tabletLandscape(≥1024)
 */
import {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';
import {breakpoints, responsiveLayout} from '@/theme/tokens';

export interface ResponsiveLayout {
  /** 태블릿 여부 (width ≥ 768) */
  isTablet: boolean;
  /** 가로 모드 여부 */
  isLandscape: boolean;
  /** 화면 좌우 패딩 */
  screenPadding: number;
  /** 콘텐츠 최대 너비 (태블릿에서 중앙 정렬용) */
  contentMaxWidth: number;
  /** 그리드 열 수 */
  columns: number;
  /** 타이머 링 크기 */
  ringSize: number;
  /** 탭바 좌우 inset */
  tabBarHorizontalInset: number;
  /** 섹션 간 간격 */
  sectionGap: number;
  /** 카드 내부 패딩 */
  cardPadding: number;
  /** peek 너비 (SwipeablePages용) */
  peekWidth: number;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const {width, height} = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;

    if (width >= breakpoints.tabletLandscape) {
      return {
        isTablet: true,
        isLandscape,
        ...responsiveLayout.tabletLandscape,
      };
    }

    if (width >= breakpoints.tablet) {
      return {
        isTablet: true,
        isLandscape,
        ...responsiveLayout.tablet,
      };
    }

    return {
      isTablet: false,
      isLandscape,
      ...responsiveLayout.phone,
    };
  }, [width, height]);
}
