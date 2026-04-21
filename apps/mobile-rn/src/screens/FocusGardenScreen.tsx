/**
 * FocusGardenScreen — 집중 정원
 * 성공한 집중 세션은 성장 나무, 중지한 세션은 시든 나무로 심긴다.
 * 구조: 헤더 + 스트릭 카드 + 정원 카드
 */
import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, Pressable, Platform} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {TreePine, ChevronLeft} from 'lucide-react-native';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {FocusGardenView} from '@/components/focus/FocusGardenView';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

export default function FocusGardenScreen() {
  const navigation = useNavigation<any>();
  const {primaryColor} = useTheme();
  const {sessions, stats} = usePomodoroStore();

  // 연속 성공일 — 오늘부터 거꾸로 세션이 하나라도 성공한 날짜를 연속 카운트
  const streak = useMemo(() => {
    if (sessions.length === 0) return 0;

    const successDates = new Set<string>();
    for (const s of sessions) {
      if (s.timerType !== 'POMODORO') continue;
      if (s.interrupted) continue;
      if (s.duration < 120) continue;
      successDates.add(s.completedAt.slice(0, 10));
    }

    if (successDates.size === 0) return 0;

    let count = 0;
    const d = new Date();
    // 오늘 날짜가 없으면 어제부터 기준
    const todayStr = toLocalDateStr(d);
    if (!successDates.has(todayStr)) {
      d.setDate(d.getDate() - 1);
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const key = toLocalDateStr(d);
      if (successDates.has(key)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [sessions]);

  const totalFocusMin = stats.totalFocusTime;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.titleRow}>
          <TreePine size={20} color={primaryColor} />
          <Text style={styles.title}>집중 정원</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* 스트릭 배너 */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <AnimatedCard
            enterDelay={100}
            style={[styles.streakCard, {backgroundColor: hexWithOpacity(primaryColor, 0.08)}]}>
            <View style={styles.streakRow}>
              <TreePine size={24} color={primaryColor} />
              <View style={{flex: 1}}>
                <Text style={[styles.streakNumber, {color: primaryColor}]}>
                  {streak > 0 ? `${streak}일 연속 집중` : '오늘부터 시작해보세요'}
                </Text>
                <Text style={styles.streakSub}>
                  {streak > 0
                    ? `누적 ${totalFocusMin}분 집중했어요`
                    : '한 세션을 끝까지 완료하면 나무가 심겨요'}
                </Text>
              </View>
            </View>
          </AnimatedCard>
        </Animated.View>

        {/* 정원 카드 */}
        <AnimatedCard enterDelay={200} style={styles.gardenCard}>
          <FocusGardenView />
        </AnimatedCard>

        {/* 범례 */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: primaryColor}]} />
            <Text style={styles.legendText}>완료 세션</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#9CA3AF'}]} />
            <Text style={styles.legendText}>중단된 세션</Text>
          </View>
        </View>

        <View style={{height: 60}} />
      </ScrollView>
    </ScreenContainer>
  );
}

function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  streakCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakNumber: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  streakSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  gardenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
