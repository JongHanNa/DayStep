/**
 * MorePanelContent — "더 보기" 확장 패널 콘텐츠
 * 순수 콘텐츠만 export: 헤더("더 보기" + 이름 토글) + 5열 아이콘 그리드
 * 부모(CustomTabBar)의 글래스 컨테이너 안에 렌더링됨
 */
import React, {useState, useEffect} from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
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
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    onHeightChange?.(getMorePanelHeight(showLabels));
  }, [showLabels, onHeightChange]);

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
          onPress={() => setShowLabels(prev => !prev)}
          hitSlop={8}>
          <Text
            style={[
              styles.toggleText,
              {color: showLabels ? primaryColor : '#9CA3AF'},
            ]}>
            이름
          </Text>
          <View
            style={[
              styles.toggleTrack,
              {backgroundColor: showLabels ? primaryColor : '#D1D5DB'},
            ]}>
            <View
              style={[
                styles.toggleThumb,
                showLabels ? styles.toggleThumbOn : styles.toggleThumbOff,
              ]}
            />
          </View>
        </Pressable>
      </View>

      {/* 아이콘 그리드 */}
      <View style={styles.grid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {row.map(item => (
              <Pressable
                key={item.screenName}
                style={[
                  styles.gridItem,
                  !showLabels && styles.gridItemCompact,
                ]}
                onPress={() => {
                  onSelectScreen(item.screenName);
                  onClose();
                }}>
                <item.Icon
                  size={24}
                  color={item.screenName === activeScreenName ? primaryColor : '#9CA3AF'}
                  strokeWidth={1.6}
                />
                {showLabels && (
                  <Text
                    style={[
                      styles.gridLabel,
                      item.screenName === activeScreenName && {color: primaryColor},
                    ]}
                    numberOfLines={1}>
                    {item.label}
                  </Text>
                )}
              </Pressable>
            ))}
            {/* 빈 셀 채우기 */}
            {row.length < COLUMNS &&
              Array.from({length: COLUMNS - row.length}).map((_, i) => (
                <View
                  key={`empty-${i}`}
                  style={[
                    styles.gridItem,
                    !showLabels && styles.gridItemCompact,
                  ]}
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
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  toggleThumbOff: {
    alignSelf: 'flex-start',
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
    paddingVertical: 8,
  },
  gridItemCompact: {
    paddingVertical: 6,
  },
  gridLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});
