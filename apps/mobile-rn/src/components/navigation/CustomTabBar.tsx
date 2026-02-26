/**
 * Custom Bottom Tab Bar
 * 5탭: 홈 / 플래너 / 실행 / 노트 / 설정
 * Liquid Glass 플로팅 탭바 — 아이콘만 표시, 화이트 글래스
 *
 * iOS 26+: 네이티브 SwiftUI .glassEffect(in: .capsule) 탭바
 * iOS 25-: JS GlassBackground 폴백
 */
import React from 'react';
import {View, StyleSheet, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {AnimatedPressable} from '@/components/core';
import {GlassBackground} from '@/components/core';
import {useTheme} from '@/theme';
import {Home, Calendar, Zap, Flame, Settings} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';
import {
  LiquidGlassTabBarNative,
  isIOS26Plus,
  type NativeTabData,
} from '@/components/native';

const TAB_CONFIG: Record<string, {Icon: LucideIcon}> = {
  Home: {Icon: Home},
  Planner: {Icon: Calendar},
  Execute: {Icon: Zap},
  Notes: {Icon: Flame},
  Settings: {Icon: Settings},
};

// iOS 26 네이티브 탭바용 SF Symbol 매핑
const SF_SYMBOL_MAP: Record<string, string> = {
  Home: 'house',
  Planner: 'calendar',
  Execute: 'bolt',
  Notes: 'flame',
  Settings: 'gearshape',
};

export function CustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor} = useTheme();

  // 포커스된 화면이 탭 바 숨김을 요청하면 렌더링하지 않음
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;
  const tabBarStyle = focusedOptions.tabBarStyle as ViewStyle | undefined;
  if (tabBarStyle?.display === 'none') {
    return null;
  }

  // iOS 26+: 네이티브 Liquid Glass 탭바
  if (isIOS26Plus) {
    const nativeTabs: NativeTabData[] = state.routes.map(route => ({
      name: route.name,
      sfSymbol: SF_SYMBOL_MAP[route.name] ?? 'circle',
    }));

    const handleNativeTabPress = (event: {nativeEvent: {index: number}}) => {
      const index = event.nativeEvent.index;
      const route = state.routes[index];
      const isFocused = state.index === index;

      const navEvent = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !navEvent.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <LiquidGlassTabBarNative
        tabs={nativeTabs}
        selectedIndex={state.index}
        primaryColor={primaryColor}
        onTabPress={handleNativeTabPress}
        style={[
          styles.container,
          styles.nativeContainer,
          {bottom: Math.max(insets.bottom, 8)},
        ]}
      />
    );
  }

  // iOS 25 이하: JS GlassBackground 폴백
  return (
    <GlassBackground
      blurType="chromeMaterialLight"
      blurAmount={32}
      overlayColor="rgba(255, 255, 255, 0.55)"
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 8),
          borderRadius: 32,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.4)',
        },
      ]}>
      {/* 상단 하이라이트 — 빛 반사 효과 */}
      <View style={styles.topHighlight} />
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tabInfo = TAB_CONFIG[route.name] ?? {Icon: Home};

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              Icon={tabInfo.Icon}
              isFocused={isFocused}
              primaryColor={primaryColor}
              onPress={onPress}
            />
          );
        })}
      </View>
    </GlassBackground>
  );
}

function TabButton({
  Icon,
  isFocused,
  primaryColor,
  onPress,
}: {
  Icon: LucideIcon;
  isFocused: boolean;
  primaryColor: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      hapticType="selection"
      scaleValue={0.9}
      style={styles.tabButton}>
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Icon
          size={22}
          color={isFocused ? primaryColor : '#9CA3AF'}
          strokeWidth={isFocused ? 2.2 : 1.8}
        />
        {isFocused && (
          <Animated.View
            style={[styles.activeIndicator, {backgroundColor: primaryColor}]}
          />
        )}
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  // iOS 26 네이티브 탭바: 높이 고정 (SwiftUI 내부 레이아웃에 맞춤)
  nativeContainer: {
    height: 64,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  activeIndicator: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    marginTop: 5,
  },
  topHighlight: {
    height: 1,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 0.5,
  },
});
