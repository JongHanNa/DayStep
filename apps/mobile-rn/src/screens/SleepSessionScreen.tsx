/**
 * SleepSessionScreen — 실시간 수면 세션 화면
 * 다크 그라디언트 + TimerRing + 호흡 애니메이션
 *
 * Phase 2: 네이티브 기상 버튼 + ActionSheetIOS 포기 확인
 * Phase 4: 스크린타임 바이패스 감지
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, AppState, ActionSheetIOS, Platform} from 'react-native';
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
import {NativeSleepActionButton} from '@/components/native';
import {useHaptic} from '@/hooks/useHaptic';
import {useSleepStore} from '@/stores/sleepStore';
import {useTheme} from '@/theme';
import {differenceInSeconds} from 'date-fns';
import {getAuthorizationStatus} from '@/lib/screenTimeManager';

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
    screenTimeLinkEnabled,
    startSleepSession,
    completeSleepSession,
    abandonSleepSession,
  } = useSleepStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [goalReached, setGoalReached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(0);

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

  // 타이머 갱신 (매초) + 스크린타임 바이패스 감지 (30초마다)
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      setCurrentTime(new Date());

      // Phase 4: 30초마다 스크린타임 권한 체크
      tickRef.current += 1;
      if (tickRef.current % 30 === 0 && screenTimeLinkEnabled) {
        try {
          const status = await getAuthorizationStatus();
          if (status !== 'approved') {
            await abandonSleepSession();
            navigation.goBack();
          }
        } catch {
          // 스크린타임 체크 실패 시 무시 (세션 유지)
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [screenTimeLinkEnabled, abandonSleepSession, navigation]);

  // progress 계산 (expectedWakeTime 기반)
  useEffect(() => {
    if (sessionState.status !== 'running' || !sessionState.startedAt || !sessionState.expectedWakeTime) return;

    const startedAt = new Date(sessionState.startedAt);
    const expectedWake = new Date(sessionState.expectedWakeTime);
    const totalSeconds = differenceInSeconds(expectedWake, startedAt);
    const elapsed = differenceInSeconds(currentTime, startedAt);
    const newProgress = totalSeconds > 0 ? Math.min(Math.max(elapsed / totalSeconds, 0), 1) : 0;
    setProgress(newProgress);

    if (currentTime >= expectedWake && !goalReached) {
      setGoalReached(true);
      haptic.success();
    }
  }, [currentTime, sessionState, goalReached, haptic]);

  // AppState 리스너: foreground 복귀 시 즉시 재계산 + 스크린타임 체크
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        setCurrentTime(new Date());

        // Phase 4: foreground 복귀 시 스크린타임 권한 체크
        if (screenTimeLinkEnabled) {
          try {
            const status = await getAuthorizationStatus();
            if (status !== 'approved') {
              await abandonSleepSession();
              navigation.goBack();
            }
          } catch {
            // 체크 실패 시 무시
          }
        }
      }
    });
    return () => subscription.remove();
  }, [screenTimeLinkEnabled, abandonSleepSession, navigation]);

  // 남은 시간 계산 (expectedWakeTime 기반)
  const remainingSeconds = sessionState.expectedWakeTime
    ? Math.max(differenceInSeconds(new Date(sessionState.expectedWakeTime), currentTime), 0)
    : 0;

  const handleComplete = useCallback(async () => {
    haptic.success();
    await completeSleepSession();
    navigation.goBack();
  }, [completeSleepSession, navigation, haptic]);

  // Phase 2B: 네이티브 ActionSheet로 포기 확인
  const showAbandonSheet = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['계속 자기', '포기하기'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: '정말 포기할까요?',
          message: '수면 기록이 실패로 저장됩니다',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            haptic.warning();
            await abandonSleepSession();
            navigation.goBack();
          }
        },
      );
    }
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
            {goalReached ? '목표 수면 달성!' : '수면시간이에요'}
          </Text>
          {!goalReached && (
            <Text style={styles.guideText}>
              {'과몰입하던 일을 멈추고\n소등 후 취침하세요'}
            </Text>
          )}
          <Text style={styles.remainingText}>
            {goalReached ? '기상해도 좋아요 ☀️' : formatRemainingTime(remainingSeconds)}
          </Text>
        </Animated.View>

        {/* 하단 버튼 */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.bottomControls}>
          {goalReached ? (
            <NativeSleepActionButton
              title="기상하기"
              backgroundColor="#22C55E"
              onPress={handleComplete}
            />
          ) : (
            <AnimatedPressable
              onPress={showAbandonSheet}
              hapticType="light"
              scaleValue={0.95}
              style={styles.abandonBtn}>
              <Text style={styles.abandonBtnText}>포기</Text>
            </AnimatedPressable>
          )}
        </Animated.View>
      </View>
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
  guideText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 6,
    textAlign: 'center' as const,
    lineHeight: 18,
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
});
