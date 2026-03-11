/**
 * MorePanelContent — "더 보기" 확장 패널 콘텐츠
 * 순수 콘텐츠만 export: 헤더("더 보기" + 이름 토글) + 5열 아이콘 그리드
 * 부모(CustomTabBar)의 글래스 컨테이너 안에 렌더링됨
 */
import React, {useEffect} from 'react';
import {View, Text, Pressable, StyleSheet, Platform} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import {springs} from '@/theme/animations';
import {useSettingsStore} from '@/stores/settingsStore';
import {
  Settings,
  Calendar,
  ClipboardList,
  Sparkles,
  MessageSquare,
  Trash2,
  Flame,
  Newspaper,
  Phone,
  Heart,
  Activity,
} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MorePanelContentProps {
  onSelectScreen: (screenName: string) => void;
  onClose: () => void;
  primaryColor: string;
  onHeightChange?: (height: number) => void;
  activeScreenName?: string;
}

interface MenuItem {
  label: string;
  screenName: string;
  Icon: LucideIcon;
}

const MENU_ITEMS: MenuItem[] = [
  {label: '설정', screenName: 'MoreLanding', Icon: Settings},
  {label: '월간계획', screenName: 'MonthlyPlanner', Icon: Calendar},
  {label: '계획보기', screenName: 'AIPlan', Icon: ClipboardList},
  {label: 'AI계획', screenName: 'AIChat', Icon: Sparkles},
  {label: 'Claude', screenName: 'Guide', Icon: MessageSquare},
  {label: '정리', screenName: 'Cleanup', Icon: Trash2},
  {label: '원동력', screenName: 'Record', Icon: Flame},
  {label: '관계기록', screenName: 'News', Icon: Newspaper},
  {label: '소식', screenName: 'Contact', Icon: Phone},
  {label: '연락', screenName: 'Gratitude', Icon: Heart},
  {label: '감사', screenName: 'Activity', Icon: Activity},
];

const COLUMNS = 5;
const HEADER_HEIGHT = 40; // paddingTop 14 + paddingBottom 8 + text ~18
const ROW_HEIGHT_WITH_LABEL = 56; // paddingVertical 8*2 + icon 24 + marginTop 4 + label 12
const ROW_HEIGHT_WITHOUT_LABEL = 44; // paddingVertical 8*2 + icon 24 + some spacing
const ROW_GAP = 8; // marginBottom

/** 패널 콘텐츠 높이 계산 */
export function getMorePanelHeight(showLabels: boolean): number {
  const rowCount = Math.ceil(MENU_ITEMS.length / COLUMNS);
  const rowHeight = showLabels ? ROW_HEIGHT_WITH_LABEL : ROW_HEIGHT_WITHOUT_LABEL;
  return HEADER_HEIGHT + rowCount * rowHeight + (rowCount - 1) * ROW_GAP;
}

/** 기본 높이 (레이블 표시 시) — 초기값용 */
export const MORE_PANEL_CONTENT_HEIGHT = getMorePanelHeight(true);

