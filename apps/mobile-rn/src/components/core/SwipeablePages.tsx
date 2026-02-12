/**
 * SwipeablePages
 * Animated.ScrollView + snapToInterval — Carousel Peek 효과
 * 양옆 페이지가 살짝 보이는 carousel 스타일
 */
import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useTheme} from '@/theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const PEEK_WIDTH = 24;
const PAGE_GAP = 12;
const PAGE_WIDTH = SCREEN_WIDTH - PEEK_WIDTH * 2 - PAGE_GAP;
const SNAP_INTERVAL = PAGE_WIDTH + PAGE_GAP;

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
  const scrollRef = useRef<Animated.ScrollView>(null);
  const {primaryColor} = useTheme();

  const pages = React.Children.toArray(children);
  const pageCount = pages.length;

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / SNAP_INTERVAL);
      const clampedPage = Math.max(0, Math.min(page, pageCount - 1));
      if (clampedPage !== currentPage) {
        setCurrentPage(clampedPage);
        onPageChange?.(clampedPage);
      }
    },
    [currentPage, onPageChange, pageCount],
  );

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
        contentOffset={{x: initialPage * SNAP_INTERVAL, y: 0}}
        onMomentumScrollEnd={handleMomentumScrollEnd}>
        {pages.map((page, index) => (
          <View key={index} style={styles.page}>
            {page}
          </View>
        ))}
      </Animated.ScrollView>

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
  },
  scrollContent: {
    paddingHorizontal: PEEK_WIDTH,
  },
  page: {
    width: PAGE_WIDTH,
    marginHorizontal: PAGE_GAP / 2,
    flex: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
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
