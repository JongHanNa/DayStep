/**
 * SwipeablePages
 * react-native-reanimated-carousel 기반 — Carousel Peek 효과
 * 양옆 페이지가 살짝 보이는 parallax carousel
 */
import React, {useState, useCallback, useRef} from 'react';
import {View, StyleSheet, Dimensions, LayoutChangeEvent} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
import {useTheme} from '@/theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const DOTS_HEIGHT = 30;

interface SwipeablePagesProps {
  children: React.ReactNode;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  showDots?: boolean;
}

export function SwipeablePages({
  children,
  initialPage = 0,
  onPageChange,
  showDots = true,
}: SwipeablePagesProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [containerHeight, setContainerHeight] = useState(0);
  const carouselRef = useRef<ICarouselInstance>(null);
  const {primaryColor} = useTheme();

  const pages = React.Children.toArray(children);
  const pageCount = pages.length;

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  }, []);

  const handleSnapToItem = useCallback(
    (index: number) => {
      setCurrentPage(index);
      onPageChange?.(index);
    },
    [onPageChange],
  );

  const carouselHeight =
    containerHeight > 0
      ? containerHeight - (showDots && pageCount > 1 ? DOTS_HEIGHT : 0)
      : 300; // fallback

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {containerHeight > 0 && (
        <Carousel
          ref={carouselRef}
          data={pages}
          width={SCREEN_WIDTH}
          height={carouselHeight}
          defaultIndex={initialPage}
          loop={false}
          pagingEnabled={true}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.92,
            parallaxScrollingOffset: 60,
            parallaxAdjacentItemScale: 0.75,
          }}
          style={{overflow: 'visible'}}
          onSnapToItem={handleSnapToItem}
          renderItem={({item, index}) => (
            <View
              key={index}
              style={[styles.page, {height: carouselHeight}]}>
              {item as React.ReactNode}
            </View>
          )}
        />
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
}

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
    overflow: 'visible',
  },
  page: {
    flex: 1,
    overflow: 'hidden',
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
