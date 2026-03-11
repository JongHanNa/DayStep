/**
 * Custom Bottom Tab Bar
 * 5탭: 홈 / 플래너 / 실행 / 노트 / 더 보기
 * Liquid Glass 플로팅 탭바 — 아이콘만 표시, 화이트 글래스
 *
 * iOS 26+: 네이티브 SwiftUI .glassEffect 탭바
 *          → More 패널 열림 시 네이티브 탭바 자체가 위로 확장 (글래스 효과 유지)
 * iOS 25-: JS GlassBackground 폴백
 *
 * More 패널: 탭바 자체가 위로 확장되어 하나의 글래스 카드 안에
 *            그리드 + 탭 아이콘이 함께 표시됨 (어두운 배경 없음)
 */
import React, {useState, useCallback, useEffect} from 'react';
import {View, Pressable, StyleSheet, useWindowDimensions, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {AnimatedPressable} from '@/components/core';
import {GlassBackground} from '@/components/core';
import {useTheme} from '@/theme';
import {Home, Calendar, Timer, Flame, Ellipsis} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';
import {
  LiquidGlassTabBarNative,
  isIOS26Plus,
  type NativeTabData,
  type NativeMenuItemData,
} from '@/components/native';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useSettingsStore} from '@/stores/settingsStore';
import {Canvas, Path, Skia} from '@shopify/react-native-skia';
import {MorePanelContent, MORE_PANEL_CONTENT_HEIGHT} from './MorePanel';

const TAB_CONFIG: Record<string, {Icon: LucideIcon}> = {
  Home: {Icon: Home},
  Planner: {Icon: Calendar},
  Execute: {Icon: Timer},
  Notes: {Icon: Flame},
  More: {Icon: Ellipsis},
};

// iOS 26 네이티브 탭바용 SF Symbol 매핑
const SF_SYMBOL_MAP: Record<string, string> = {
  Home: 'house',
  Planner: 'calendar',
  Execute: 'timer',
  Notes: 'flame',
  More: 'ellipsis',
};

// HomeStack 내 "More 소속" 화면 목록
const MORE_SCREENS = new Set([
  'MonthlyPlanner', 'AIPlan', 'AIChat', 'Guide',
  'Record', 'News', 'Contact', 'Gratitude', 'Activity', 'Cleanup',
]);

// iOS 26+ 네이티브 확장 패널용 SF Symbol 매핑
const MENU_SF_SYMBOLS: Record<string, string> = {
  MoreLanding: 'gearshape',
  MonthlyPlanner: 'calendar',
  AIPlan: 'list.clipboard',
  AIChat: 'sparkles',
  Guide: 'message',
  Cleanup: 'trash',
  Record: 'flame',
  News: 'newspaper',
  Contact: 'phone',
  Gratitude: 'heart',
  Activity: 'waveform.path.ecg',
};

const MENU_LABELS: Record<string, string> = {
  MoreLanding: '설정',
  MonthlyPlanner: '월간계획',
  AIPlan: '계획보기',
  AIChat: 'AI계획',
  Guide: 'Claude',
  Cleanup: '정리',
  Record: '원동력',
  News: '관계기록',
  Contact: '소식',
  Gratitude: '연락',
  Activity: '감사',
};

// 네이티브 메뉴 아이템 순서 (MorePanel의 MENU_ITEMS와 동일)
const MENU_SCREEN_ORDER = [
  'MoreLanding', 'MonthlyPlanner', 'AIPlan', 'AIChat', 'Guide',
  'Cleanup', 'Record', 'News', 'Contact', 'Gratitude', 'Activity',
];

const TAB_COUNT = 5;
const COLLAPSED_HEIGHT = 56;
const TIMING_CONFIG = {duration: 250, easing: Easing.inOut(Easing.ease)};

// iOS 26+ 네이티브 탭바 확장 높이
const NATIVE_COLLAPSED = 56;

