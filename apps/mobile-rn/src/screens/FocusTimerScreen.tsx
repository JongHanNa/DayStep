/**
 * FocusTimerScreen — 풀스크린 카운트다운 타이머
 * 할일 집중 / 빠른 집중 모드 공통 사용
 * 배경 그라데이션 + 큰 타이머 링 + 컨트롤 버튼
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {useNavigation, useRoute} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedPressable} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {useHaptic} from '@/hooks/useHaptic';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTodoStore} from '@/stores/todoStore';

// ============================================
// Constants & Types
// ============================================

const MINT = '#14B8A6';
const MINT_DARK = '#0D9488';
const VIOLET = '#8B5CF6';
const VIOLET_DARK = '#7C3AED';

type FocusTimerParams = {
  mode: 'todo' | 'quick';
  todoId?: string;
  todoTitle?: string;
  durationSeconds: number;
};

type TimerStatus = 'ready' | 'running' | 'paused' | 'completed';

// ============================================
// Celebration Overlay
// ============================================

function CelebrationOverlay({onDismiss}: {onDismiss: () => void}) {
  return (
    <Animated.View
      entering={ZoomIn.duration(400).springify()}
      exiting={FadeOut.duration(300)}
      style={styles.celebrationOverlay}>
      <Text style={styles.celebrationEmoji}>🎉</Text>
      <Text style={styles.celebrationTitle}>집중 완료!</Text>
      <Text style={styles.celebrationSubtitle}>정말 잘했어요</Text>
      <AnimatedPressable
        onPress={onDismiss}
        hapticType="medium"
        style={styles.celebrationBtn}>
        <Text style={styles.celebrationBtnText}>확인</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ============================================
// Quick Focus Note Prompt
// ============================================

function QuickNotePrompt({
  onSave,
  onSkip,
}: {
  onSave: (text: string) => void;
  onSkip: () => void;
}) {
  const [text, setText] = useState('');

  return (
    <Animated.View
      entering={FadeInUp.duration(400)}
      style={styles.notePromptContainer}>
      <Text style={styles.notePromptTitle}>방금 무슨 일을 했나요?</Text>
      <Text style={styles.notePromptSubtitle}>
        간단히 기록해두면 나중에 도움이 돼요
      </Text>
      <TextInput
        style={styles.noteInput}
        placeholder="예: 이메일 정리, 아이디어 정리..."
        placeholderTextColor="#9CA3AF"
        value={text}
        onChangeText={setText}
        multiline={false}
        returnKeyType="done"
        onSubmitEditing={() => text.trim() && onSave(text.trim())}
      />
      <View style={styles.noteButtons}>
        <AnimatedPressable
          onPress={onSkip}
          hapticType="light"
          style={styles.noteSkipBtn}>
          <Text style={styles.noteSkipText}>건너뛰기</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => text.trim() && onSave(text.trim())}
          hapticType="medium"
          style={[styles.noteSaveBtn, !text.trim() && {opacity: 0.4}]}
          disabled={!text.trim()}>
          <Text style={styles.noteSaveText}>저장</Text>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

// ============================================
// Main Screen
// ============================================

export default function FocusTimerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const haptic = useHaptic();
  const params = route.params as FocusTimerParams;

  const {mode, todoId, todoTitle, durationSeconds} = params;
  const isTodo = mode === 'todo';
  const activeColor = isTodo ? MINT : VIOLET;
  const gradientColors = isTodo
    ? ['#CCFBF1', '#F0FDFA', '#FFFFFF']
    : ['#EDE9FE', '#F5F3FF', '#FFFFFF'];

  // Timer state
  const [status, setStatus] = useState<TimerStatus>('ready');
  const [remainingTime, setRemainingTime] = useState(durationSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {completeSession, startTimer: pomodoroStart} = usePomodoroStore();
  const {toggleTodoCompletion} = useTodoStore();

  const progress = durationSeconds > 0 ? elapsed / durationSeconds : 0;

  // 호흡 애니메이션 (실행 중)
  const breathScale = useSharedValue(1);
  useEffect(() => {
    if (status === 'running') {
      breathScale.value = withRepeat(
        withTiming(1.03, {duration: 2000, easing: Easing.inOut(Easing.ease)}),
        -1,
        true,
      );
    } else {
      breathScale.value = withTiming(1, {duration: 300});
    }
  }, [status, breathScale]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{scale: breathScale.value}],
  }));

  // 자동 시작
  useEffect(() => {
    startFocus();
  }, []);

  // 타이머 인터벌
  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  const startFocus = useCallback(() => {
    setStatus('running');
    haptic.medium();
  }, [haptic]);

  const handlePause = useCallback(() => {
    setStatus('paused');
    haptic.light();
  }, [haptic]);

  const handleResume = useCallback(() => {
    setStatus('running');
    haptic.light();
  }, [haptic]);

  const handleComplete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('completed');
    Vibration.vibrate([0, 200, 100, 200]);
    haptic.success();

    // 포모도로 세션 기록
    pomodoroStart('POMODORO', todoId);
    // elapsed를 전체 duration으로 강제 설정하여 completeSession이 제대로 동작하도록
    usePomodoroStore.setState(state => ({
      timerState: {
        ...state.timerState,
        isRunning: false,
        elapsed: durationSeconds,
        remainingTime: 0,
        progress: 1,
        duration: durationSeconds,
        status: 'completed',
      },
    }));
    usePomodoroStore.getState().completeSession();

    // 할일 집중이면 할일 완료 처리
    if (isTodo && todoId) {
      toggleTodoCompletion(todoId);
      setShowCelebration(true);
    } else {
      // 빠른 집중이면 노트 프롬프트
      setShowCelebration(true);
    }
  }, [haptic, isTodo, todoId, durationSeconds, toggleTodoCompletion, pomodoroStart]);

  const handleStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    haptic.warning();
    navigation.goBack();
  }, [haptic, navigation]);

  const handleMarkComplete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    haptic.success();

    // 세션 기록
    if (elapsed > 0) {
      pomodoroStart('POMODORO', todoId);
      usePomodoroStore.setState(state => ({
        timerState: {
          ...state.timerState,
          isRunning: false,
          elapsed,
          remainingTime: 0,
          progress: 1,
          duration: durationSeconds,
          status: 'completed',
        },
      }));
      usePomodoroStore.getState().completeSession();
    }

    // 할일 완료
    if (isTodo && todoId) {
      toggleTodoCompletion(todoId);
    }

    setStatus('completed');
    setShowCelebration(true);
  }, [haptic, elapsed, isTodo, todoId, durationSeconds, toggleTodoCompletion, pomodoroStart]);

  const handleCelebrationDismiss = useCallback(() => {
    setShowCelebration(false);
    if (!isTodo) {
      setShowNotePrompt(true);
    } else {
      navigation.goBack();
    }
  }, [isTodo, navigation]);

  const handleNoteSave = useCallback(
    (_text: string) => {
      // TODO: 나중에 노트 저장 로직 추가
      navigation.goBack();
    },
    [navigation],
  );

  const handleNoteSkip = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const RING_SIZE = 280;

  return (
    <LinearGradient colors={gradientColors} style={styles.flex}>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          {/* 닫기 버튼 */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.topBar}>
            <AnimatedPressable
              onPress={handleStop}
              hapticType="light"
              style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </AnimatedPressable>
          </Animated.View>

          {/* 할일 이름 또는 "집중 중..." */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.titleArea}>
            <Text style={styles.focusTitle} numberOfLines={2}>
              {isTodo && todoTitle ? todoTitle : '집중 중...'}
            </Text>
          </Animated.View>

          {/* 큰 타이머 링 */}
          <View style={styles.ringContainer}>
            <Animated.View style={breathStyle}>
              <TimerRing
                progress={progress}
                size={RING_SIZE}
                strokeWidth={10}
                color={activeColor}
                isRunning={status === 'running'}
              />
              <View style={[styles.centerOverlay, {width: RING_SIZE, height: RING_SIZE}]}>
                <Text style={styles.timeDisplay}>
                  {formatTime(remainingTime)}
                </Text>
                {status === 'running' && (
                  <Text style={styles.elapsedLabel}>
                    {formatTime(elapsed)} 경과
                  </Text>
                )}
                {status === 'paused' && (
                  <Text style={[styles.elapsedLabel, {color: '#F59E0B'}]}>
                    일시정지
                  </Text>
                )}
              </View>
            </Animated.View>
          </View>

          {/* 컨트롤 버튼 */}
          {status !== 'completed' && !showNotePrompt && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.controls}>
              <View style={styles.controlRow}>
                {/* 종료 */}
                <AnimatedPressable
                  onPress={handleStop}
                  hapticType="medium"
                  scaleValue={0.9}
                  style={styles.controlBtn}>
                  <Text style={styles.controlIcon}>⏹</Text>
                  <Text style={styles.controlLabel}>종료</Text>
                </AnimatedPressable>

                {/* 재생/일시정지 */}
                {status === 'running' ? (
                  <AnimatedPressable
                    onPress={handlePause}
                    hapticType="light"
                    scaleValue={0.9}
                    style={[styles.controlBtnLarge, {backgroundColor: activeColor}]}>
                    <Text style={styles.controlIconLarge}>⏸</Text>
                  </AnimatedPressable>
                ) : (
                  <AnimatedPressable
                    onPress={handleResume}
                    hapticType="medium"
                    scaleValue={0.9}
                    style={[styles.controlBtnLarge, {backgroundColor: activeColor}]}>
                    <Text style={styles.controlIconLarge}>▶</Text>
                  </AnimatedPressable>
                )}

                {/* 완료 */}
                <AnimatedPressable
                  onPress={handleMarkComplete}
                  hapticType="medium"
                  scaleValue={0.9}
                  style={styles.controlBtn}>
                  <Text style={styles.controlIcon}>✓</Text>
                  <Text style={styles.controlLabel}>완료</Text>
                </AnimatedPressable>
              </View>
            </Animated.View>
          )}

          {/* 빠른 집중 노트 프롬프트 */}
          {showNotePrompt && (
            <QuickNotePrompt onSave={handleNoteSave} onSkip={handleNoteSkip} />
          )}

          {/* 축하 오버레이 */}
          {showCelebration && (
            <CelebrationOverlay onDismiss={handleCelebrationDismiss} />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '300',
  },

  // Title
  titleArea: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 8,
  },
  focusTitle: {
    fontSize: 20,
    fontWeight: '600',
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

  // Controls
  controls: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  controlIcon: {
    fontSize: 22,
    color: '#6B7280',
  },
  controlLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  controlBtnLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  controlIconLarge: {
    fontSize: 28,
    color: '#FFFFFF',
  },

  // Celebration
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  celebrationBtn: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 16,
  },
  celebrationBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Quick note prompt
  notePromptContainer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    alignItems: 'center',
  },
  notePromptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  notePromptSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  noteInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  noteButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  noteSkipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  noteSkipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  noteSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: VIOLET,
    alignItems: 'center',
  },
  noteSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
