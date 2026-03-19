/**
 * SleepGardenScreen — 수면 정원 메인 화면
 * 네이티브 SwiftUI 4-뷰 가든 + 스트릭 + 목표 설정 + 세션 FAB
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert, Platform} from 'react-native';
import Animated, {FadeInDown, useSharedValue, useAnimatedStyle, withSpring} from 'react-native-reanimated';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {TreePine, Moon, Sun, Settings, Shield, ChevronRight, MoreHorizontal} from 'lucide-react-native';
import {LiquidGlassMenu} from '@/components/native/LiquidGlassMenu';
import {requestAuthorization, isScreenTimeAvailable, getAuthorizationStatus} from '@/lib/screenTimeManager';
import {ScreenContainer, AnimatedCard, AnimatedPressable} from '@/components/core';
import {NativeSleepGardenNative} from '@/components/native';
import {useSleepStore, type GardenDay} from '@/stores/sleepStore';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {format} from 'date-fns';

// ============================================
// Main Screen
// ============================================

type ViewMode = 'day' | 'week' | 'month' | 'year';

const SLEEP_MENU_ITEMS = [
  {title: '수면과 ADHD', key: 'sleepADHDInfo'},
];

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
    selectedDate,
    setSelectedDate,
  } = useSleepStore();

  const [showScreenTimeModal, setShowScreenTimeModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // 네이티브 컴포넌트 높이 애니메이션 (absoluteFill 패턴)
  const gardenHeight = useSharedValue(450);
  const gardenAnimatedStyle = useAnimatedStyle(() => ({
    height: gardenHeight.value,
    overflow: 'hidden' as const,
  }));

  // 화면 포커스 시 스크린타임 권한 상태 동기화 + 연동 팝업
  useFocusEffect(
    useCallback(() => {
      if (!isScreenTimeAvailable()) return;

      // 반응형 구독 대신 getState()로 직접 읽기 — 재실행 루프 방지
      const {screenTimeLinkEnabled: linked, setScreenTimeLinkEnabled: setLinked} =
        useSleepStore.getState();
      const status = getAuthorizationStatus();

      // 1) approved → 연동 상태 보장, 모달 불필요
      if (status === 'approved') {
        if (!linked) setLinked(true);
        return;
      }

      // 2) denied → 실제 권한 취소, 연동 해제 + 모달
      if (status === 'denied') {
        if (linked) setLinked(false);
        setShowScreenTimeModal(true);
        return;
      }

      // 3) notDetermined + 이미 연동됨 → 콜드 스타트 초기화 지연, 무시
      if (linked) return;

      // 4) notDetermined + 미연동 → 최초 연동 안내 모달
      setShowScreenTimeModal(true);
    }, []), // 빈 deps: 포커스 이벤트에서만 실행
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

  // 네이티브 컴포넌트용 JSON payload
  const gardenDataJson = useMemo(() => {
    const payload = {
      days: gardenData.map(day => ({
        date: day.date,
        sessions: day.sessions.map(s => ({
          durationMinutes: s.durationMinutes,
          outcome: s.outcome,
          isHealthy: s.isHealthy,
        })),
      })),
    };
    return JSON.stringify(payload);
  }, [gardenData]);

  // HH:mm → 12시간 포맷
  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleMenuSelect = useCallback((key: string) => {
    if (key === 'sleepADHDInfo') {
      navigation.navigate('SleepADHDInfo');
    }
  }, [navigation]);

  const handleStartSession = useCallback(() => {
    navigation.navigate('SleepSession');
  }, [navigation]);

  const handleDateSelect = useCallback((e: {nativeEvent: {date: string}}) => {
    setSelectedDate(e.nativeEvent.date);
  }, [setSelectedDate]);

  const handleHeightChange = useCallback((e: {nativeEvent: {height: number}}) => {
    gardenHeight.value = withSpring(e.nativeEvent.height, {
      damping: 20,
      stiffness: 150,
    });
  }, [gardenHeight]);

  const handleViewModeChange = useCallback((e: {nativeEvent: {mode: string}}) => {
    setViewMode(e.nativeEvent.mode as ViewMode);
  }, []);

  const handleMonthChange = useCallback((e: {nativeEvent: {year: number; month: number}}) => {
    fetchMonthRecords(e.nativeEvent.year, e.nativeEvent.month);
  }, [fetchMonthRecords]);

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <TreePine size={20} color={primaryColor} />
          <Text style={[styles.headerTitle, {flex: 1}]}>수면 정원</Text>
          <LiquidGlassMenu
            systemIconName="ellipsis.circle"
            iconColor="#9CA3AF"
            size={36}
            menuItems={SLEEP_MENU_ITEMS}
            onSelect={handleMenuSelect}
            fallbackIcon={<MoreHorizontal size={18} color="#9CA3AF" />}
          />
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

        {/* 네이티브 수면 정원 */}
        <AnimatedCard enterDelay={200} style={styles.gardenCard}>
          <Animated.View style={gardenAnimatedStyle}>
            <NativeSleepGardenNative
              viewMode={viewMode}
              selectedDate={selectedDate}
              primaryColor={primaryColor}
              gardenData={gardenDataJson}
              goalMinutes={goalMinutes}
              streak={streak}
              onDateSelect={handleDateSelect}
              onHeightChange={handleHeightChange}
              onViewModeChange={handleViewModeChange}
              onMonthChange={handleMonthChange}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
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

        {/* 허용 앱 관리 링크 */}
        {screenTimeLinkEnabled && Platform.OS === 'ios' && (
          <Pressable
            onPress={() => navigation.navigate('ScreenTimeApps')}
            style={styles.screenTimeLink}>
            <Shield size={18} color="#6366F1" />
            <Text style={styles.screenTimeLinkText}>허용 앱 관리</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </Pressable>
        )}

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

  // Garden
  gardenCard: {
    marginBottom: 12,
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

  // Screen time link
  screenTimeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  screenTimeLinkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
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
