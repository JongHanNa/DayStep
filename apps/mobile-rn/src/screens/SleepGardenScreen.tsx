/**
 * SleepGardenScreen — 수면 정원 메인 화면
 * 30일 정원 그리드 + 스트릭 + 목표 설정 + 세션 FAB
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {TreePine, Moon, Sun, Settings, Shield} from 'lucide-react-native';
import {requestAuthorization, isScreenTimeAvailable, getAuthorizationStatus} from '@/lib/screenTimeManager';
import {ScreenContainer, AnimatedCard, AnimatedPressable} from '@/components/core';
import {useSleepStore, type GardenDay} from '@/stores/sleepStore';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

// ============================================
// Garden Cell
// ============================================

function GardenCell({day, primaryColor}: {day: GardenDay; primaryColor: string}) {
  const dayNum = parseInt(day.date.split('-')[2], 10);

  let iconColor = '#D1D5DB';
  let bgColor = hexWithOpacity(primaryColor, 0.05);
  let borderColor = 'transparent';
  let showTree = false;

  switch (day.status) {
    case 'healthy':
      iconColor = '#22C55E';
      bgColor = hexWithOpacity('#22C55E', 0.08);
      showTree = true;
      break;
    case 'wilted':
      iconColor = '#9CA3AF';
      bgColor = hexWithOpacity('#9CA3AF', 0.06);
      showTree = true;
      break;
    case 'today':
      borderColor = primaryColor;
      bgColor = hexWithOpacity(primaryColor, 0.08);
      // 오늘 기록이 있으면 나무 표시
      if (day.durationMinutes && day.durationMinutes > 0) {
        iconColor = '#22C55E';
        showTree = true;
      }
      break;
    case 'empty':
      break;
  }

  return (
    <View style={[styles.gardenCell, {backgroundColor: bgColor, borderColor}]}>
      {showTree ? (
        <TreePine size={22} color={iconColor} />
      ) : (
        <View style={styles.emptyDot} />
      )}
      <Text style={styles.gardenCellDate}>{dayNum}</Text>
    </View>
  );
}

// ============================================
// Main Screen
// ============================================

export default function SleepGardenScreen() {
  const navigation = useNavigation<any>();
  const {primaryColor} = useTheme();

  const {
    sleepGoalTime,
    wakeGoalTime,
    screenTimeLinkEnabled,
    setScreenTimeLinkEnabled,
    sessionState,
    fetchMonthRecords,
    getGardenData,
    getStreak,
    getGoalDurationMinutes,
    recoverSession,
  } = useSleepStore();

  const [showScreenTimeModal, setShowScreenTimeModal] = useState(false);

  // 화면 포커스 시 스크린타임 권한 상태 동기화 + 연동 팝업
  useFocusEffect(
    useCallback(() => {
      // 스크린타임 권한이 해제된 경우 → screenTimeLinkEnabled 리셋
      if (screenTimeLinkEnabled) {
        const status = getAuthorizationStatus();
        if (status !== 'approved') {
          setScreenTimeLinkEnabled(false);
        }
      }
      // screenTimeLinkEnabled가 false이면 모달 표시
      if (!screenTimeLinkEnabled && isScreenTimeAvailable()) {
        setShowScreenTimeModal(true);
      }
    }, [screenTimeLinkEnabled, setScreenTimeLinkEnabled]),
  );

  // 화면 포커스 시 데이터 로딩
  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      fetchMonthRecords(now.getFullYear(), now.getMonth() + 1);
      // 이전 달 데이터도 로드 (30일 정원에 필요)
      const prevMonth = now.getMonth() === 0
        ? {year: now.getFullYear() - 1, month: 12}
        : {year: now.getFullYear(), month: now.getMonth()};
      fetchMonthRecords(prevMonth.year, prevMonth.month);
    }, [fetchMonthRecords]),
  );

  // 세션 복구 체크
  useEffect(() => {
    if (sessionState.status === 'running') {
      recoverSession().then(() => {
        // 복구 후에도 여전히 running이면 세션 화면으로
        const currentState = useSleepStore.getState().sessionState;
        if (currentState.status === 'running') {
          navigation.navigate('SleepSession');
        }
      });
    }
  }, []); // 최초 마운트 시만

  const gardenData = useMemo(() => getGardenData(), [getGardenData]);
  const streak = getStreak();
  const goalMinutes = getGoalDurationMinutes();
  const goalHours = Math.floor(goalMinutes / 60);
  const goalMins = goalMinutes % 60;

  // HH:mm → 12시간 포맷
  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleStartSession = useCallback(() => {
    navigation.navigate('SleepSession');
  }, [navigation]);

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <TreePine size={20} color={primaryColor} />
          <Text style={styles.headerTitle}>수면 정원</Text>
        </Animated.View>

        {/* 스트릭 배너 */}
        <AnimatedCard
          enterDelay={100}
          style={[styles.streakCard, {backgroundColor: hexWithOpacity(primaryColor, 0.08)}]}>
          <View style={styles.streakRow}>
            <TreePine size={24} color={primaryColor} />
            <View>
              <Text style={[styles.streakNumber, {color: primaryColor}]}>
                {streak}일 연속 성공
              </Text>
              <Text style={styles.streakSub}>
                {streak > 0 ? '잘하고 있어요! 계속 유지하세요' : '오늘부터 시작해보세요'}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* 30일 정원 그리드 */}
        <AnimatedCard enterDelay={200} style={styles.gardenCard}>
          <Text style={styles.sectionTitle}>최근 30일</Text>
          <View style={styles.gardenGrid}>
            {gardenData.map(day => (
              <GardenCell key={day.date} day={day} primaryColor={primaryColor} />
            ))}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <TreePine size={12} color="#22C55E" />
              <Text style={styles.legendText}>성공</Text>
            </View>
            <View style={styles.legendItem}>
              <TreePine size={12} color="#9CA3AF" />
              <Text style={styles.legendText}>미달</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#E5E7EB'}]} />
              <Text style={styles.legendText}>기록없음</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* 목표 요약 바 */}
        <AnimatedCard enterDelay={300} style={styles.goalCard}>
          <View style={styles.goalRow}>
            <View style={styles.goalTimeRow}>
              <View style={styles.goalTimeItem}>
                <Moon size={16} color="#6366F1" />
                <Text style={styles.goalTimeText}>{formatTimeDisplay(sleepGoalTime)}</Text>
              </View>
              <Text style={styles.goalArrow}>→</Text>
              <View style={styles.goalTimeItem}>
                <Sun size={16} color="#F59E0B" />
                <Text style={styles.goalTimeText}>{formatTimeDisplay(wakeGoalTime)}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => navigation.navigate('SleepGoal')}
              hitSlop={12}>
              <Settings size={20} color="#9CA3AF" />
            </Pressable>
          </View>
          <View style={[styles.goalDurationBadge, {backgroundColor: hexWithOpacity(primaryColor, 0.08)}]}>
            <Text style={[styles.goalDurationText, {color: primaryColor}]}>
              목표 {goalHours}시간{goalMins > 0 ? ` ${goalMins}분` : ''}
            </Text>
          </View>
        </AnimatedCard>

        {/* 하단 여백 (FAB 겹침 방지) */}
        <View style={{height: 100}} />
      </ScrollView>

      {/* FAB — 잠들기 시작 */}
      <View style={styles.fabContainer}>
        <AnimatedPressable
          onPress={handleStartSession}
          hapticType="medium"
          scaleValue={0.9}
          style={[styles.fab, {backgroundColor: primaryColor}]}>
          <Moon size={24} color="#FFFFFF" />
        </AnimatedPressable>
        <Text style={styles.fabLabel}>잠들기 시작</Text>
      </View>

      {/* 스크린타임 연동 유도 모달 */}
      <Modal
        visible={showScreenTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScreenTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Shield size={32} color={primaryColor} />
            <Text style={styles.modalTitle}>스크린타임 연동</Text>
            <Text style={styles.modalDesc}>
              수면 중 앱 사용을 제한하여{'\n'}더 깊은 수면을 도와드려요
            </Text>
            <Pressable
              onPress={async () => {
                try {
                  await requestAuthorization(); // void 반환, 실패 시 throw
                  setScreenTimeLinkEnabled(true);
                  setShowScreenTimeModal(false);
                  navigation.navigate('ScreenTimeApps');
                } catch {
                  setShowScreenTimeModal(false);
                  Alert.alert(
                    '권한 필요',
                    '스크린타임 권한을 허용해주세요.\n다른 앱에서 이미 사용 중인 경우, 해당 앱의 스크린타임 연동을 해제해주세요.',
                  );
                }
              }}
              style={[styles.modalPrimaryBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.modalPrimaryBtnText}>연동하기</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowScreenTimeModal(false)}
              style={styles.modalSecondaryBtn}>
              <Text style={styles.modalSecondaryBtnText}>나중에</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Streak
  streakCard: {
    marginBottom: 12,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  streakSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  // Garden Grid
  gardenCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  gardenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gardenCell: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gardenCellDate: {
    fontSize: 9,
    color: '#9CA3AF',
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Goal
  goalCard: {
    marginBottom: 12,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  goalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  goalArrow: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  goalDurationBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  goalDurationText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Screen time modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  modalDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  modalPrimaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  fabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
});
