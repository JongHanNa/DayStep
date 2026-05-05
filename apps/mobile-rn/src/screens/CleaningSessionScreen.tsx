/**
 * CleaningSessionScreen — 전체화면 청소 포커스 모드
 * SleepSessionScreen 패턴 참조: warmBackground 그라디언트 + 큰 TimerRing + 서브태스크
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, ActionSheetIOS, Platform} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {Pause, Play, Check, RotateCcw} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {useHaptic} from '@/hooks/useHaptic';
import {useCleaningStore} from '@/stores/cleaningStore';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

const RING_SIZE = 280;

export default function CleaningSessionScreen() {
  const navigation = useNavigation<any>();
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    focusTaskId,
    timerSeconds,
    timerTotalSeconds,
    isTimerRunning,
    tickTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    completeCleaningSession,
    abandonCleaningSession,
    toggleTaskCompletion,
    setFocusTask,
    isTaskCompleted,
    getAllTasks,
    getFilteredTasks,
    getOrderedTasks,
  } = useCleaningStore();

  // 태스크 찾기
  const allTasks = getAllTasks();
  const focusTask = allTasks.find(t => t.id === focusTaskId) ?? null;

  // 서브태스크 체크 상태
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCheckedSteps(new Set());
  }, [focusTaskId]);

  // 타이머 interval
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => tickTimer(), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, tickTimer]);

  const progress = timerTotalSeconds > 0
    ? 1 - timerSeconds / timerTotalSeconds
    : 0;

  const toggleStep = (index: number) => {
    haptic.light();
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const subtasks = focusTask?.subtasks;
  const hasSubtasks = subtasks && subtasks.length > 0;
  const allChecked = hasSubtasks && checkedSteps.size === subtasks.length;

  // 완료 핸들러
  const handleComplete = useCallback(async () => {
    if (!focusTask) return;
    haptic.success();
    resetTimer();
    toggleTaskCompletion(focusTask.id);
    await completeCleaningSession();

    // 다음 태스크로 이동
    const {dailyRoutine, zoneFocus, digitalTasks, belongingsTasks} = getOrderedTasks();
    const allOrderedTasks = [...zoneFocus, ...digitalTasks, ...belongingsTasks, ...dailyRoutine];
    const nextUncompleted = allOrderedTasks.find(
      t => t.id !== focusTask.id && !isTaskCompleted(t.id),
    );
    setFocusTask(nextUncompleted?.id ?? null);
    navigation.goBack();
  }, [focusTask, resetTimer, toggleTaskCompletion, completeCleaningSession, getOrderedTasks, isTaskCompleted, setFocusTask, navigation, haptic]);

  // 포기 ActionSheet
  const showAbandonSheet = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['계속하기', '포기하기'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: '청소를 포기할까요?',
          message: '타이머가 리셋됩니다',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            haptic.warning();
            resetTimer();
            await abandonCleaningSession();
            navigation.goBack();
          }
        },
      );
    }
  }, [abandonCleaningSession, resetTimer, navigation, haptic]);

  useEffect(() => {
    if (!focusTask) {
      navigation.goBack();
    }
  }, [focusTask, navigation]);

  if (!focusTask) {
    return null;
  }

  return (
    <ScreenContainer
      statusBarStyle="dark-content"
      edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* 상단: 태스크 정보 */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.category}>{focusTask.category}</Text>
          <Text style={styles.title}>{focusTask.title}</Text>
        </Animated.View>

        {/* 중앙: TimerRing */}
        <View style={styles.ringContainer}>
          <View>
            <TimerRing
              progress={progress}
              size={RING_SIZE}
              strokeWidth={10}
              color={primaryColor}
              isRunning={isTimerRunning}
            />
            <View style={[styles.centerOverlay, {width: RING_SIZE, height: RING_SIZE}]}>
              <Text style={styles.timerText}>{formatTime(timerSeconds)}</Text>
            </View>
          </View>
        </View>

        {/* 서브태스크 체크리스트 */}
        {hasSubtasks && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.subtaskContainer}>
            {allChecked && (
              <Text style={[styles.allDoneText, {color: primaryColor}]}>
                모든 단계 완료!
              </Text>
            )}
            {subtasks.map((step, index) => {
              const isChecked = checkedSteps.has(index);
              return (
                <AnimatedPressable
                  key={index}
                  hapticType="light"
                  onPress={() => toggleStep(index)}
                  style={styles.subtaskRow}>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: isChecked ? primaryColor : '#D1D5DB',
                        backgroundColor: isChecked ? primaryColor : 'transparent',
                      },
                    ]}>
                    {isChecked && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text
                    style={[
                      styles.subtaskText,
                      {
                        color: isChecked ? '#9CA3AF' : '#374151',
                        textDecorationLine: isChecked ? 'line-through' : 'none',
                      },
                    ]}>
                    {index + 1}. {step}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </Animated.View>
        )}

        {/* 하단 버튼 */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.bottomControls}>
          <View style={styles.buttonRow}>
            {/* 일시정지/재개 */}
            <AnimatedPressable
              hapticType="light"
              onPress={isTimerRunning ? pauseTimer : resumeTimer}
              style={[
                styles.primaryBtn,
                {backgroundColor: isTimerRunning ? hexWithOpacity(primaryColor, 0.15) : primaryColor},
              ]}>
              {isTimerRunning ? (
                <>
                  <Pause size={18} color={primaryColor} />
                  <Text style={[styles.btnText, {color: primaryColor}]}>일시정지</Text>
                </>
              ) : (
                <>
                  <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={[styles.btnText, {color: '#FFFFFF'}]}>재개</Text>
                </>
              )}
            </AnimatedPressable>

            {/* 완료 */}
            <AnimatedPressable
              hapticType="success"
              onPress={handleComplete}
              style={styles.completeBtn}>
              <Check size={18} color="#FFFFFF" strokeWidth={3} />
            </AnimatedPressable>

            {/* 리셋 */}
            <AnimatedPressable
              hapticType="selection"
              onPress={showAbandonSheet}
              style={styles.resetBtn}>
              <RotateCcw size={18} color="#6B7280" />
            </AnimatedPressable>
          </View>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
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
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },

  // Subtasks
  subtaskContainer: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  allDoneText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
  },

  // Controls
  bottomControls: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 32,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  completeBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
