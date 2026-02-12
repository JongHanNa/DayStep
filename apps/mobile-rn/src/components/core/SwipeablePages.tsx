/**
 * SwipeablePages
 * RN ScrollView (horizontal + snapToInterval) 기반
 * — 옆 페이지 peek 노출 + DnD 제스처 충돌 없음
 */
import React, {useState, useCallback, useRef, useImperativeHandle, forwardRef} from 'react';
import {View, ScrollView, StyleSheet, Dimensions, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useTheme} from '@/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PEEK_WIDTH = 40;
export const PAGE_WIDTH = SCREEN_WIDTH - PEEK_WIDTH;
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
  const scrollPositionRef = useRef(initialPage * PAGE_WIDTH);
  const {primaryColor} = useTheme();

  useImperativeHandle(ref, () => ({
    scrollTo: (index: number) => {
      scrollRef.current?.scrollTo({x: index * PAGE_WIDTH, animated: true});
      setCurrentPage(index);
      onPageChange?.(index);
    },
    scrollByPixels: (dx: number) => {
      const maxScroll = (pageCount - 1) * PAGE_WIDTH;
      const newX = Math.max(0, Math.min(maxScroll, scrollPositionRef.current + dx));
      scrollPositionRef.current = newX;
      scrollRef.current?.scrollTo({x: newX, animated: false});
    },
    snapToNearestPage: () => {
      const page = Math.round(scrollPositionRef.current / PAGE_WIDTH);
      const clampedPage = Math.max(0, Math.min(pageCount - 1, page));
      scrollRef.current?.scrollTo({x: clampedPage * PAGE_WIDTH, animated: true});
      if (clampedPage !== currentPage) {
        setCurrentPage(clampedPage);
        onPageChange?.(clampedPage);
      }
    },
    getScrollPosition: () => scrollPositionRef.current,
    currentPage,
  }));

  const pages = React.Children.toArray(children);
  const pageCount = pages.length;

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollPositionRef.current = e.nativeEvent.contentOffset.x;
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / PAGE_WIDTH);
      // 중복 방지 가드
      if (page !== currentPage) {
        setCurrentPage(page);
        onPageChange?.(page);
      }
    },
    [onPageChange, currentPage],
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
          snapToInterval={isDragging ? undefined : PAGE_WIDTH}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!isDragging}
          contentOffset={{x: initialPage * PAGE_WIDTH, y: 0}}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={{paddingRight: PEEK_WIDTH}}
          style={{height: scrollViewHeight}}>
          {pages.map((page, index) => (
            <View key={index} style={[styles.page, {width: PAGE_WIDTH}]}>
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