export function CustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor} = useTheme();
  const timerState = usePomodoroStore(s => s.timerState);
  const isTimerActive = timerState.isRunning || timerState.isPaused;
  const [morePanelVisible, setMorePanelVisible] = useState(false);
  const [panelContentHeight, setPanelContentHeight] = useState(MORE_PANEL_CONTENT_HEIGHT);

  // JS 탭바 높이 애니메이션 (iOS 25-)
  const tabBarHeight = useSharedValue(COLLAPSED_HEIGHT);
  // 네이티브 탭바 높이 애니메이션 (iOS 26+)
  const nativeTabBarHeight = useSharedValue(NATIVE_COLLAPSED);

  const handlePanelHeightChange = useCallback((height: number) => {
    setPanelContentHeight(height);
  }, []);

  useEffect(() => {
    // JS 탭바 높이 (iOS 25-)
    const expandedHeight = COLLAPSED_HEIGHT + panelContentHeight;
    tabBarHeight.value = withTiming(
      morePanelVisible ? expandedHeight : COLLAPSED_HEIGHT,
      TIMING_CONFIG,
    );
    // iOS 26+: 네이티브가 자체 애니메이션하므로 여기서 nativeTabBarHeight 건드리지 않음
  }, [morePanelVisible, panelContentHeight, tabBarHeight]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: tabBarHeight.value,
  }));

  const animatedNativeStyle = useAnimatedStyle(() => ({
    height: nativeTabBarHeight.value,
  }));

  // HomeStack의 현재 nested route 확인 → More 소속 화면이면 "..." 활성화
  const homeRoute = state.routes.find(r => r.name === 'Home');
  const homeNestedState = homeRoute?.state;
  const activeHomeScreen =
    homeNestedState?.routes?.[homeNestedState.index ?? 0]?.name;
  const isHomeShowingMoreScreen =
    activeHomeScreen != null && MORE_SCREENS.has(activeHomeScreen);

  // More 탭의 nested state에서 현재 활성 화면명 추출
  const moreRoute = state.routes.find(r => r.name === 'More');
  const moreNestedState = moreRoute?.state;
  const activeMoreScreen =
    moreNestedState?.routes?.[moreNestedState.index ?? 0]?.name;

  const tabBarBottom = Math.max(insets.bottom, 8);

  // 글래스 필 위치 계산
  const {width: screenWidth} = useWindowDimensions();
  const tabBarInnerWidth = screenWidth - 32; // container left:16 + right:16
  const tabWidth = tabBarInnerWidth / TAB_COUNT;
  const pillWidth = tabWidth - 12; // 탭 셀보다 약간 좁게

  const effectiveFocusedIndex = isHomeShowingMoreScreen
    ? state.routes.findIndex(r => r.name === 'More')
    : state.index;

  const initialPillX = effectiveFocusedIndex * tabWidth + (tabWidth - pillWidth) / 2;
  const pillTranslateX = useSharedValue(initialPillX);
  const pillScaleX = useSharedValue(1);
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    const targetX = effectiveFocusedIndex * tabWidth + (tabWidth - pillWidth) / 2;
    if (isFirstRender.current) {
      // 초기 마운트: 애니메이션 없이 즉시 배치
      pillTranslateX.value = targetX;
      isFirstRender.current = false;
      return;
    }
    // 스퀴시: 수평 압축 → 복원 (관성 느낌)
    pillScaleX.value = withSpring(0.85, {damping: 15, stiffness: 400}, () => {
      pillScaleX.value = withSpring(1, {damping: 12, stiffness: 200});
    });
    // 슬라이딩
    pillTranslateX.value = withSpring(targetX, {
      damping: 22,
      stiffness: 350,
      mass: 0.5,
    });
  }, [effectiveFocusedIndex, tabWidth, pillWidth, pillTranslateX, pillScaleX]);

  const glassPillStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: pillTranslateX.value},
      {scaleX: pillScaleX.value},
    ],
    width: pillWidth,
  }));

  // More 패널에서 화면 선택 시
  const handleSelectScreen = useCallback(
    (screenName: string) => {
      navigation.navigate('More', {screen: screenName});
    },
    [navigation],
  );

  const handleClosePanel = useCallback(() => {
    setMorePanelVisible(false);
  }, []);

  // 포커스된 화면이 탭 바 숨김을 요청하면 렌더링하지 않음
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;
  const tabBarStyle = focusedOptions.tabBarStyle as ViewStyle | undefined;
  if (tabBarStyle?.display === 'none') {
    return null;
  }

  // iOS 26+: 네이티브 Liquid Glass 탭바 (자체 확장 방식)
  if (isIOS26Plus) {
    const showLabels = useSettingsStore(s => s.morePanelShowLabels);
    const setMorePanelShowLabels = useSettingsStore(s => s.setMorePanelShowLabels);

    const nativeTabs: NativeTabData[] = state.routes.map(route => ({
      name: route.name,
      sfSymbol: SF_SYMBOL_MAP[route.name] ?? 'circle',
    }));

    // 네이티브 expandedView용 메뉴 아이템 생성
    const nativeMenuItems: NativeMenuItemData[] = MENU_SCREEN_ORDER.map(screenName => ({
      label: MENU_LABELS[screenName] ?? screenName,
      sfSymbol: MENU_SF_SYMBOLS[screenName] ?? 'circle',
      screenName,
      isActive: screenName === activeMoreScreen,
    }));

    const handleNativeTabPress = (event: {nativeEvent: {index: number}}) => {
      const index = event.nativeEvent.index;
      const route = state.routes[index];
      const isFocused = state.index === index;

      // More 탭: 패널 토글
      if (route.name === 'More') {
        setMorePanelVisible(prev => !prev);
        return;
      }

      // 다른 탭: 패널 닫기 + 정상 내비게이션
      setMorePanelVisible(false);

      const navEvent = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !navEvent.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const handleNativeMenuItemPress = (event: {nativeEvent: {screenName: string}}) => {
      handleSelectScreen(event.nativeEvent.screenName);
      handleClosePanel();
    };

    const handleNativeToggleLabels = (event: {nativeEvent: {showLabels: boolean}}) => {
      setMorePanelShowLabels(event.nativeEvent.showLabels);
    };

    const handleNativeHeightChange = (event: {nativeEvent: {height: number}}) => {
      nativeTabBarHeight.value = event.nativeEvent.height; // 직접 동기화 (네이티브 애니메이션 추종)
    };

    return (
      <>
        {/* 투명 터치 캐처 (패널 열림 시) */}
        {morePanelVisible && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClosePanel}
          />
        )}

        <Animated.View
          style={[
            styles.container,
            {bottom: tabBarBottom},
            animatedNativeStyle,
          ]}>
          {/* 네이티브 글래스 탭바 — isExpanded 시 expandedView 활성화 */}
          <LiquidGlassTabBarNative
            tabs={nativeTabs}
            selectedIndex={isHomeShowingMoreScreen ? state.routes.findIndex(r => r.name === 'More') : state.index}
            primaryColor={primaryColor}
            timerProgress={isTimerActive ? timerState.progress : -1}
            isExpanded={morePanelVisible}
            menuItems={nativeMenuItems}
            showLabels={showLabels}
            onTabPress={handleNativeTabPress}
            onMenuItemPress={handleNativeMenuItemPress}
            onToggleLabels={handleNativeToggleLabels}
            onHeightChange={handleNativeHeightChange}
            style={styles.nativeFill}
          />
        </Animated.View>
      </>
    );
  }

  // JS 글래스 탭바 (iOS 25- 또는 패널 열림 시)
  return (
    <>
      {/* 투명 터치 캐처 — 패널 외부 터치로 닫기 (어두운 배경 없음) */}
      {morePanelVisible && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClosePanel}
        />
      )}

      <Animated.View
        style={[
          styles.container,
          {bottom: tabBarBottom},
          animatedContainerStyle,
        ]}>
        <GlassBackground
          blurType="chromeMaterialLight"
          blurAmount={32}
          overlayColor="rgba(255, 255, 255, 0.55)"
          style={styles.glassContainer}>
          {/* 상단 하이라이트 — 빛 반사 효과 */}
          <View style={styles.topHighlight} />

          {/* 패널 열림 시: 그리드 콘텐츠 */}
          {morePanelVisible && (
            <MorePanelContent
              onSelectScreen={handleSelectScreen}
              onClose={handleClosePanel}
              primaryColor={primaryColor}
              onHeightChange={handlePanelHeightChange}
              activeScreenName={activeMoreScreen}
            />
          )}

          {/* 기존 탭 아이콘 행 */}
          <View style={styles.tabRow}>
            {/* 글래스 필 — 활성 탭 위치에 슬라이딩 */}
            <Animated.View style={[styles.glassPill, glassPillStyle]} />
            {state.routes.map((route, index) => {
              let isFocused = state.index === index;
              if (isHomeShowingMoreScreen) {
                if (route.name === 'Home') isFocused = false;
                if (route.name === 'More') isFocused = true;
              }
              const tabInfo = TAB_CONFIG[route.name] ?? {Icon: Home};

              const onPress = () => {
                // More 탭: 패널 토글
                if (route.name === 'More') {
                  setMorePanelVisible(prev => !prev);
                  return;
                }

                // 다른 탭: 패널 닫기 + 정상 내비게이션
                setMorePanelVisible(false);

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
                  isTimerActive={route.name === 'Execute' && isTimerActive}
                  timerProgress={timerState.progress}
                  tabName={route.name}
                />
              );
            })}
          </View>
        </GlassBackground>
      </Animated.View>
    </>
  );
}

