/**
 * MorePanelContent — "더 보기" 확장 패널 콘텐츠
 * 순수 콘텐츠만 export: 헤더("더 보기" + 이름 토글) + 5열 아이콘 그리드
 * 부모(CustomTabBar)의 글래스 컨테이너 안에 렌더링됨
 */
import React, {useEffect} from 'react';
import {View, Text, Pressable, Switch, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
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
  panelProgress?: SharedValue<number>;
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
const HEADER_HEIGHT = 48; // paddingTop 14 + paddingBottom 8 + 축소된 Switch ~26
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
  panelProgress,
}: MorePanelContentProps) {
  const showLabels = useSettingsStore(s => s.morePanelShowLabels);
  const setShowLabels = useSettingsStore(s => s.setMorePanelShowLabels);

  // 그리드 라벨 애니메이션용 진행도
  const toggleProgress = useSharedValue(showLabels ? 1 : 0);

  useEffect(() => {
    toggleProgress.value = withSpring(showLabels ? 1 : 0, springs.snappy);
  }, [showLabels]);

  useEffect(() => {
    onHeightChange?.(getMorePanelHeight(showLabels));
  }, [showLabels, onHeightChange]);

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

  // 패널 전체 fade + slide (panelProgress 연동)
  const panelContentStyle = useAnimatedStyle(() => {
    const p = panelProgress?.value ?? 1;
    return {
      opacity: p,
      transform: [{translateY: (1 - p) * 8}],
    };
  });

  // 5열 그리드로 배치
  const rows: MenuItem[][] = [];
  for (let i = 0; i < MENU_ITEMS.length; i += COLUMNS) {
    rows.push(MENU_ITEMS.slice(i, i + COLUMNS));
  }

  return (
    <Animated.View style={panelContentStyle}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>더 보기</Text>
        <View style={styles.toggleButton}>
          <Text
            style={[
              styles.toggleText,
              {color: showLabels ? primaryColor : '#9CA3AF'},
            ]}>
            이름
          </Text>
          <Switch
            value={showLabels}
            onValueChange={v => setShowLabels(v)}
            trackColor={{false: '#E5E7EB', true: primaryColor + '80'}}
            thumbColor={showLabels ? primaryColor : '#F3F4F6'}
            style={{transform: [{scaleX: 0.75}, {scaleY: 0.75}]}}
          />
        </View>
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
    </Animated.View>
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
