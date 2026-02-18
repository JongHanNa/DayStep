/**
 * FocusTimerBottomSheet — 플래너에서 할일 포커스 타이머
 * @gorhom/bottom-sheet + 공유 TimerRing + pomodoroStore
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {useHaptic} from '@/hooks/useHaptic';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import type {Todo} from '@daystep/shared-core';
import {Minus, Plus, Check, X} from 'lucide-react-native';

export interface FocusTimerBottomSheetRef {
  open: (todo: Todo) => void;
  close: () => void;
}

export const FocusTimerBottomSheet = forwardRef<FocusTimerBottomSheetRef, {}>(
  (_, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['60%', '85%'], []);
    const {primaryColor} = useTheme();
    const haptic = useHaptic();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [todo, setTodo] = useState<Todo | null>(null);

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
      connectTodo,
    } = usePomodoroStore();

    const {toggleTodoCompletion} = useTodoStore();

    useImperativeHandle(ref, () => ({
      open: (t: Todo) => {
        setTodo(t);
        connectTodo(t.id);
        startTimer('POMODORO', t.id);
        sheetRef.current?.snapToIndex(0);
      },
      close: () => {
        if (timerState.isRunning || timerState.isPaused) {
          stopTimer();
        }
        sheetRef.current?.close();
      },
    }));

    // 호흡 애니메이션
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
        intervalRef.current = setInterval(() => tick(), 1000);
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

    const handlePauseResume = useCallback(() => {
      haptic.light();
      if (timerState.isPaused) {
        resumeTimer();
      } else {
        pauseTimer();
      }
    }, [timerState.isPaused, pauseTimer, resumeTimer, haptic]);

    const handleStop = useCallback(() => {
      haptic.warning();
      stopTimer();
      sheetRef.current?.close();
    }, [stopTimer, haptic]);

    const handleComplete = useCallback(() => {
      haptic.success();
      if (todo) {
        toggleTodoCompletion(todo.id);
      }
      stopTimer();
      sheetRef.current?.close();
    }, [todo, toggleTodoCompletion, stopTimer, haptic]);

    const handleAdjustTime = useCallback(
      (delta: number) => {
        haptic.light();
        // 시간 조정: pomodoroStore에서는 직접 지원하지 않으므로 설정 변경 방식 사용은 복잡
        // 간단한 접근: stopTimer → startTimer with adjusted duration은 상태 초기화 문제
        // 현 구현에서는 UX 참고용으로만 표시
      },
      [haptic],
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
      ),
      [],
    );

    const isIdle = timerState.status === 'idle' || timerState.status === 'completed';
    const RING_SIZE = 220;

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{backgroundColor: '#D1D5DB'}}
        onClose={() => {
          if (timerState.isRunning || timerState.isPaused) {
            stopTimer();
          }
        }}>
        <BottomSheetView style={styles.container}>
          {/* 할일 제목 */}
          {todo && (
            <View style={styles.todoHeader}>
              <Text style={styles.todoTitle} numberOfLines={2}>
                {todo.title}
              </Text>
              <Text style={styles.timerTypeLabel}>
                집중 시간 · {settings.pomodoroDuration}분
              </Text>
            </View>
          )}

          {/* 타이머 링 */}
          <View style={styles.ringContainer}>
            <Animated.View style={breathStyle}>
              <TimerRing
                progress={timerState.progress}
                size={RING_SIZE}
                strokeWidth={8}
                color={primaryColor}
                isRunning={timerState.isRunning}
              />
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
          <View style={styles.sessionRow}>
            <View style={styles.sessionDots}>
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
              오늘 {stats.todaySessions}세션
            </Text>
          </View>

          {/* 컨트롤 */}
          <View style={styles.controls}>
            {isIdle ? (
              <View style={styles.completedControls}>
                <AnimatedPressable
                  onPress={handleComplete}
                  haptic={false}
                  scaleValue={0.95}
                  style={[styles.completeBtn, {backgroundColor: primaryColor}]}>
                  <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.completeBtnText}>할일 완료</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={handleStop}
                  haptic={false}
                  scaleValue={0.95}
                  style={styles.dismissBtn}>
                  <Text style={styles.dismissBtnText}>닫기</Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View style={styles.runningControls}>
                <AnimatedPressable
                  onPress={handlePauseResume}
                  haptic={false}
                  scaleValue={0.95}
                  style={[
                    styles.mainBtn,
                    {
                      backgroundColor: timerState.isPaused ? primaryColor : '#FEF3C7',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.mainBtnText,
                      {color: timerState.isPaused ? '#FFFFFF' : '#92400E'},
                    ]}>
                    {timerState.isPaused ? '계속하기' : '일시정지'}
                  </Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleStop}
                  haptic={false}
                  scaleValue={0.95}
                  style={styles.stopBtn}>
                  <X size={18} color="#EF4444" strokeWidth={2.5} />
                </AnimatedPressable>
              </View>
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  todoHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  todoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  timerTypeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    fontSize: 44,
    fontWeight: '200',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },
  elapsedLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sessionDots: {
    flexDirection: 'row',
    gap: 6,
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  sessionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  controls: {
    width: '100%',
    paddingBottom: 20,
  },
  runningControls: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  mainBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  stopBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedControls: {
    gap: 10,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  completeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});