function MiniTimerRing({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  const size = 28;
  const sw = 3;
  const center = size / 2;
  const radius = center - sw / 2;

  const bgPath = Skia.Path.Make();
  bgPath.addCircle(center, center, radius);

  const sweepAngle = 360 * Math.min(Math.max(progress, 0), 1);
  const progressPath = Skia.Path.Make();
  if (sweepAngle > 0) {
    progressPath.addArc(
      {x: sw / 2, y: sw / 2, width: radius * 2, height: radius * 2},
      -90,
      sweepAngle,
    );
  }

  return (
    <Canvas style={{width: size, height: size}}>
      <Path
        path={bgPath}
        style="stroke"
        strokeWidth={sw}
        color="#E5E7EB"
        strokeCap="round"
      />
      {sweepAngle > 0 && (
        <Path
          path={progressPath}
          style="stroke"
          strokeWidth={sw}
          color={color}
          strokeCap="round"
        />
      )}
    </Canvas>
  );
}

function TabButton({
  Icon,
  isFocused,
  primaryColor,
  onPress,
  isTimerActive,
  timerProgress,
  tabName,
}: {
  Icon: LucideIcon;
  isFocused: boolean;
  primaryColor: string;
  onPress: () => void;
  isTimerActive: boolean;
  timerProgress: number;
  tabName: string;
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
      testID={`tab_${tabName}`}
      accessibilityIdentifier={`tab_${tabName}`}
      style={styles.tabButton}>
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {isTimerActive ? (
          <MiniTimerRing
            progress={timerProgress}
            color={isFocused ? primaryColor : '#9CA3AF'}
          />
        ) : (
          <Icon
            size={22}
            color={isFocused ? primaryColor : '#9CA3AF'}
            strokeWidth={isFocused ? 2.2 : 1.8}
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
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  glassContainer: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  // iOS 26 네이티브 탭바: 부모 Animated.View 전체 채움
  nativeFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // 패널 콘텐츠 오버레이: 탭 아이콘 영역(하단 64pt) 제외
  panelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: NATIVE_COLLAPSED,
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
  glassPill: {
    position: 'absolute',
    top: 7,
    left: 0,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(120, 120, 128, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  topHighlight: {
    height: 1,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 0.5,
  },
});
