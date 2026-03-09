/**
 * MorePanel — "더 보기" 확장 패널
 * 탭바 위에 글래스 패널로 표시, 11개 부가 화면 아이콘 그리드
 */
import React, {useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {GlassBackground} from '@/components/core';
import {useTheme} from '@/theme';
import {
  Settings,
  Calendar,
  ClipboardList,
  Sparkles,
  MessageSquare,
  Trash2,
  Flame,
  Users,
  Newspaper,
  Phone,
  Heart,
  Activity,
} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';

interface MorePanelProps {
  visible: boolean;
  onClose: () => void;
  onSelectScreen: (screenName: string) => void;
  tabBarBottom: number;
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
const PANEL_HEIGHT = 220;
const {width: SCREEN_WIDTH} = Dimensions.get('window');

export function MorePanel({
  visible,
  onClose,
  onSelectScreen,
  tabBarBottom,
}: MorePanelProps) {
  const {primaryColor} = useTheme();
  const panelHeight = useSharedValue(0);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      panelHeight.value = withSpring(PANEL_HEIGHT, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(1, {duration: 200});
      backdropOpacity.value = withTiming(1, {duration: 200});
    } else {
      panelHeight.value = withSpring(0, {damping: 20, stiffness: 300});
      opacity.value = withTiming(0, {duration: 150});
      backdropOpacity.value = withTiming(0, {duration: 150});
    }
  }, [visible, panelHeight, opacity, backdropOpacity]);

  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    opacity: opacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  // 4열 그리드로 배치
  const rows: MenuItem[][] = [];
  for (let i = 0; i < MENU_ITEMS.length; i += COLUMNS) {
    rows.push(MENU_ITEMS.slice(i, i + COLUMNS));
  }

  const TAB_BAR_HEIGHT = 56;

  return (
    <Modal transparent visible={visible} animationType="none">
      {/* 백드롭 */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, backdropStyle]}
        />
      </Pressable>

      {/* 패널 — 탭바 바로 위 */}
      <Animated.View
        style={[
          styles.panelWrapper,
          panelStyle,
          {bottom: tabBarBottom + TAB_BAR_HEIGHT},
        ]}>
        <GlassBackground
          blurType="chromeMaterialLight"
          blurAmount={32}
          overlayColor="rgba(255, 255, 255, 0.55)"
          style={styles.panelGlass}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>더 보기</Text>
            <Text style={[styles.editButton, {color: primaryColor}]}>
              편집
            </Text>
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
        </GlassBackground>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  panelWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    overflow: 'hidden',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  panelGlass: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
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