export function MorePanelContent({
  onSelectScreen,
  onClose,
  primaryColor,
  onHeightChange,
  activeScreenName,
}: MorePanelContentProps) {
  const showLabels = useSettingsStore(s => s.morePanelShowLabels);
  const setShowLabels = useSettingsStore(s => s.setMorePanelShowLabels);

  // 색상/라벨 진행도
  const toggleProgress = useSharedValue(showLabels ? 1 : 0);
  // 모프 전환용: 위치 + 수평 스케일
  const thumbX = useSharedValue(showLabels ? 12 : 0);
  const thumbScaleX = useSharedValue(1);

  useEffect(() => {
    const targetX = showLabels ? 12 : 0;

    // ① 수평 팽창 (액체가 늘어나는 느낌)
    thumbScaleX.value = withSpring(1.3, {damping: 15, stiffness: 400}, () => {
      // ③ 수축 복원 (도착 후 정착, 살짝 오버슈트)
      thumbScaleX.value = withSpring(1, {damping: 12, stiffness: 200});
    });

    // ② 슬라이드 이동 (팽창과 동시에)
    thumbX.value = withSpring(targetX, {damping: 22, stiffness: 350, mass: 0.5});

    // 색상/라벨 진행도
    toggleProgress.value = withSpring(showLabels ? 1 : 0, springs.snappy);
  }, [showLabels]);

  useEffect(() => {
    onHeightChange?.(getMorePanelHeight(showLabels));
  }, [showLabels, onHeightChange]);

  // 토글 트랙 — 글라스 모피즘
  const trackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      toggleProgress.value,
      [0, 1],
      ['rgba(209, 213, 219, 0.5)', `${primaryColor}88`],
    );
    const borderColor = interpolateColor(
      toggleProgress.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.3)', `${primaryColor}44`],
    );
    return {backgroundColor, borderColor};
  });

  // 토글 썸 — 모프 전환 (팽창→이동→수축)
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: thumbX.value},
      {scaleX: thumbScaleX.value},
    ],
  }));

  // inner glow 레이어
  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: toggleProgress.value * 0.3,
  }));

  // "이름" 텍스트 — 색상 인터폴레이션
  const labelTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      toggleProgress.value,
      [0, 1],
      ['#9CA3AF', primaryColor],
    );
    return {color};
  });

  // 그리드 라벨 — 페이드 + 슬라이드
  const gridLabelStyle = useAnimatedStyle(() => ({
    opacity: toggleProgress.value,
    transform: [{translateY: (1 - toggleProgress.value) * 4}],
    height: toggleProgress.value * 16,
    marginTop: toggleProgress.value * 4,
    overflow: 'hidden' as const,
  }));

  // 그리드 아이템 — 패딩 애니메이션
  const gridItemStyle = useAnimatedStyle(() => ({
    paddingVertical: 6 + toggleProgress.value * 2,
  }));

  // 5열 그리드로 배치
  const rows: MenuItem[][] = [];
  for (let i = 0; i < MENU_ITEMS.length; i += COLUMNS) {
    rows.push(MENU_ITEMS.slice(i, i + COLUMNS));
  }

  return (
    <View>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>더 보기</Text>
        <Pressable
          style={styles.toggleButton}
          onPress={() => setShowLabels(!showLabels)}
          hitSlop={8}>
          <Animated.Text style={[styles.toggleText, labelTextStyle]}>
            이름
          </Animated.Text>
          <Animated.View style={[styles.toggleTrack, trackStyle]}>
            <Animated.View style={[styles.toggleInnerGlow, innerGlowStyle]} />
            <Animated.View style={[styles.toggleThumb, thumbStyle]} />
          </Animated.View>
        </Pressable>
      </View>

      {/* 아이콘 그리드 */}
      <View style={styles.grid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {row.map(item => (
              <AnimatedPressable
                key={item.screenName}
                style={[styles.gridItem, gridItemStyle]}
                onPress={() => {
                  onSelectScreen(item.screenName);
                  onClose();
                }}>
                <item.Icon
                  size={24}
                  color={item.screenName === activeScreenName ? primaryColor : '#9CA3AF'}
                  strokeWidth={1.6}
                />
                <Animated.Text
                  style={[
                    styles.gridLabel,
                    item.screenName === activeScreenName && {color: primaryColor},
                    gridLabelStyle,
                  ]}
                  numberOfLines={1}>
                  {item.label}
                </Animated.Text>
              </AnimatedPressable>
            ))}
            {/* 빈 셀 채우기 */}
            {row.length < COLUMNS &&
              Array.from({length: COLUMNS - row.length}).map((_, i) => (
                <Animated.View
                  key={`empty-${i}`}
                  style={[styles.gridItem, gridItemStyle]}
                />
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toggleTrack: {
    width: 28,
    height: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    ...(Platform.OS === 'android' ? {elevation: 1} : {}),
    overflow: 'hidden',
  },
  toggleThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    ...(Platform.OS === 'android' ? {elevation: 2} : {}),
  },
  toggleInnerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  grid: {
    paddingHorizontal: 0,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
});
