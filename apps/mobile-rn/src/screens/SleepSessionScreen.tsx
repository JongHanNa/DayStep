/**
 * SleepSessionScreen — 실시간 수면 세션 화면
 * 다크 그라디언트 + TimerRing + 호흡 애니메이션
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, AppState} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {TreePine} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {TimerRing} from '@/components/core/TimerRing';
import {AbandonConfirmModal} from '@/components/sleep/AbandonConfirmModal';
import {useHaptic} from '@/hooks/useHaptic';
import {useSleepStore} from '@/stores/sleepStore';
import {useTheme} from '@/theme';
import {differenceInSeconds} from 'date-fns';

const RING_SIZE = 280;
const TEAL = '#059669';

function formatCurrentTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '목표 달성!';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `기상까지 ${h}h ${m}m`;
  return `기상까지 ${m}m`;
}

export default function SleepSessionScreen() {
  const navigation = useNavigation<any>();
  const {primaryColor} = useTheme();
  const haptic = useHaptic();

  const {
    sessionState,
    startSleepSession,
    completeSleepSession,
    abandonSleepSession,
  } = useSleepStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [goalReached, setGoalReached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 세션 시작 (idle 상태에서 진입 시)
  useFocusEffect(
    useCallback(() => {
      const state = useSleepStore.getState().sessionState;
      if (state.status === 'idle') {
        startSleepSession();
      }
    }, [startSleepSession]),
  );

  // 호흡 애니메이션 (수면용 느린 4초)
  const breathScale = useSharedValue(1);
  useEffect(() => {
    if (sessionState.status === 'running') {
      breathScale.value = withRepeat(
        withTiming(1.03, {duration: 4000, easing: Easing.inOut(Easing.ease)}),
        -1,
        true,
      );
    } else {
      breathScale.value = 1;
    }
  }, [sessionState.status, breathScale]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{scale: breathScale.value}],
  }));

  // 타이머 갱신 (매초)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // progress 계산
  useEffect(() => {
    if (sessionState.status !== 'running' || !sessionState.startedAt) return;

    const startedAt = new Date(sessionState.startedAt);
    const elapsed = differenceInSeconds(currentTime, startedAt);
    const goalSeconds = sessionState.goalDurationMinutes * 60;
    const newProgress = Math.min(elapsed / goalSeconds, 1);
    setProgress(newProgress);

    if (newProgress >= 1 && !goalReached) {
      setGoalReached(true);
      haptic.success();
    }
  }, [currentTime, sessionState, goalReached, haptic]);

  // AppState 리스너: foreground 복귀 시 즉시 재계산
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setCurrentTime(new Date());
      }
    });
    return () => subscription.remove();
  }, []);

  // 남은 시간 계산
  const remainingSeconds = sessionState.startedAt
    ? Math.max(
        sessionState.goalDurationMinutes * 60 -
          differenceInSeconds(currentTime, new Date(sessionState.startedAt)),
        0,
      )
    : 0;

  const handleComplete = useCallback(async () => {
    haptic.success();
    await completeSleepSession();
    navigation.goBack();
  }, [completeSleepSession, navigation, haptic]);

  const handleAbandon = useCallback(async () => {
    setShowAbandonModal(false);
    haptic.warning();
    await abandonSleepSession();
    navigation.goBack();
  }, [abandonSleepSession, navigation, haptic]);

  const timerColor = goalReached ? '#22C55E' : TEAL;

  return (
    <ScreenContainer
      gradientColors={['#065F46', '#0F172A']}
      statusBarStyle="light-content"
      edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* 상단 여백 */}
        <View style={styles.topSpacer} />

        {/* 중앙: TimerRing */}
        <View style={styles.ringContainer}>
          <Animated.View style={breathStyle}>
            <TimerRing
              progress={progress}
              size={RING_SIZE}
              strokeWidth={10}
              color={timerColor}
              isRunning={sessionState.status === 'running'}
            />
            {/* 중앙 오버레이 */}
            <View style={[styles.centerOverlay, {width: RING_SIZE, height: RING_SIZE}]}>
              <TreePine size={64} color="rgba(255,255,255,0.8)" />
            </View>
          </Animated.View>
        </View>

        {/* 현재 시간 */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.timeContainer}>
          <Text style={styles.timeDisplay}>{formatCurrentTime(currentTime)}</Text>
          <Text style={styles.statusText}>
            {goalReached ? '목표 달성!' : '수면 중'}
          </Text>
          <Text style={styles.remainingText}>
            {goalReached ? '기상해도 좋아요' : formatRemainingTime(remainingSeconds)}
          </Text>
        </Animated.View>

        {/* 하단 버튼 */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.bottomControls}>
          {goalReached ? (
            <AnimatedPressable
              onPress={handleComplete}
              hapticType="medium"
              scaleValue={0.95}
              style={[styles.wakeUpBtn, {backgroundColor: '#22C55E'}]}>
              <Text style={styles.wakeUpBtnText}>기상하기</Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable
              onPress={() => setShowAbandonModal(true)}
              hapticType="light"
              scaleValue={0.95}
              style={styles.abandonBtn}>
              <Text style={styles.abandonBtnText}>포기</Text>
            </AnimatedPressable>
          )}
        </Animated.View>
      </View>

      {/* 포기 확인 모달 */}
      <AbandonConfirmModal
        visible={showAbandonModal}
        onContinue={() => setShowAbandonModal(false)}
        onAbandon={handleAbandon}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSpacer: {
    height: 40,
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

  // Time display
  timeContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  timeDisplay: {
    fontSize: 52,
    fontWeight: '300',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  remainingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },

  // Controls
  bottomControls: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  abandonBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  abandonBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  wakeUpBtn: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  wakeUpBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
