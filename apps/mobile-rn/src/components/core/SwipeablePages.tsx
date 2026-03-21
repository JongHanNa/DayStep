/**
 * SwipeablePages
 * RN ScrollView (horizontal + snapToInterval) 기반
 * — 옆 페이지 peek 노출 + DnD 제스처 충돌 없음
 */
import React, {useState, useCallback, useRef, useImperativeHandle, forwardRef, useMemo} from 'react';
import {View, ScrollView, StyleSheet, useWindowDimensions, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useTheme} from '@/theme';
import {useResponsiveLayout} from '@/hooks/useResponsiveLayout';

/** @deprecated 외부 참조용 — 런타임에서는 useResponsiveLayout().peekWidth 사용 */
export const PEEK_WIDTH = 40;
/** @deprecated 외부 참조용 — 런타임에서는 동적 계산 사용 */
export const PAGE_WIDTH = 0; // DndContext에서 import하므로 유지, 실제 값은 동적

/** 비균일 snap offsets: 페이지 0은 0, 페이지 i≥1은 i*pageWidth - peekWidth */
function computeSnapOffsets(pageCount: number, pageWidth: number, peekWidth: number): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    offsets.push(i === 0 ? 0 : i * pageWidth - peekWidth);
  }
  return offsets;
}
const DOTS_HEIGHT = 30;

export interface SwipeablePagesRef {
  scrollTo: (index: number) => void;
  scrollByPixels: (dx: number) => void;
  snapToNearestPage: () => void;
  getScrollPosition: () => number;
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
  const scrollRef = useRef<ScrollView>(null);
  const {primaryColor} = useTheme();
  const {width: screenWidth} = useWindowDimensions();
  const {peekWidth} = useResponsiveLayout();

  const pageWidth = screenWidth - peekWidth;
  const pages = React.Children.toArray(children);
  const pageCount = pages.length;
  const snapOffsets = useMemo(() => computeSnapOffsets(pageCount, pageWidth, peekWidth), [pageCount, pageWidth, peekWidth]);

  const scrollPositionRef = useRef(snapOffsets[initialPage] ?? 0);

  useImperativeHandle(ref, () => ({
    scrollTo: (index: number) => {
      const x = snapOffsets[index] ?? 0;
      scrollRef.current?.scrollTo({x, animated: true});
      setCurrentPage(index);
      onPageChange?.(index);
    },
    scrollByPixels: (dx: number) => {
      const maxScroll = snapOffsets[pageCount - 1] ?? 0;
      const newX = Math.max(0, Math.min(maxScroll, scrollPositionRef.current + dx));
      scrollPositionRef.current = newX;
      scrollRef.current?.scrollTo({x: newX, animated: false});
    },
    snapToNearestPage: () => {
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < snapOffsets.length; i++) {
        const dist = Math.abs(scrollPositionRef.current - snapOffsets[i]);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      scrollRef.current?.scrollTo({x: snapOffsets[closest], animated: true});
      if (closest !== currentPage) {
        setCurrentPage(closest);
        onPageChange?.(closest);
      }
    },
    getScrollPosition: () => scrollPositionRef.current,
    currentPage,
  }));

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollPositionRef.current = e.nativeEvent.contentOffset.x;
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      // 가장 가까운 snap offset으로 페이지 인덱스 계산
      let page = 0;
      let minDist = Infinity;
      for (let i = 0; i < snapOffsets.length; i++) {
        const dist = Math.abs(offsetX - snapOffsets[i]);
        if (dist < minDist) {
          minDist = dist;
          page = i;
        }
      }
      if (page !== currentPage) {
        setCurrentPage(page);
        onPageChange?.(page);
      }
    },
    [onPageChange, currentPage, snapOffsets],
  );

  const scrollViewHeight =
    containerHeight > 0
      ? containerHeight - (showDots && pageCount > 1 ? DOTS_HEIGHT : 0)
      : 300; // fallback

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {containerHeight > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled={false}
          snapToOffsets={isDragging ? undefined : snapOffsets}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!isDragging}
          contentOffset={{x: snapOffsets[initialPage] ?? 0, y: 0}}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={{paddingRight: peekWidth}}
          style={{height: scrollViewHeight}}>
          {pages.map((page, index) => (
            <View key={index} style={[styles.page, {width: pageWidth}]}>
              {page as React.ReactNode}
            </View>
          ))}
        </ScrollView>
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
