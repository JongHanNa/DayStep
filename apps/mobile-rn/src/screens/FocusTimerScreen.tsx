/**
 * FocusTimerScreen — 풀스크린 카운트다운 타이머
 * 할일 집중 / 빠른 집중 모드 공통 사용
 * 배경 그라데이션 + 큰 타이머 링 + 컨트롤 버튼
 *
 * params가 있으면 → 새 세션 시작 (startFocusTimer)
 * params가 없으면 → 기존 세션 이어감 (store의 timerState 사용)
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Sparkles, Square, Pause, Play, Check} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {useHaptic} from '@/hooks/useHaptic';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';

// ============================================
// Constants & Types
// ============================================

const VIOLET = '#8B5CF6';

type FocusTimerParams = {
  mode: 'todo' | 'quick';
  todoId?: string;
  todoTitle?: string;
  durationSeconds: number;
};

// ============================================
// Celebration Overlay
// ============================================

function CelebrationOverlay({onDismiss}: {onDismiss: () => void}) {
  return (
    <Animated.View
      entering={ZoomIn.duration(400).springify()}
      exiting={FadeOut.duration(300)}
      style={styles.celebrationOverlay}>
      <View style={styles.celebrationIconWrap}>
        <Sparkles size={56} color="#F59E0B" />
      </View>
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
  const {primaryColor} = useTheme();
  const params = route.params as FocusTimerParams | undefined;
  const insets = useSafeAreaInsets();

  // pomodoroStore 구독
  const {
    timerState,
    focusMode,
    focusTodoTitle,
    connectedTodoId,
    tick,
    pauseTimer,
    resumeTimer,
    stopTimer,
    startFocusTimer,
    completeSession,
  } = usePomodoroStore();
  const {toggleTodoCompletion} = useTodoStore();

  const [showCelebration, setShowCelebration] = useState(false);
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);
  const completedModeRef = useRef<'todo' | 'quick' | null>(null);

  // 새 세션 시작 또는 기존 세션 이어감
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (params?.durationSeconds) {
      // params가 있으면 → 새 세션 시작
      startFocusTimer(
        params.durationSeconds,
        params.mode,
        params.todoId,
        params.todoTitle,
      );
      haptic.medium();
    }
    // params가 없으면 → 기존 세션 이어감 (store 상태 그대로 사용)
  }, []);

  // 현재 모드/색상은 store에서 가져옴
  const isTodo = focusMode === 'todo';
  const activeColor = isTodo ? primaryColor : VIOLET;
  const gradientColors = isTodo
    ? ['#DBEAFE', '#EFF6FF', '#FFFFFF']
    : ['#EDE9FE', '#F5F3FF', '#FFFFFF'];

  const displayTitle = isTodo && focusTodoTitle ? focusTodoTitle : '집중 중...';

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
      breathScale.value = withTiming(1, {duration: 300});
    }
  }, [timerState.isRunning, breathScale]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{scale: breathScale.value}],
  }));

  // tick 인터벌 — store의 isRunning 감시
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        tick();
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
  }, [timerState.isRunning, tick]);

  // 타이머 완료 감지
  useEffect(() => {
    if (timerState.status === 'completed' && timerState.remainingTime <= 0 && timerState.elapsed > 0) {
      if (!showCelebration && !showNotePrompt) {
        completedModeRef.current = focusMode;
        Vibration.vibrate([0, 200, 100, 200]);
        haptic.success();
        if (isTodo && connectedTodoId) {
          toggleTodoCompletion(connectedTodoId);
        }
        setShowCelebration(true);
      }
    }
  }, [timerState.status]);

  // X 버튼 — 세션 유지하고 뒤로가기
  const handleClose = useCallback(() => {
    haptic.light();
    navigation.goBack();
  }, [haptic, navigation]);

  // 종료(⏹) 버튼 — 세션 완전 종료
  const handleStop = useCallback(() => {
    haptic.warning();
    stopTimer();
    navigation.goBack();
  }, [haptic, stopTimer, navigation]);

  // 일시정지
  const handlePause = useCallback(() => {
    pauseTimer();
    haptic.light();
  }, [pauseTimer, haptic]);

  // 재개
  const handleResume = useCallback(() => {
    resumeTimer();
    haptic.light();
  }, [resumeTimer, haptic]);

  // 완료(✓) 버튼 — 세션 기록 + 할일 완료
  const handleMarkComplete = useCallback(() => {
    haptic.success();
    completedModeRef.current = focusMode;

    // store의 completeSession으로 세션 기록
    if (timerState.elapsed > 0 || timerState.isRunning) {
      // 먼저 타이머를 completed 상태로 설정
      usePomodoroStore.setState(state => ({
        timerState: {
          ...state.timerState,
          isRunning: false,
          isPaused: false,
          remainingTime: 0,
          progress: 1,
          status: 'completed',
        },
      }));
      completeSession();
    }

    // 할일 완료
    if (isTodo && connectedTodoId) {
      toggleTodoCompletion(connectedTodoId);
    }

    setShowCelebration(true);
  }, [haptic, timerState.elapsed, timerState.isRunning, isTodo, connectedTodoId, toggleTodoCompletion, completeSession]);

  const handleCelebrationDismiss = useCallback(() => {
    setShowCelebration(false);
    if (completedModeRef.current !== 'todo') {
      setShowNotePrompt(true);
    } else {
      navigation.goBack();
    }
  }, [navigation]);

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

  const isRunningOrPaused = timerState.isRunning || timerState.isPaused;
  const RING_SIZE = 280;

  return (
    <LinearGradient colors={gradientColors} style={styles.flex}>
      <View style={[styles.flex, {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          {/* 닫기(X) 버튼 — 세션 유지 */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.topBar}>
            <AnimatedPressable
              onPress={handleClose}
              hapticType="light"
              style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </AnimatedPressable>
          </Animated.View>

          {/* 할일 이름 또는 "집중 중..." */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.titleArea}>
            <Text style={styles.focusTitle} numberOfLines={2}>
              {displayTitle}
            </Text>
          </Animated.View>

          {/* 큰 타이머 링 */}
          <View style={styles.ringContainer}>
            <Animated.View style={breathStyle}>
              <TimerRing
                progress={timerState.progress}
                size={RING_SIZE}
                strokeWidth={10}
                color={activeColor}
                isRunning={timerState.isRunning}
              />
              <View style={[styles.centerOverlay, {width: RING_SIZE, height: RING_SIZE}]}>
                <Text style={styles.timeDisplay}>
                  {formatTime(timerState.remainingTime)}
                </Text>
                {timerState.isRunning && (
                  <Text style={styles.elapsedLabel}>
                    {formatTime(timerState.elapsed)} 경과
                  </Text>
                )}
                {timerState.isPaused && (
                  <Text style={[styles.elapsedLabel, {color: '#F59E0B'}]}>
                    일시정지
                  </Text>
                )}
              </View>
            </Animated.View>
          </View>

          {/* 컨트롤 버튼 */}
          {isRunningOrPaused && !showNotePrompt && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.controls}>
              <View style={styles.controlRow}>
                {/* 종료(⏹) — 세션 완전 종료 */}
                <AnimatedPressable
                  onPress={handleStop}
                  hapticType="medium"
                  scaleValue={0.9}
                  style={styles.controlBtn}>
                  <Square size={22} color="#6B7280" />
                  <Text style={styles.controlLabel}>종료</Text>
                </AnimatedPressable>

                {/* 재생/일시정지 */}
                {timerState.isRunning ? (
                  <AnimatedPressable
                    onPress={handlePause}
                    hapticType="light"
                    scaleValue={0.9}
                    style={[styles.controlBtnLarge, {backgroundColor: activeColor}]}>
                    <Pause size={28} color="#FFFFFF" fill="#FFFFFF" />
                  </AnimatedPressable>
                ) : (
                  <AnimatedPressable
                    onPress={handleResume}
                    hapticType="medium"
                    scaleValue={0.9}
                    style={[styles.controlBtnLarge, {backgroundColor: activeColor}]}>
                    <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
                  </AnimatedPressable>
                )}

                {/* 완료(✓) — 세션 기록 + 할일 완료 */}
                <AnimatedPressable
                  onPress={handleMarkComplete}
                  hapticType="medium"
                  scaleValue={0.9}
                  style={styles.controlBtn}>
                  <Check size={22} color="#6B7280" />
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
      </View>
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
  celebrationIconWrap: {
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
