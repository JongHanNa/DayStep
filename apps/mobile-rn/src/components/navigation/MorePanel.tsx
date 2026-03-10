/**
 * MorePanelContent — "더 보기" 확장 패널 콘텐츠
 * 순수 콘텐츠만 export: 헤더("더 보기" + "편집") + 4열 아이콘 그리드
 * 부모(CustomTabBar)의 글래스 컨테이너 안에 렌더링됨
 */
import React from 'react';
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

const COLUMNS = 4;

/** 패널 콘텐츠 높이 (탭바 확장 계산에 사용) */
export const MORE_PANEL_CONTENT_HEIGHT = 220;

export function MorePanelContent({
  onSelectScreen,
  onClose,
  primaryColor,
}: MorePanelContentProps) {
  // 4열 그리드로 배치
  const rows: MenuItem[][] = [];
  for (let i = 0; i < MENU_ITEMS.length; i += COLUMNS) {
    rows.push(MENU_ITEMS.slice(i, i + COLUMNS));
  }

  return (
    <View>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>더 보기</Text>
        <Text style={[styles.editButton, {color: primaryColor}]}>편집</Text>
      </View>

      {/* 아이콘 그리드 */}
      <View style={styles.grid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {row.map(item => (
              <Pressable
                key={item.screenName}
                style={styles.gridItem}
                onPress={() => {
                  onSelectScreen(item.screenName);
                  onClose();
                }}>
                <item.Icon size={24} color="#374151" strokeWidth={1.6} />
                <Text style={styles.gridLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
            {/* 빈 셀 채우기 */}
            {row.length < COLUMNS &&
              Array.from({length: COLUMNS - row.length}).map((_, i) => (
                <View key={`empty-${i}`} style={styles.gridItem} />
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
  editButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    paddingHorizontal: 8,
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
  gridLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});
