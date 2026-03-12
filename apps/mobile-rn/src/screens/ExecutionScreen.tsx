/**
 * Execute Tab — 인플레이스 타이머 + 탭바 숨김
 * Idle: 큰 타이머 원(280px) + "포커스 >" + 시작 버튼 + 통계
 * Running: 호흡 애니메이션 + 컨트롤 버튼 + 탭바 숨김
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ChevronRight, Square, Pause, Play, Check, Sparkles, Clock} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable, GlassBackground} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {FocusPickerModal} from '@/components/execution/FocusPickerModal';
import {FocusStatsModal} from '@/components/execution/FocusStatsModal';
import type {FocusPickerResult} from '@/components/execution/FocusPickerModal';
import {useHaptic} from '@/hooks/useHaptic';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {fixedColors} from '@/theme/colors';

// ============================================
// Constants
// ============================================

const QUICK_FOCUS_SECONDS = 20 * 60;
const RING_SIZE = 280;

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
        <Sparkles size={56} color={fixedColors.premiumGold} />
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
  primaryColor,
}: {
  onSave: (text: string) => void;
  onSkip: () => void;
  primaryColor: string;
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
          style={[styles.noteSaveBtn, {backgroundColor: primaryColor}, !text.trim() && {opacity: 0.4}]}
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

export default function ExecutionScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const haptic = useHaptic();
  const {primaryColor} = useTheme();

  // Stores
  const {
    timerState,
    focusMode,
    focusTodoTitle,
    connectedTodoId,
    tick,
    startFocusTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeSession,
  } = usePomodoroStore();
  const {toggleTodoCompletion} = useTodoStore();

  const hasActiveSession = timerState.isRunning || timerState.isPaused;

  // Modal states
  const [pickerVisible, setPickerVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<FocusPickerResult | null>(null);

  // Celebration / Note prompt
  const [showCelebration, setShowCelebration] = useState(false);
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const completedModeRef = useRef<'todo' | 'quick' | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- 탭바 숨김 ----
  // 네이티브 탭바(react-native-bottom-tabs)는 tabBarStyle 미지원
  // 타이머 활성 시에도 네이티브 탭바는 유지됨 (UITabBarController 기본 동작)

  // ---- tick 인터벌 (항상 이 화면에서 틱) ----
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

  // ---- 호흡 애니메이션 ----
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

  // ---- 타이머 완료 감지 ----
  useEffect(() => {
    if (timerState.status === 'completed' && timerState.remainingTime <= 0 && timerState.elapsed > 0) {
      if (!showCelebration && !showNotePrompt) {
        completedModeRef.current = focusMode;
        Vibration.vibrate([0, 200, 100, 200]);
        haptic.success();
        if (focusMode === 'todo' && connectedTodoId) {
          toggleTodoCompletion(connectedTodoId);
        }
        setShowCelebration(true);
      }
    }
  }, [timerState.status]);

  // ---- Picker에서 선택 ----
  const handlePickerSelect = useCallback((result: FocusPickerResult) => {
    setSelectedFocus(result);
  }, []);

  // ---- 표시용 값 계산 ----
  const displayTitle = useMemo(() => {
    if (hasActiveSession) {
      return focusTodoTitle || '집중 중...';
    }
    if (selectedFocus?.mode === 'todo' && selectedFocus.todoTitle) {
      return selectedFocus.todoTitle;
    }
    return '빠른 집중';
  }, [hasActiveSession, focusTodoTitle, selectedFocus]);

  const idleDuration = useMemo(() => {
    return selectedFocus?.durationSeconds ?? QUICK_FOCUS_SECONDS;
  }, [selectedFocus]);

  const activeColor = useMemo(() => {
    return primaryColor;
  }, [primaryColor]);

  // ---- 시작 ----
  const handleStart = useCallback(() => {
    if (selectedFocus?.mode === 'todo') {
      startFocusTimer(
        selectedFocus.durationSeconds,
        'todo',
        selectedFocus.todoId,
        selectedFocus.todoTitle,
      );
    } else {
      startFocusTimer(
        selectedFocus?.durationSeconds ?? QUICK_FOCUS_SECONDS,
        'quick',
      );
    }
    haptic.medium();
  }, [selectedFocus, startFocusTimer, haptic]);

  // ---- 컨트롤 핸들러 ----
  const handleStop = useCallback(() => {
    haptic.warning();
    stopTimer();
  }, [haptic, stopTimer]);

  const handlePause = useCallback(() => {
    pauseTimer();
    haptic.light();
  }, [pauseTimer, haptic]);

  const handleResume = useCallback(() => {
    resumeTimer();
    haptic.light();
  }, [resumeTimer, haptic]);

  const handleMarkComplete = useCallback(() => {
    haptic.success();
    completedModeRef.current = focusMode;

    if (timerState.elapsed > 0 || timerState.isRunning) {
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

    if (focusMode === 'todo' && connectedTodoId) {
      toggleTodoCompletion(connectedTodoId);
    }

    setShowCelebration(true);
  }, [haptic, timerState.elapsed, timerState.isRunning, focusMode, connectedTodoId, toggleTodoCompletion, completeSession]);

  const handleCelebrationDismiss = useCallback(() => {
    setShowCelebration(false);
    if (completedModeRef.current !== 'todo') {
      setShowNotePrompt(true);
    }
    // todo 모드: celebration 닫으면 idle로 돌아감
  }, []);

  const handleNoteSave = useCallback((_text: string) => {
    // TODO: 노트 저장 로직
    setShowNotePrompt(false);
  }, []);

  const handleNoteSkip = useCallback(() => {
    setShowNotePrompt(false);
  }, []);

  const isRunningOrPaused = timerState.isRunning || timerState.isPaused;

  // ============================================
  // Render
  // ============================================

  return (
    <ScreenContainer gradient="executionBackground">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>

        {hasActiveSession ? (
          // ============================
          // RUNNING 상태
          // ============================
          <View style={[styles.flex, {paddingTop: insets.top}]}>
            {/* 상단: 포커스 제목 */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.runningTitleArea}>
              <Text style={styles.runningTitle} numberOfLines={2}>
                {displayTitle}
              </Text>
            </Animated.View>

            {/* 큰 타이머 링 + 호흡 애니메이션 */}
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
                  <Text style={styles.timeDisplayLarge}>
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
                  <AnimatedPressable
                    onPress={handleStop}
                    hapticType="medium"
                    scaleValue={0.9}
                    style={styles.controlBtn}>
                    <Square size={22} color="#6B7280" />
                    <Text style={styles.controlLabel}>종료</Text>
                  </AnimatedPressable>

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
              <QuickNotePrompt onSave={handleNoteSave} onSkip={handleNoteSkip} primaryColor={primaryColor} />
            )}
          </View>
        ) : (
          // ============================
          // IDLE 상태
          // ============================
          <View style={styles.flex}>
            {/* 상단 헤더: 통계 버튼 */}
            <Animated.View entering={FadeIn.duration(300)} style={styles.idleHeaderRow}>
              <AnimatedPressable
                onPress={() => setStatsVisible(true)}
                hapticType="light"
                scaleValue={0.9}
                style={styles.glassStatsBtn}>
                <GlassBackground
                  blurAmount={16}
                  overlayColor="rgba(255,255,255,0.55)"
                  style={styles.glassStatsBtnInner}>
                  <View style={styles.glassStatsBtnContent}>
                    <Clock size={20} color="#6B7280" />
                  </View>
                </GlassBackground>
              </AnimatedPressable>
            </Animated.View>

            {/* "포커스 >" 텍스트 */}
            <Animated.View entering={FadeIn.duration(300)} style={styles.focusTriggerArea}>
              <AnimatedPressable
                onPress={() => setPickerVisible(true)}
                hapticType="light"
                style={styles.focusTriggerBtn}>
                <Text style={[styles.focusTriggerText, {color: activeColor}]}>
                  {displayTitle}
                </Text>
                <ChevronRight size={18} color={activeColor} />
              </AnimatedPressable>
            </Animated.View>

            {/* 큰 타이머 링 */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.ringContainer}>
              <View style={{width: RING_SIZE, height: RING_SIZE}}>
                <TimerRing
                  progress={0}
                  size={RING_SIZE}
                  strokeWidth={10}
                  color={activeColor}
                  isRunning={false}
                />
                <View style={[styles.centerOverlay, {width: RING_SIZE, height: RING_SIZE}]}>
                  <Text style={styles.timeDisplayLarge}>
                    {formatTime(idleDuration)}
                  </Text>
                  <Text style={[styles.idleLabel, {color: activeColor}]}>
                    {selectedFocus?.mode === 'todo' ? '준비' : '자유 모드'}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* 시작 버튼 (pill) */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.startBtnWrapper, { paddingBottom: Math.max(insets.bottom, 8) + 60 }]}>
              <AnimatedPressable
                onPress={handleStart}
                hapticType="medium"
                scaleValue={0.95}
                style={[styles.startBtn, {backgroundColor: activeColor}]}>
                <Text style={styles.startBtnText}>집중 시작</Text>
              </AnimatedPressable>
            </Animated.View>

          </View>
        )}

        {/* Celebration 오버레이 */}
        {showCelebration && (
          <CelebrationOverlay onDismiss={handleCelebrationDismiss} />
        )}

      </KeyboardAvoidingView>

      {/* FocusPickerModal */}
      <FocusPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickerSelect}
      />

      {/* FocusStatsModal */}
      <FocusStatsModal
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
      />
    </ScreenContainer>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // ---- Focus trigger ("포커스 >") ----
  focusTriggerArea: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  focusTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  focusTriggerText: {
    fontSize: 17,
    fontWeight: '600',
  },

  // ---- Timer Ring (shared) ----
  ringContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayLarge: {
    fontSize: 48,
    fontWeight: '200',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },
  idleLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  elapsedLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // ---- Start button (idle) ----
  startBtnWrapper: {
    paddingHorizontal: 48,
  },
  startBtn: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ---- Running title ----
  runningTitleArea: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 16,
  },
  runningTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },

  // ---- Controls (running) ----
  controls: {
    paddingHorizontal: 32,
    paddingBottom: 48,
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

  // ---- Idle header (stats button) ----
  idleHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  glassStatsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassStatsBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  glassStatsBtnContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Celebration overlay ----
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

  // ---- Quick note prompt ----
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
    alignItems: 'center',
  },
  noteSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
