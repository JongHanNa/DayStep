/**
 * SwipeablePages
 * react-native-pager-view 기반 — 네이티브 UIPageViewController/ViewPager2
 * RNGH 제스처 인식기 없음 → DnD 제스처 충돌 0
 */
import React, {useState, useCallback, useRef, useImperativeHandle, forwardRef} from 'react';
import {View, StyleSheet, LayoutChangeEvent} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import {useTheme} from '@/theme';

const DOTS_HEIGHT = 30;

export interface SwipeablePagesRef {
  scrollTo: (index: number) => void;
  currentPage: number;
}

interface SwipeablePagesProps {
  children: React.ReactNode;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  showDots?: boolean;
  /** 드래그 중일 때 스와이프 비활성화 */
  isDragging?: boolean;
}

export const SwipeablePages = forwardRef<SwipeablePagesRef, SwipeablePagesProps>(
  function SwipeablePages({
    children,
    initialPage = 0,
    onPageChange,
    showDots = true,
    isDragging = false,
  }, ref) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [containerHeight, setContainerHeight] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const {primaryColor} = useTheme();

  useImperativeHandle(ref, () => ({
    scrollTo: (index: number) => {
      pagerRef.current?.setPage(index);
    },
    currentPage,
  }));

  const pages = React.Children.toArray(children);
  const pageCount = pages.length;

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  }, []);

  const handlePageSelected = useCallback(
    (e: {nativeEvent: {position: number}}) => {
      const index = e.nativeEvent.position;
      setCurrentPage(index);
      onPageChange?.(index);
    },
    [onPageChange],
  );

  const pagerHeight =
    containerHeight > 0
      ? containerHeight - (showDots && pageCount > 1 ? DOTS_HEIGHT : 0)
      : 300; // fallback

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {containerHeight > 0 && (
        <PagerView
          ref={pagerRef}
          style={{height: pagerHeight}}
          initialPage={initialPage}
          scrollEnabled={!isDragging}
          onPageSelected={handlePageSelected}>
          {pages.map((page, index) => (
            <View key={index} style={styles.page}>
              {page as React.ReactNode}
            </View>
          ))}
        </PagerView>
      )}

      {showDots && pageCount > 1 && (
        <View style={styles.dotsContainer}>
          {pages.map((_, index) => (
            <Dot
              key={index}
              active={currentPage === index}
              color={primaryColor}
            />
          ))}
        </View>
      )}
    </View>
  );
});

function Dot({active, color}: {active: boolean; color: string}) {
  const scale = useSharedValue(active ? 1 : 0.8);
  const opacity = useSharedValue(active ? 1 : 0.3);

  React.useEffect(() => {
    scale.value = withSpring(active ? 1 : 0.8, {damping: 15});
    opacity.value = withSpring(active ? 1 : 0.3, {damping: 15});
  }, [active, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {backgroundColor: color},
        active && styles.dotActive,
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: DOTS_HEIGHT,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
