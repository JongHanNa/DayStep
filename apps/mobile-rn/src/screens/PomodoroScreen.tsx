/**
 * Pomodoro Timer Screen
 * Skia 원형 프로그레스 + 글로우 + 작업/휴식 토글
 * ADHD: 시간 맹 대응, 시각적 피드백 강화
 */
import React, {useCallback, useEffect, useRef} from 'react';
import {Text, View, StyleSheet} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {useHaptic} from '@/hooks/useHaptic';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTheme} from '@/theme';

function getTimerTypeLabel(type: string): string {
  switch (type) {
    case 'POMODORO':
      return '집중 시간';
    case 'SHORT_BREAK':
      return '짧은 휴식';
    case 'LONG_BREAK':
      return '긴 휴식';
    default:
      return '';
  }
}

function getTimerColor(type: string, primaryColor: string): string {
  switch (type) {
    case 'POMODORO':
      return primaryColor;
    case 'SHORT_BREAK':
      return '#22C55E';
    case 'LONG_BREAK':
      return '#8B5CF6';
    default:
      return primaryColor;
  }
}

// ============================================
// Main Screen
// ============================================

export default function PomodoroScreen() {
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    timerState,
    settings,
    stats,
    consecutivePomodoros,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    tick,
  } = usePomodoroStore();

  // 호흡 애니메이션 (실행 중)
  const breathScale = useSharedValue(1);
  useEffect(() => {
    if (timerState.isRunning) {
      breathScale.value = withRepeat(
        withTiming(1.03, {duration: 2000, easing: Easing.inOut(Easing.ease)}),
        -1,
        true,
      );
    } else {
      breathScale.value = 1;
    }
  }, [timerState.isRunning, breathScale]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{scale: breathScale.value}],
  }));

  // 타이머 인터벌
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState.isRunning, tick]);

  // 완료 시 햅틱
  useEffect(() => {
    if (timerState.status === 'completed') {
      haptic.success();
    }
  }, [timerState.status, haptic]);

  const timerColor = getTimerColor(timerState.timerType, primaryColor);
  const isIdle = timerState.status === 'idle' || timerState.status === 'completed';

  // 다음 세션은 휴식인지 판단
  const nextIsLongBreak =
    consecutivePomodoros > 0 &&
    consecutivePomodoros % settings.longBreakInterval === 0;

  const handleStartPomodoro = useCallback(() => {
    haptic.medium();
    startTimer('POMODORO');
  }, [startTimer, haptic]);

  const handleStartBreak = useCallback(() => {
    haptic.light();
    startTimer(nextIsLongBreak ? 'LONG_BREAK' : 'SHORT_BREAK');
  }, [startTimer, nextIsLongBreak, haptic]);

  const handlePause = useCallback(() => {
    haptic.light();
    pauseTimer();
  }, [pauseTimer, haptic]);

  const handleResume = useCallback(() => {
    haptic.light();
    resumeTimer();
  }, [resumeTimer, haptic]);

  const handleStop = useCallback(() => {
    haptic.warning();
    stopTimer();
  }, [stopTimer, haptic]);

  const RING_SIZE = 280;

  return (
    <ScreenContainer gradient="calmBackground">
      {/* 상단: 타이머 타입 */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>🍅 포모도로</Text>
        <Text style={[styles.timerTypeLabel, {color: timerColor}]}>
          {getTimerTypeLabel(timerState.timerType)}
        </Text>
      </Animated.View>

      {/* 중앙: 타이머 링 */}
      <View style={styles.ringContainer}>
        <Animated.View style={breathStyle}>
          <TimerRing
            progress={timerState.progress}
            size={RING_SIZE}
            strokeWidth={10}
            color={timerColor}
            isRunning={timerState.isRunning}
          />
          {/* 중앙 시간 */}
          <View style={[styles.centerOverlay, {width: RING_SIZE, height: RING_SIZE}]}>
            <Text style={styles.timeDisplay}>
              {formatTime(timerState.remainingTime)}
            </Text>
            {timerState.status === 'running' && (
              <Text style={styles.elapsedLabel}>
                {formatTime(timerState.elapsed)} 경과
              </Text>
            )}
          </View>
        </Animated.View>
      </View>

      {/* 세션 카운터 */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sessionInfo}>
        <View style={styles.sessionChips}>
          {Array.from({length: settings.longBreakInterval}).map((_, i) => (
            <View
              key={i}
              style={[
                styles.sessionDot,
                i < consecutivePomodoros && {backgroundColor: primaryColor},
              ]}
            />
          ))}
        </View>
        <Text style={styles.sessionText}>
          오늘 {stats.todaySessions}세션 · 총 {stats.totalFocusTime}분 집중
        </Text>
      </Animated.View>

      {/* 컨트롤 버튼 */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.controls}>
        {isIdle ? (
          // 유휴 상태
          <View style={styles.idleControls}>
            <AnimatedPressable
              onPress={handleStartPomodoro}
              hapticType="medium"
              scaleValue={0.95}
              style={[styles.primaryBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.primaryBtnText}>
                {timerState.status === 'completed' ? '다음 세션' : '집중 시작'}
              </Text>
            </AnimatedPressable>

            {timerState.status === 'completed' && (
              <AnimatedPressable
                onPress={handleStartBreak}
                hapticType="light"
                scaleValue={0.95}
                style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>
                  {nextIsLongBreak ? '긴 휴식 (15분)' : '짧은 휴식 (5분)'}
                </Text>
              </AnimatedPressable>
            )}
          </View>
        ) : (
          // 실행/일시정지 상태
          <View style={styles.runningControls}>
            {timerState.isPaused ? (
              <AnimatedPressable
                onPress={handleResume}
                hapticType="medium"
                scaleValue={0.95}
                style={[styles.primaryBtn, {backgroundColor: primaryColor}]}>
                <Text style={styles.primaryBtnText}>계속하기</Text>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable
                onPress={handlePause}
                hapticType="light"
                scaleValue={0.95}
                style={styles.pauseBtn}>
                <Text style={styles.pauseBtnText}>일시정지</Text>
              </AnimatedPressable>
            )}

            <AnimatedPressable
              onPress={handleStop}
              hapticType="light"
              scaleValue={0.95}
              style={styles.stopBtn}>
              <Text style={styles.stopBtnText}>중단</Text>
            </AnimatedPressable>
          </View>
        )}
      </Animated.View>

      {/* 하단: 스트릭 정보 */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.streakBar}>
        <View style={styles.streakItem}>
          <Text style={styles.streakNumber}>{stats.currentStreak}</Text>
          <Text style={styles.streakLabel}>연속</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakNumber}>{stats.longestStreak}</Text>
          <Text style={styles.streakLabel}>최장</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakNumber}>{stats.completedSessions}</Text>
          <Text style={styles.streakLabel}>총 완료</Text>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  timerTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  // Ring
  ringContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    fontSize: 52,
    fontWeight: '200',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },
  elapsedLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Session info
  sessionInfo: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  sessionChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sessionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  sessionText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Controls
  controls: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  idleControls: {
    gap: 12,
  },
  runningControls: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  pauseBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
  },
  pauseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  stopBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
  },
  stopBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Streak bar
  streakBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
    gap: 20,
  },
  streakItem: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  streakLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  streakDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
});
