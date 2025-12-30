'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  PartyPopper,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ListTodo,
  Zap,
  Play,
  Pause,
  Square,
  Timer,
  Sun,
  Moon,
  PictureInPicture2,
} from 'lucide-react';
import { Todo } from '@/entities/todo/Todo';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { usePomodoro } from '@/hooks/usePomodoro';
import { usePomodoroLiveActivity } from '@/hooks/usePomodoroLiveActivity';
import { usePiPTimer } from '@/hooks/usePiPTimer';
import { useTheme } from '@/hooks/useTheme';
// CircularSlider 라이브러리 제거 - 커스텀 구현 사용
import { useAuth } from '@/app/context/AuthContext';
import { PomodoroSessionService } from '@/services/pomodoro-session.service';
import { RelationshipDetectorService } from '@/services/relationship-detector.service';
import { updateWithJWT } from '@/lib/supabase/core';
import { PersonSelector, PersonLinksPreview } from '@/components/cherished/PersonSelector';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';

// 타이머 표시 모드 타입
type TimerDisplayMode = 'elapsed' | 'remaining' | 'both';

// 헬퍼 함수: 일정 유형 라벨
const getScheduleTypeLabel = (scheduleType: string): string => {
  const labelMap: Record<string, string> = {
    'anytime': '언제든지',
    'timed': '시간지정',
    'all_day': '종일',
  };
  return labelMap[scheduleType] || scheduleType;
};

interface ExecutionModeProps {
  onExit: () => void;
}

type ViewState = 'recommendation' | 'skip-reason' | 'completed-all' | 'empty-state' | 'adhoc-timer' | 'adhoc-capture';

/**
 * ADHD 실행 모드 화면
 *
 * 할일 목록을 숨기고 단일 할일만 추천하여
 * ADHD 사용자가 "지금 할 수 있는 가장 작은 것 하나"에 집중하도록 돕습니다.
 */
export default function ExecutionMode({ onExit }: ExecutionModeProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    executionMode,
    awakeningSentence,
    calculateRecommendationScore,
    setCurrentRecommendation,
    markCompleted,
    markSkipped,
    startAdhocMode,
    endAdhocMode,
    enterOrganizeMode,
    setSessionId,
    setLinkedTodo,
    setLinkedPeople,
    clearLinkedPeople,
  } = useADHDModeStore();

  // 소중한 사람 스토어
  const { loadPeople } = useCherishedPeopleStore();

  // 인물 연결 상태
  const joyfulPeopleIds = executionMode.adhocMode.joyfulPeopleIds;
  const shamefulPeopleIds = executionMode.adhocMode.shamefulPeopleIds;

  // 포모도로 훅 (Web Worker 기반 실제 타이머)
  const {
    timerState,
    startTimer: startPomodoroTimer,
    stopTimer: stopPomodoroTimer,
    pauseTimer,
    resumeTimer,
    adjustTime,
    isWorkerReady,
  } = usePomodoro();

  // 포모도로 설정은 스토어에서
  const { settings: pomodoroSettings } = usePomodoroStore();

  // iOS Live Activity 연동
  usePomodoroLiveActivity({
    timerState,
    todoName: executionMode.adhocMode.linkedTodoTitle || executionMode.currentRecommendation?.title,
    enabled: true,
  });

  // iOS PiP 타이머 연동 (timerState로 자동 동기화)
  const { startPiP, stopPiP, isActive: isPiPActive, isAvailable: isPiPAvailable } = usePiPTimer({
    timerState,  // JavaScript 타이머를 Single Source of Truth로 사용
    onTimerComplete: () => {
      console.log('[PiP] Timer completed');
    },
    onPiPStopped: () => {
      console.log('[PiP] Stopped');
    },
  });

  const { todos, toggleTodo, deleteTodo, createTodo, updateTodo, fetchTodoById } = useTodoStore();

  const { resolvedTheme, setTheme } = useTheme();

  const [viewState, setViewState] = useState<ViewState>('recommendation');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCompletedList, setShowCompletedList] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false); // 기본적으로 접힌 상태
  const [adhocCaptureTitle, setAdhocCaptureTitle] = useState(''); // 즉흥 모드 완료 후 입력할 제목
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false); // 그만할래 확인 모달
  const [inlineTodoInput, setInlineTodoInput] = useState(''); // 타이머 진행 중 할일 입력
  const [restoredStartTime, setRestoredStartTime] = useState<Date | null>(null); // 세션 복원 시 원본 시작 시간
  const [restoredDuration, setRestoredDuration] = useState<number | null>(null); // 세션 복원 시 원본 duration
  const [isRestoringSession, setIsRestoringSession] = useState(true); // 세션 복원 확인 전까지 추천 로드 지연
  const [editingCompletedTodoId, setEditingCompletedTodoId] = useState<string | null>(null); // 완료 할일 편집 중인 ID
  const [editingCompletedTodoTitle, setEditingCompletedTodoTitle] = useState(''); // 완료 할일 편집 중인 제목
  const [isCreatingTodo, setIsCreatingTodo] = useState(false); // 할일 생성 중 플래그 (race condition 방지)
  const [pausedAt, setPausedAt] = useState<number | null>(null); // 일시정지 시점 (DB 동기화용)
  const [totalDuration, setTotalDuration] = useState<number | null>(null); // 화면 endTime 계산용 (DB와 동기화)
  const [timerDisplayMode, setTimerDisplayMode] = useState<TimerDisplayMode>('both'); // 경과/남은/둘다 표시 모드

  // 로딩 상태 (Skip DB 제거로 항상 false)

  // 오늘 실행 가능한 할일만 필터링
  // useLatestState: true면 getState()로 최신 상태 조회, false면 렌더링 상태 사용
  const getTodayTodos = useCallback((useLatestState: boolean = false) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 최신 상태가 필요하면 getState()로 직접 조회 (stale closure 방지)
    const currentTodos = useLatestState ? useTodoStore.getState().todos : todos;

    return currentTodos.filter(todo => {
      if (todo.completed) return false;

      // 오늘 날짜 또는 anytime인 할일만 추천
      if (todo.startTime) {
        const todoDate = new Date(todo.startTime);
        return todoDate >= today && todoDate < tomorrow;
      }

      if (todo.scheduleType === 'anytime') return true;

      return false;
    });
  }, [todos]);

  // 오늘 완료한 할일 필터링 (updatedAt 기준 - 완료 시 갱신됨)
  const getTodayCompletedTodos = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return todos.filter(todo => {
      if (!todo.completed) return false;

      // 오늘 업데이트된 완료 할일만 (완료 시 updatedAt이 갱신됨)
      const updatedDate = new Date(todo.updatedAt);
      return updatedDate >= today && updatedDate < tomorrow;
    });
  }, [todos]);

  // 할일이 없을 때 바로 포모도로 시작 (getNextRecommendation에서 호출)
  const startAdhocForEmptyState = useCallback(async () => {
    if (!userId) return;

    setRestoredStartTime(null);
    setRestoredDuration(null);

    startAdhocMode();
    const duration = pomodoroSettings.pomodoroDuration * 60 * 1000;
    setTotalDuration(duration); // 화면 endTime 계산용

    try {
      const sessionId = await PomodoroSessionService.createSession(userId, duration);
      setSessionId(sessionId);
    } catch (error) {
      console.error('❌ 세션 생성 실패:', error);
    }

    startPomodoroTimer(duration, 'POMODORO');
    setViewState('adhoc-timer');
  }, [userId, pomodoroSettings.pomodoroDuration, startAdhocMode, setSessionId, startPomodoroTimer]);

  // 다음 추천 할일 가져오기
  const getNextRecommendation = useCallback(() => {
    // 이미 타이머 실행 중이면 추천 건너뛰기 (세션 복원 후 덮어쓰기 방지)
    const { adhocMode } = useADHDModeStore.getState().executionMode;
    if (adhocMode.isActive) {
      console.log('⏭️ 타이머 실행 중 - 추천 로드 건너뛰기');
      return;
    }

    // getState()로 최신 todos 상태 조회 (stale closure 방지)
    const todayTodos = getTodayTodos(true);
    // Zustand getState()로 최신 상태 조회 (stale closure 방지)
    const { skippedTodoIds } = useADHDModeStore.getState().executionMode;

    // 건너뛴 할일 제외
    const candidates = todayTodos.filter(
      todo => !skippedTodoIds.includes(todo.id)
    );

    if (candidates.length === 0) {
      const { completedInSession } = useADHDModeStore.getState().executionMode;
      if (completedInSession > 0) {
        // 세션 중 완료한 할일이 있으면 축하 화면
        setViewState('completed-all');
      } else {
        // 할일 없으면 바로 포모도로 타이머 시작
        startAdhocForEmptyState();
      }
      setCurrentRecommendation(null);
      return;
    }

    // 점수 계산 및 정렬
    const scored = candidates.map(todo => ({
      todo,
      score: calculateRecommendationScore(todo),
    }));

    scored.sort((a, b) => b.score - a.score);

    setCurrentRecommendation(scored[0].todo);
    setViewState('recommendation');
  }, [getTodayTodos, calculateRecommendationScore, setCurrentRecommendation, startAdhocForEmptyState]);

  // 초기 추천 로드 (세션 복원 확인 완료 후)
  useEffect(() => {
    // 세션 복원 확인이 끝난 후에만 추천 로드
    if (!isRestoringSession) {
      getNextRecommendation();
    }
  }, [isRestoringSession]);

  // 활성 세션 복원 (뒤로가기 후 다시 진입 시)
  // Worker 준비 완료 후에만 실행 (Worker 미준비 시 startPomodoroTimer 무시됨)
  useEffect(() => {
    const restoreActiveSession = async () => {
      // userId 없으면 복원 불가 → 바로 완료 처리
      if (!userId) {
        setIsRestoringSession(false);
        return;
      }

      // Worker 미준비 시 대기 (isWorkerReady가 true 되면 재실행)
      if (!isWorkerReady) {
        return;
      }

      try {
        const activeSession = await PomodoroSessionService.getActiveSession(userId);
        if (activeSession && !activeSession.is_completed) {
          const originalStartTime = new Date(activeSession.start_time);
          const startTime = originalStartTime.getTime();
          const remaining = activeSession.duration - (Date.now() - startTime);

          if (remaining > 0) {
            console.log('🔄 활성 세션 복원:', { sessionId: activeSession.id, remaining });
            // 원본 시작 시간 및 duration 저장 (AdhocTimerView에서 사용)
            setRestoredStartTime(originalStartTime);
            setRestoredDuration(activeSession.duration);
            setTotalDuration(activeSession.duration); // 화면 endTime 계산용 (DB 값 그대로)
            // 세션 상태 복원
            setSessionId(activeSession.id);
            startAdhocMode();
            startPomodoroTimer(remaining, 'POMODORO');
            setViewState('adhoc-timer');

            // 연결된 할일 복원
            if (activeSession.linked_todo_id) {
              const linkedTodo = await fetchTodoById(activeSession.linked_todo_id);
              if (linkedTodo) {
                setLinkedTodo(linkedTodo.id, linkedTodo.title);
              }
            }

          } else {
            // 시간 초과된 세션은 자동 완료 처리 (getActiveSession에서 처리됨)
            console.log('⏰ 만료된 세션 발견, 이미 처리됨');
          }
        }
      } catch (error) {
        console.error('❌ 세션 복원 실패:', error);
      } finally {
        // 복원 시도 완료 (성공/실패/세션 없음 무관)
        setIsRestoringSession(false);
      }
    };

    restoreActiveSession();
  }, [userId, isWorkerReady]);

  // 소중한 사람 목록 로드
  useEffect(() => {
    if (userId) {
      loadPeople(userId);
    }
  }, [userId, loadPeople]);

  // "했어" 클릭
  const handleComplete = async (method: 'direct' | 'alternative') => {
    const currentTodo = executionMode.currentRecommendation;
    if (!currentTodo || isAnimating || !userId) return;

    setIsAnimating(true);

    // 할일 완료 처리
    await toggleTodo(currentTodo.id);

    // ADHD Store 업데이트 (fire and forget)
    markCompleted(currentTodo.id, method);

    // 애니메이션 후 다음 추천
    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 500);
  };

  // "다른 거 추천해줘" 클릭 - 바로 다음 할일로 이동
  const handleSkipClick = () => {
    const currentTodo = executionMode.currentRecommendation;
    if (!currentTodo || isAnimating) return;

    setIsAnimating(true);
    markSkipped(currentTodo.id);

    // 다음 추천
    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 300);
  };

  // "필요 없는 할일이야" 삭제
  const handleDelete = async () => {
    const currentTodo = executionMode.currentRecommendation;
    if (!currentTodo || isAnimating) return;

    setIsAnimating(true);
    markSkipped(currentTodo.id);
    await deleteTodo(currentTodo.id);

    // 다음 추천
    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 300);
  };

  // 완료 취소 핸들러
  const handleUncomplete = async (todoId: string) => {
    if (isAnimating) return;

    setIsAnimating(true);

    // 할일 완료 취소 처리 (toggleTodo는 완료 상태를 토글)
    await toggleTodo(todoId);

    // 다시 추천 목록에 포함되도록 다음 추천 갱신
    setTimeout(() => {
      setIsAnimating(false);
      // 완료된 목록이 비었으면 목록 닫기
      const remaining = getTodayCompletedTodos().filter(t => t.id !== todoId);
      if (remaining.length === 0) {
        setShowCompletedList(false);
      }
      getNextRecommendation();
    }, 300);
  };

  // 완료된 할일 제목 수정 핸들러
  const handleUpdateCompletedTodoTitle = useCallback(async (todoId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    await updateTodo(todoId, { title: newTitle.trim() });
    setEditingCompletedTodoId(null);
  }, [updateTodo]);

  // === 즉흥 모드 핸들러 ===

  // "지금 떠오른거 타이머 켜고 할래" 클릭
  const handleStartAdhoc = async () => {
    if (!userId) return;

    // 복원 상태 초기화 (새 세션이므로)
    setRestoredStartTime(null);
    setRestoredDuration(null);

    startAdhocMode();
    const duration = pomodoroSettings.pomodoroDuration * 60 * 1000; // 25분 → ms
    setTotalDuration(duration); // 화면 endTime 계산용

    // DB에 세션 생성
    try {
      const sessionId = await PomodoroSessionService.createSession(userId, duration);
      setSessionId(sessionId);
    } catch (error) {
      console.error('❌ 세션 생성 실패:', error);
      // 실패해도 타이머는 시작 (UX 우선)
    }

    startPomodoroTimer(duration, 'POMODORO');
    setViewState('adhoc-timer');
  };

  // "타이머 켜고 할래" 클릭 - 현재 추천된 할일과 연결된 포모도로 시작
  const handleStartPomodoroWithTodo = async () => {
    const currentTodo = executionMode.currentRecommendation;
    if (!userId || !currentTodo) return;

    // 복원 상태 초기화 (새 세션이므로)
    setRestoredStartTime(null);
    setRestoredDuration(null);

    startAdhocMode();
    const duration = pomodoroSettings.pomodoroDuration * 60 * 1000; // 25분 → ms
    setTotalDuration(duration); // 화면 endTime 계산용

    // DB에 세션 생성
    try {
      const sessionId = await PomodoroSessionService.createSession(userId, duration);
      setSessionId(sessionId);

      // 현재 할일과 연결
      if (sessionId) {
        await PomodoroSessionService.linkTodo(sessionId, currentTodo.id);
        setLinkedTodo(currentTodo.id, currentTodo.title);
      }
    } catch (error) {
      console.error('❌ 세션 생성/연결 실패:', error);
      // 실패해도 타이머는 시작 (UX 우선)
    }

    startPomodoroTimer(duration, 'POMODORO');
    setViewState('adhoc-timer');
  };

  // 포모도로 중단 버튼 클릭
  const handleStopAdhoc = () => {
    const { linkedTodoId } = executionMode.adhocMode;

    if (linkedTodoId) {
      // 미완료 할일이 있으면 확인 모달 표시
      setShowStopConfirmModal(true);
    } else {
      // 없으면 바로 중단
      handleConfirmStop('delete');
    }
  };

  // 중단 확인 모달에서 선택
  const handleConfirmStop = async (action: 'delete' | 'keep') => {
    const { sessionId, linkedTodoId } = executionMode.adhocMode;

    if (action === 'delete' && linkedTodoId) {
      // 미완료 할일 삭제
      try {
        await deleteTodo(linkedTodoId);
        console.log('🗑️ 미완료 할일 삭제됨:', linkedTodoId);
      } catch (error) {
        console.error('❌ 할일 삭제 실패:', error);
      }
    }
    // action === 'keep'이면 할일은 그대로 미완료 유지

    // DB 세션 삭제
    if (sessionId) {
      try {
        await PomodoroSessionService.deleteSession(sessionId);
      } catch (error) {
        console.error('❌ 세션 삭제 실패:', error);
      }
    }

    // 상태 초기화
    stopPomodoroTimer();
    endAdhocMode();
    setSessionId(null);
    setLinkedTodo(null, null);
    setShowStopConfirmModal(false);
    setInlineTodoInput('');
    setRestoredStartTime(null);
    setRestoredDuration(null);

    onExit();  // 실행 모드 완전 종료
  };

  // 포모도로 완료 후 → 기록 화면으로 (또는 바로 완료)
  const handleAdhocTimerComplete = async () => {
    // 할일 생성 중이면 잠시 대기 후 재시도 (race condition 방지)
    if (isCreatingTodo) {
      console.log('⏳ 할일 생성 중 - 완료 처리 대기');
      setTimeout(() => handleAdhocTimerComplete(), 100);
      return;
    }

    const { sessionId, linkedTodoId } = executionMode.adhocMode;

    // 세션 시작/종료 시간 계산
    const sessionStartTime = restoredStartTime || new Date(Date.now() - timerState.duration + timerState.remainingTime);
    const sessionEndTime = new Date();

    // 연결된 할일이 있으면 시간/인물 정보 포함하여 완료 처리
    if (linkedTodoId) {
      try {
        await updateTodo(linkedTodoId, {
          completed: true,
          schedule_type: 'timed',
          start_time: sessionStartTime.toISOString(),
          end_time: sessionEndTime.toISOString(),
          joyful_people_ids: joyfulPeopleIds,
          shameful_people_ids: shamefulPeopleIds,
        });
        console.log('✅ 연결된 할일 완료 처리 (시간/인물 포함):', linkedTodoId);
      } catch (error) {
        console.error('❌ 할일 완료 처리 실패:', error);
      }
    }

    // 세션 삭제 (is_completed=true 대신 완전 삭제)
    if (sessionId) {
      try {
        await PomodoroSessionService.deleteSession(sessionId);
        console.log('🗑️ 세션 삭제 완료:', sessionId);
      } catch (error) {
        console.error('❌ 세션 삭제 실패:', error);
      }
    }

    // linkedTodoId가 있으면 바로 다음으로, 없으면 기록 화면으로
    if (linkedTodoId) {
      // 정리 및 다음으로
      stopPomodoroTimer();
      endAdhocMode();
      setSessionId(null);
      setLinkedTodo(null, null);
      clearLinkedPeople();
      setRestoredStartTime(null);
      setRestoredDuration(null);
      markCompleted('adhoc', 'direct');
      getNextRecommendation();
      return;
    }

    // 기록 화면으로 전환 전, 입력 필드 초기화 (중복 생성 방지)
    setInlineTodoInput('');
    // 연결된 할일이 없으면 기록 화면으로
    setViewState('adhoc-capture');
  };

  // 타이머 진행 중 미완료 할일 생성
  const handleCreateInlineTodo = async () => {
    // 이미 생성 중이면 중복 호출 방지
    if (!inlineTodoInput.trim() || !userId || isCreatingTodo) return;

    const { sessionId } = executionMode.adhocMode;
    const titleToSave = inlineTodoInput.trim();

    // 입력 필드 즉시 초기화 (race condition 방지)
    setInlineTodoInput('');
    setIsCreatingTodo(true);

    try {
      // 포모도로 세션 정보 조회하여 시간 설정
      let startTime = new Date().toISOString();
      let endTime = startTime;

      if (sessionId) {
        const session = await PomodoroSessionService.getSession(sessionId);
        if (session) {
          startTime = session.start_time;
          // end_time = start_time + duration (ms)
          const startMs = new Date(session.start_time).getTime();
          endTime = new Date(startMs + session.duration).toISOString();
        }
      }

      // 미완료 할일 생성
      const newTodo = await createTodo({
        title: titleToSave,
        completed: false,
        schedule_type: 'timed',
        start_time: startTime,
        end_time: endTime,
        user_id: userId,
      });

      // 세션에 연결
      if (sessionId && newTodo?.id) {
        await PomodoroSessionService.linkTodo(sessionId, newTodo.id);
        setLinkedTodo(newTodo.id, titleToSave);
      }

      console.log('✅ 미완료 할일 생성:', newTodo?.id);
    } catch (error) {
      console.error('❌ 미완료 할일 생성 실패:', error);
    } finally {
      setIsCreatingTodo(false);
    }
  };

  // 연결된 할일 제목 수정
  const handleUpdateLinkedTodoTitle = async (newTitle: string) => {
    const { linkedTodoId } = executionMode.adhocMode;
    if (!linkedTodoId || !newTitle.trim()) return;

    try {
      await updateTodo(linkedTodoId, { title: newTitle.trim() });
      setLinkedTodo(linkedTodoId, newTitle.trim());
      console.log('✏️ 할일 제목 수정:', { todoId: linkedTodoId, newTitle });
    } catch (error) {
      console.error('❌ 할일 제목 수정 실패:', error);
    }
  };

  // 타이머 시간 조정 (-1분/+1분) - Worker + DB + 화면 동시 업데이트
  const handleAdjustTime = useCallback(async (deltaMs: number) => {
    // 1. Worker에 시간 조정 메시지 전송
    adjustTime(deltaMs);

    // 2. 화면 endTime 업데이트 (DB와 동기화)
    setTotalDuration(d => (d ?? 0) + deltaMs);

    const { sessionId, linkedTodoId } = executionMode.adhocMode;

    // 3. DB에서 현재 세션 조회 후 duration 업데이트
    if (sessionId) {
      const session = await PomodoroSessionService.getSession(sessionId);
      if (!session) return;

      const newDuration = session.duration + deltaMs;  // DB 값 기준으로 계산
      await PomodoroSessionService.updateDuration(sessionId, newDuration);

      // 4. 연결된 할일의 end_time 업데이트 (Supabase 직접)
      if (linkedTodoId) {
        const startMs = new Date(session.start_time).getTime();
        const newEndTime = new Date(startMs + newDuration).toISOString();
        await updateWithJWT('todos',
          { column: 'id', operator: 'eq', value: linkedTodoId },
          { end_time: newEndTime }
        );
      }
    }
  }, [adjustTime, executionMode.adhocMode]);

  // 일시정지 래퍼 - 정지 시점 기록
  const handlePause = useCallback(() => {
    setPausedAt(Date.now());
    pauseTimer();
  }, [pauseTimer]);

  // 재생 래퍼 - 화면 + DB 업데이트 (정지 시간만큼 duration 증가)
  // Worker는 resumeTimer()로 자동 복원됨 (startTime 조정)
  const handleResume = useCallback(async () => {
    if (pausedAt) {
      const pausedDuration = Date.now() - pausedAt;

      // 화면 endTime 업데이트 (DB와 동기화)
      // Worker의 adjustTime은 호출하지 않음 - Worker는 자체적으로 일시정지 처리함
      setTotalDuration(d => (d ?? 0) + pausedDuration);

      // DB 업데이트
      const { sessionId, linkedTodoId } = executionMode.adhocMode;

      if (sessionId) {
        const session = await PomodoroSessionService.getSession(sessionId);
        if (session) {
          const newDuration = session.duration + pausedDuration;
          await PomodoroSessionService.updateDuration(sessionId, newDuration);

          // 연결된 할일의 end_time 업데이트
          if (linkedTodoId) {
            const startMs = new Date(session.start_time).getTime();
            const newEndTime = new Date(startMs + newDuration).toISOString();
            await updateWithJWT('todos',
              { column: 'id', operator: 'eq', value: linkedTodoId },
              { end_time: newEndTime }
            );
          }
        }
      }
      setPausedAt(null);
    }

    resumeTimer();
  }, [resumeTimer, pausedAt, executionMode.adhocMode]);

  // 할일 기록하기
  const handleCaptureAdhocTodo = async () => {
    if (!adhocCaptureTitle.trim() || !userId) return;

    setIsAnimating(true);

    // 세션 시작 시간 (복원된 시간 또는 타이머 시작 시점)
    const sessionStartTime = restoredStartTime || new Date(Date.now() - timerState.duration + timerState.remainingTime);
    const sessionEndTime = new Date();

    // 이미 연결된 할일이 있으면 새로 생성하지 않고 완료 처리 + 시간/인물 정보 업데이트
    const { linkedTodoId, sessionId } = executionMode.adhocMode;
    if (linkedTodoId) {
      console.log('⚠️ 이미 연결된 할일 존재 - 완료 처리 + 정보 업데이트:', linkedTodoId);
      try {
        await updateTodo(linkedTodoId, {
          completed: true,
          schedule_type: 'timed',
          start_time: sessionStartTime.toISOString(),
          end_time: sessionEndTime.toISOString(),
          joyful_people_ids: joyfulPeopleIds,
          shameful_people_ids: shamefulPeopleIds,
        });
      } catch (error) {
        console.error('❌ 기존 할일 완료 처리 실패:', error);
      }
    } else {
      // 연결된 할일이 없을 때만 새로 생성
      await createTodo({
        title: adhocCaptureTitle.trim(),
        completed: true,
        schedule_type: 'timed',
        start_time: sessionStartTime.toISOString(),
        end_time: sessionEndTime.toISOString(),
        joyful_people_ids: joyfulPeopleIds,
        shameful_people_ids: shamefulPeopleIds,
        user_id: userId,
      });
    }

    // 세션 삭제 (is_completed=true 대신 완전 삭제)
    if (sessionId) {
      try {
        await PomodoroSessionService.deleteSession(sessionId);
      } catch (error) {
        console.error('❌ 세션 삭제 실패:', error);
      }
    }

    // 정리
    setAdhocCaptureTitle('');
    stopPomodoroTimer(); // 타이머 정지 및 리셋
    endAdhocMode();
    setLinkedTodo(null, null); // 연결 해제
    clearLinkedPeople(); // 인물 연결 초기화
    markCompleted('adhoc', 'direct'); // 세션 완료 수 증가

    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 300);
  };

  // 기록 스킵
  const handleSkipAdhocCapture = () => {
    setAdhocCaptureTitle('');
    stopPomodoroTimer(); // 타이머 정지 및 리셋
    endAdhocMode();
    clearLinkedPeople(); // 인물 연결 초기화
    getNextRecommendation();
  };

  // 정리하기 모드로 이동
  const handleGoToOrganize = () => {
    enterOrganizeMode();
  };

  // 포모도로 완료 감지
  useEffect(() => {
    const { adhocMode } = executionMode;
    if (adhocMode.isActive && timerState.status === 'completed') {
      handleAdhocTimerComplete();
    }
  }, [timerState.status, executionMode.adhocMode.isActive]);

  const { currentRecommendation, completedInSession } = executionMode;
  const todayCompletedTodos = getTodayCompletedTodos();

  return (
    <div className="min-h-screen flex flex-col bg-base-100 safe-area-top">
      {/* 헤더 */}
      <header className="p-4 flex items-center justify-between">
        <button
          onClick={onExit}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {completedInSession > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="badge badge-primary badge-lg gap-1"
          >
            <PartyPopper className="w-4 h-4" />
            오늘 {completedInSession}개 완료!
          </motion.div>
        )}

        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="btn btn-circle btn-sm btn-ghost"
          aria-label="테마 전환"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* 개발환경 디버그 패널 (아코디언) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mx-4 mb-4 bg-base-200 rounded-lg text-xs overflow-hidden">
          {/* 아코디언 헤더 */}
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="w-full p-3 flex items-center justify-between hover:bg-base-300/50 transition-colors"
          >
            <span className="font-semibold">📋 추천 후보 목록 ({getTodayTodos().length}개)</span>
            {showDebugPanel ? (
              <ChevronUp className="w-4 h-4 text-base-content/50" />
            ) : (
              <ChevronDown className="w-4 h-4 text-base-content/50" />
            )}
          </button>

          {/* 아코디언 내용 */}
          <AnimatePresence>
            {showDebugPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="px-3 pb-3 space-y-1 max-h-40 overflow-y-auto">
                  {getTodayTodos().map(todo => (
                    <li key={todo.id} className="truncate">
                      • {todo.title}
                      {todo.scheduleType && (
                        <span className="text-base-content/50"> {getScheduleTypeLabel(todo.scheduleType)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <AnimatePresence mode="wait">
          {/* 추천 화면 */}
          {viewState === 'recommendation' && currentRecommendation && (
            <RecommendationView
              key="recommendation"
              todo={currentRecommendation}
              awakeningSentence={awakeningSentence}
              isAnimating={isAnimating}
              onComplete={() => handleComplete('direct')}
              onStartPomodoroWithTodo={handleStartPomodoroWithTodo}
              onSkip={handleSkipClick}
              onDelete={handleDelete}
              onStartAdhoc={handleStartAdhoc}
            />
          )}

          {/* 모두 완료 화면 */}
          {viewState === 'completed-all' && userId && (
            <CompletedAllView
              key="completed-all"
              completedCount={completedInSession}
              onExit={onExit}
              completedTodos={todayCompletedTodos.map(t => ({
                title: t.title,
                isRelationshipTask: t.isRelationshipTask
              }))}
            />
          )}

          {/* 빈 상태 화면 (할일 없음) */}
          {viewState === 'empty-state' && (
            <EmptyStateView
              key="empty-state"
              onGoToOrganize={handleGoToOrganize}
              onStartAdhoc={handleStartAdhoc}
            />
          )}

          {/* 즉흥 포모도로 타이머 화면 */}
          {viewState === 'adhoc-timer' && (
            <AdhocTimerView
              key="adhoc-timer"
              timerState={timerState}
              onStop={handleStopAdhoc}
              onComplete={handleAdhocTimerComplete}
              onPause={handlePause}
              onResume={handleResume}
              onAdjustTime={handleAdjustTime}
              linkedTodoId={executionMode.adhocMode.linkedTodoId}
              linkedTodoTitle={executionMode.adhocMode.linkedTodoTitle}
              inlineTodoInput={inlineTodoInput}
              onInlineTodoInputChange={setInlineTodoInput}
              onCreateInlineTodo={handleCreateInlineTodo}
              onUpdateLinkedTodoTitle={handleUpdateLinkedTodoTitle}
              originalStartTime={restoredStartTime || undefined}
              originalDuration={restoredDuration || undefined}
              totalDuration={totalDuration}
              joyfulPeopleIds={joyfulPeopleIds}
              shamefulPeopleIds={shamefulPeopleIds}
              onLinkedPeopleChange={setLinkedPeople}
              isPiPAvailable={isPiPAvailable}
              isPiPActive={isPiPActive}
              onStartPiP={startPiP}
              onStopPiP={stopPiP}
              timerDisplayMode={timerDisplayMode}
              onToggleDisplayMode={() => {
                setTimerDisplayMode(prev =>
                  prev === 'both' ? 'elapsed' : prev === 'elapsed' ? 'remaining' : 'both'
                );
              }}
            />
          )}

          {/* 즉흥 완료 후 기록 화면 */}
          {viewState === 'adhoc-capture' && (
            <AdhocCaptureView
              key="adhoc-capture"
              title={adhocCaptureTitle}
              onTitleChange={setAdhocCaptureTitle}
              onCapture={handleCaptureAdhocTodo}
              onSkip={handleSkipAdhocCapture}
              isAnimating={isAnimating}
              joyfulPeopleIds={joyfulPeopleIds}
              shamefulPeopleIds={shamefulPeopleIds}
              onLinkedPeopleChange={setLinkedPeople}
            />
          )}
        </AnimatePresence>
      </main>

      {/* 오늘 완료한 할일 목록 (하단 고정) */}
      {todayCompletedTodos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 shadow-lg">
          {/* 토글 버튼 */}
          <button
            onClick={() => setShowCompletedList(!showCompletedList)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-base-content/70">
              <Check className="w-4 h-4 text-success" />
              오늘 완료한 할일 ({todayCompletedTodos.length}개)
            </span>
            {showCompletedList ? (
              <ChevronDown className="w-4 h-4 text-base-content/50" />
            ) : (
              <ChevronUp className="w-4 h-4 text-base-content/50" />
            )}
          </button>

          {/* 완료 목록 */}
          <AnimatePresence>
            {showCompletedList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <ul className="px-4 pb-4 max-h-48 overflow-y-auto space-y-2">
                  {todayCompletedTodos.map(todo => (
                    <li
                      key={todo.id}
                      className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2"
                    >
                      {editingCompletedTodoId === todo.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingCompletedTodoTitle}
                          onChange={(e) => setEditingCompletedTodoTitle(e.target.value)}
                          onBlur={() => {
                            if (editingCompletedTodoTitle.trim() && editingCompletedTodoTitle !== todo.title) {
                              handleUpdateCompletedTodoTitle(todo.id, editingCompletedTodoTitle);
                            }
                            setEditingCompletedTodoId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (editingCompletedTodoTitle.trim() && editingCompletedTodoTitle !== todo.title) {
                                handleUpdateCompletedTodoTitle(todo.id, editingCompletedTodoTitle);
                              }
                              setEditingCompletedTodoId(null);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingCompletedTodoId(null);
                            }
                          }}
                          className="text-sm text-base-content/70 line-through bg-transparent border-none outline-none flex-1"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingCompletedTodoId(todo.id);
                            setEditingCompletedTodoTitle(todo.title);
                          }}
                          className="text-sm text-base-content/70 line-through truncate flex-1 cursor-pointer hover:opacity-70"
                        >
                          {todo.title}
                        </span>
                      )}
                      <button
                        onClick={() => handleUncomplete(todo.id)}
                        disabled={isAnimating}
                        className="btn btn-ghost btn-xs btn-circle ml-2 text-base-content/50 hover:text-warning"
                        title="완료 취소"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 그만할래 확인 모달 (미완료 할일 있을 때) */}
      {showStopConfirmModal && (
        <dialog open className="modal z-[110]">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">미완료 할일이 있어요</h3>
            <p className="text-base-content/70 mb-4 text-center py-2 px-4 bg-base-200 rounded-lg">
              &ldquo;{executionMode.adhocMode.linkedTodoTitle}&rdquo;
            </p>
            <p className="text-sm text-base-content/60 mb-6">
              어떻게 할까요?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmStop('delete')}
                className="btn btn-ghost flex-1 rounded-full"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
              <button
                onClick={() => handleConfirmStop('keep')}
                className="btn btn-primary flex-1 rounded-full"
              >
                미완료 유지
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop bg-black/50">
            <button onClick={() => setShowStopConfirmModal(false)}>close</button>
          </form>
        </dialog>
      )}

    </div>
  );
}

// ============================================
// 서브 컴포넌트들
// ============================================

interface RecommendationViewProps {
  todo: Todo;
  awakeningSentence: string | null;
  isAnimating: boolean;
  onComplete: () => void;
  onStartPomodoroWithTodo: () => void;
  onSkip: () => void;
  onDelete: () => void;
  onStartAdhoc: () => void;
}

function RecommendationView({
  todo,
  awakeningSentence,
  isAnimating,
  onComplete,
  onStartPomodoroWithTodo,
  onSkip,
  onDelete,
  onStartAdhoc,
}: RecommendationViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      {/* 안내 문구 */}
      <p className="text-base-content/60 mb-4">
        지금 할 수 있는 가장 작은 것 하나:
      </p>

      {/* 할일 제목 */}
      <motion.div
        key={todo.id}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-base-200 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold text-base-content leading-relaxed">
            {todo.title}
          </h2>
        </div>

        {/* 속성 정보: 일정 유형 */}
        {todo.scheduleType && (
          <div className="text-sm text-base-content/60 mt-3 flex items-center justify-center gap-2">
            <span>{getScheduleTypeLabel(todo.scheduleType)}</span>
          </div>
        )}
      </motion.div>

      {/* 버튼들 */}
      <div className="flex flex-col gap-3">
        {/* 했어 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComplete}
          disabled={isAnimating}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          <Check className="w-6 h-6" />
          했어
        </motion.button>

        {/* 타이머 켜고 할래 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartPomodoroWithTodo}
          disabled={isAnimating}
          className="btn btn-ghost btn-md w-full rounded-full border border-base-300"
        >
          <Timer className="w-5 h-5" />
          타이머 켜고 할래
        </motion.button>

        {/* 다른 거 추천해줘 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-base-content/60"
        >
          다른 거 추천해줘
        </motion.button>

        {/* 필요 없는 할일 삭제 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDelete}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-error/60"
        >
          <Trash2 className="w-4 h-4" />
          필요 없는 할일이야
        </motion.button>

        {/* 즉흥 포모도로 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartAdhoc}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-primary/70 mt-4"
        >
          <Zap className="w-4 h-4" />
          지금 떠오른거 타이머 켜고 할래
        </motion.button>
      </div>

      {/* 각성 문장 */}
      {awakeningSentence && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-base-content/40 italic"
        >
          &ldquo;{awakeningSentence}&rdquo;
        </motion.p>
      )}
    </motion.div>
  );
}

interface CompletedTodoForBalance {
  title: string;
  isRelationshipTask?: boolean | null;
}

interface CompletedAllViewProps {
  completedCount: number;
  onExit: () => void;
  completedTodos: CompletedTodoForBalance[];
}

function CompletedAllView({ completedCount, onExit, completedTodos }: CompletedAllViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        animate={{
          rotate: [0, -10, 10, -10, 10, 0],
        }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <PartyPopper className="w-20 h-20 mx-auto text-primary mb-6" />
      </motion.div>

      <h2 className="text-2xl font-bold text-base-content mb-2">
        대단해요!
      </h2>

      <p className="text-base-content/60 mb-6">
        {completedCount > 0
          ? `오늘 ${completedCount}개를 실행했어요.`
          : '오늘 할 일을 모두 처리했어요!'}
      </p>

      <button
        onClick={onExit}
        className="btn btn-primary btn-lg rounded-full px-8"
      >
        나가기
      </button>
    </motion.div>
  );
}

// ============================================
// 빈 상태 화면 (할일 없음)
// ============================================

interface EmptyStateViewProps {
  onGoToOrganize: () => void;
  onStartAdhoc: () => void;
}

function EmptyStateView({ onGoToOrganize, onStartAdhoc }: EmptyStateViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <ListTodo className="w-16 h-16 mx-auto text-base-content/30 mb-6" />

      <h2 className="text-xl font-bold text-base-content mb-2">
        할일이 없네요
      </h2>

      <p className="text-base-content/60 mb-8">
        정리하기로 할일을 먼저 만들어볼까요?
      </p>

      <div className="flex flex-col gap-3">
        {/* 즉흥 포모도로 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartAdhoc}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          <Zap className="w-5 h-5" />
          지금 떠오른거 타이머 켜고 할래
        </motion.button>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-base-300" />
          <span className="text-xs text-base-content/40">또는</span>
          <div className="flex-1 h-px bg-base-300" />
        </div>

        {/* 정리하러 가기 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGoToOrganize}
          className="btn btn-ghost btn-md w-full rounded-full border border-base-300"
        >
          <ListTodo className="w-5 h-5" />
          정리하러 가기
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================
// 커스텀 원형 프로그레스 슬라이더
// ============================================

interface CircularProgressSliderProps {
  size: number;
  progress: number; // 0-1
  onDragProgress: (progress: number) => void;
  onDragEnd: (finalProgress: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

function CircularProgressSlider({
  size,
  progress,
  onDragProgress,
  onDragEnd,
  isDragging,
  setIsDragging,
}: CircularProgressSliderProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // SVG 설정 (280px 기준 1.4배 확대)
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2 - 4;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // 애니메이션 값 - 각도 (0-360)
  const baseAngle = progress * 360;
  const angle = useMotionValue(baseAngle);
  const springAngle = useSpring(angle, {
    stiffness: 200,  // 부드러운 탄성
    damping: 25,
    mass: 0.5
  });

  // 타이머 진행에 따라 각도 업데이트 (드래그 중이 아닐 때만)
  // isDraggingRef.current로 동기적 체크 (React state는 비동기라 타이밍 이슈 방지)
  useEffect(() => {
    if (!isDraggingRef.current) {
      angle.set(progress * 360);
    }
  }, [progress, angle]);

  // strokeDashoffset 계산
  const strokeDashoffset = useTransform(
    springAngle,
    [0, 360],
    [circumference, 0]
  );

  // 노브 위치 계산 (12시 방향에서 시작, 시계방향)
  // 캡슐 모양: 트랙 위에 놓여있음 (중심선 유지)
  const knobWidth = 56;
  const knobHeight = 28;
  const knobX = useTransform(springAngle, (a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return center + radius * Math.cos(rad) - knobWidth / 2;
  });
  const knobY = useTransform(springAngle, (a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return center + radius * Math.sin(rad) - knobHeight / 2;
  });
  // 노브 회전 (트랙 접선 방향)
  const knobRotation = useTransform(springAngle, (a) => a);

  // 마지막 유효한 각도 저장 (반시계방향 차단용)
  const lastValidAngle = React.useRef(baseAngle);

  // 드래그 상태 동기적 관리 (React state는 비동기이므로 ref로 즉시 체크)
  const isDraggingRef = React.useRef(false);

  // 포인터 위치에서 각도 계산
  const getAngleFromPoint = (clientX: number, clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg;
  };

  // 포인터 이동 핸들러
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) {
      return;
    }

    const newAngle = getAngleFromPoint(e.clientX, e.clientY);
    const currentAngle = lastValidAngle.current;

    // 360° 래핑 감지: 95% 이상(342°)에서 0° 근처(30° 미만)로 이동하면 완료
    if (currentAngle > 342 && newAngle < 30) {
      isDraggingRef.current = false;
      setIsDragging(false);
      onDragEnd(1.0);
      return;
    }

    // 역방향 래핑 감지: 0° 근처에서 360° 근처로 이동하면 반시계방향으로 차단
    if (currentAngle < 30 && newAngle > 330) {
      return;
    }

    // 반시계방향 드래그 차단
    const angleDiff = newAngle - currentAngle;
    const normalizedDiff = angleDiff > 180 ? angleDiff - 360 :
      angleDiff < -180 ? angleDiff + 360 : angleDiff;

    // 반시계방향으로 30도 이상 이동하면 차단
    if (normalizedDiff < -30) {
      return;
    }

    // 유효한 이동만 허용
    if (normalizedDiff >= 0 || Math.abs(normalizedDiff) < 30) {
      lastValidAngle.current = newAngle;
      angle.set(newAngle);
      onDragProgress(newAngle / 360);
    }
  };

  // 포인터 다운 핸들러 (드래그 시작)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    lastValidAngle.current = angle.get();
  };

  // 포인터 업 핸들러 (드래그 종료)
  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);

    const finalAngle = angle.get();
    const finalProgress = finalAngle / 360;

    isDraggingRef.current = false;
    setIsDragging(false);
    onDragEnd(finalProgress);

    // 95% 미만이면 원래 위치로 스프링 애니메이션
    if (finalProgress < 0.95) {
      angle.set(progress * 360);
      lastValidAngle.current = progress * 360;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 배경 트랙 - 연보라색 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e0e7ff"
          strokeWidth={strokeWidth}
        />

        {/* 프로그레스 아크 - 보라색 */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>

      {/* 노브 - 투명 + 화살표 */}
      <motion.div
        className="absolute rounded-full bg-transparent pointer-events-none flex items-center justify-center"
        style={{
          width: knobWidth,
          height: knobHeight,
          left: 0,
          top: 0,
          x: knobX,
          y: knobY,
          rotate: knobRotation,
        }}
      >
        <ArrowRight className="w-6 h-6 text-violet-600" />
      </motion.div>

      {/* 투명 드래그 핸들 - 전체 원 영역 (Pointer Events 사용) */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-full"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

// ============================================
// 즉흥 포모도로 타이머 화면
// ============================================

interface AdhocTimerViewProps {
  timerState: {
    status: 'idle' | 'running' | 'paused' | 'completed';
    remainingTime: number;
    elapsed: number;
    duration: number;
  };
  onStop: () => void;
  onComplete: () => void;
  // 타이머 컨트롤
  onPause: () => void;
  onResume: () => void;
  onAdjustTime: (deltaMs: number) => void;
  // 미완료 할일 관련 props
  linkedTodoId: string | null;
  linkedTodoTitle: string | null;
  inlineTodoInput: string;
  onInlineTodoInputChange: (value: string) => void;
  onCreateInlineTodo: () => void;
  onUpdateLinkedTodoTitle: (newTitle: string) => void;
  // 세션 복원 시 원본 시작 시간 (없으면 현재 시간 사용)
  originalStartTime?: Date;
  // 세션 복원 시 원본 duration (없으면 timerState.duration 사용)
  originalDuration?: number;
  // 화면 endTime 계산용 totalDuration (DB와 동기화)
  totalDuration: number | null;
  // 인물 연결 props
  joyfulPeopleIds: string[];
  shamefulPeopleIds: string[];
  onLinkedPeopleChange: (joyfulIds: string[], shamefulIds: string[]) => void;
  // PiP 타이머 props (iOS 15+)
  isPiPAvailable: boolean;
  isPiPActive: boolean;
  onStartPiP: (startTimeMs: number, durationMs: number, title?: string) => Promise<boolean>;
  onStopPiP: () => Promise<boolean>;
  // 타이머 표시 모드
  timerDisplayMode: TimerDisplayMode;
  onToggleDisplayMode: () => void;
}

function AdhocTimerView({
  timerState,
  onStop,
  onComplete,
  onPause,
  onResume,
  onAdjustTime,
  linkedTodoId,
  linkedTodoTitle,
  inlineTodoInput,
  onInlineTodoInputChange,
  onCreateInlineTodo,
  onUpdateLinkedTodoTitle,
  originalStartTime,
  originalDuration,
  totalDuration,
  joyfulPeopleIds,
  shamefulPeopleIds,
  onLinkedPeopleChange,
  isPiPAvailable,
  isPiPActive,
  onStartPiP,
  onStopPiP,
  timerDisplayMode,
  onToggleDisplayMode,
}: AdhocTimerViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [showPersonSelector, setShowPersonSelector] = useState(false);

  // 타이머 시작 시점 (세션 복원 시 원본 시간 사용, 아니면 현재 시간)
  const [startedAt] = useState(() => originalStartTime || new Date());

  // 원본 duration (세션 복원 시 DB의 duration, 아니면 timerState.duration)
  const effectiveDuration = originalDuration || timerState.duration;

  // 시간 포맷팅 (mm:ss) - 밀리초를 초로 변환
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 시간 포맷팅 (HH:mm) - 시작/종료 시간용
  const formatTimeHHMM = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 종료 예정 시간 계산 (DB와 동일한 방식: startedAt + totalDuration)
  // totalDuration이 있으면 DB 기반, 없으면 Worker 기반 (fallback)
  const endTime = totalDuration !== null
    ? new Date(startedAt.getTime() + totalDuration)
    : new Date(Date.now() + timerState.remainingTime);

  // 시간 간격 계산 (분 단위)
  const durationMinutes = Math.round((totalDuration ?? effectiveDuration) / (60 * 1000));

  // 진행률 계산 (0.01-1) - 원본 duration 기준으로 계산
  // Math.max(0.01, ...) 로 clamp: 최소 1% 게이지 항상 표시 + 음수 방지
  const progress = effectiveDuration > 0
    ? Math.max(0.01, Math.min(1, (effectiveDuration - timerState.remainingTime) / effectiveDuration))
    : 0.01;

  // 타이머 자연 완료 감지
  useEffect(() => {
    if (timerState.remainingTime <= 0 && timerState.status === 'running') {
      onComplete();
    }
  }, [timerState.remainingTime, timerState.status, onComplete]);

  // 드래그 중 진행률 업데이트
  const handleDragProgress = () => {
    // 드래그 중에는 UI 피드백만 제공 (실제 타이머는 변경하지 않음)
  };

  // 드래그 종료 처리
  const handleDragEnd = (finalProgress: number) => {
    // 95% 이상이면 완료 처리
    if (finalProgress >= 0.95) {
      onComplete();
    }
    // 95% 미만이면 CircularProgressSlider가 자동으로 스냅백 처리
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-sm text-center"
    >
      {/* 상단: 할일 제목 또는 "포커스" */}
      {linkedTodoId ? (
        isEditingTitle ? (
          <input
            autoFocus
            value={editingTitleValue}
            onChange={(e) => setEditingTitleValue(e.target.value)}
            onBlur={() => {
              if (editingTitleValue.trim() && editingTitleValue !== linkedTodoTitle) {
                onUpdateLinkedTodoTitle(editingTitleValue.trim());
              }
              setIsEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (editingTitleValue.trim() && editingTitleValue !== linkedTodoTitle) {
                  onUpdateLinkedTodoTitle(editingTitleValue.trim());
                }
                setIsEditingTitle(false);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsEditingTitle(false);
              }
            }}
            className="text-2xl font-bold text-base-content text-center bg-transparent border-none outline-none w-full mb-1"
            placeholder="할일 제목"
          />
        ) : (
          <h2
            onClick={() => {
              setEditingTitleValue(linkedTodoTitle || '');
              setIsEditingTitle(true);
            }}
            className="text-2xl font-bold text-base-content mb-1 cursor-pointer hover:opacity-70 transition-opacity break-words px-4"
          >
            {linkedTodoTitle}
          </h2>
        )
      ) : (
        <h2 className="text-2xl font-bold text-base-content mb-1">포커스</h2>
      )}

      {/* 시작 → 종료 시간 (간격 포함) */}
      <p className="text-base text-base-content/60 mb-6">
        {formatTimeHHMM(startedAt)} → {formatTimeHHMM(endTime)} ({durationMinutes}분)
      </p>

      {/* 타이머 원형 디스플레이 (280px, 1.4배 확대) */}
      <div className="relative mx-auto mb-4" style={{ width: 280, height: 280 }}>
        <CircularProgressSlider
          size={280}
          progress={progress}
          onDragProgress={handleDragProgress}
          onDragEnd={handleDragEnd}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />

        {/* 중앙에 Zap 아이콘 */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            scale: isDragging ? 0.95 : 1,
            opacity: isDragging ? 0.8 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Zap className="w-16 h-16 text-violet-500" />
        </motion.div>
      </div>

      {/* 시간 표시 - 원 아래 (클릭하면 모드 전환: 둘다 → 경과만 → 남은만 → 둘다) */}
      <div className="text-center mb-4 cursor-pointer select-none" onClick={onToggleDisplayMode}>
        {/* 경과 시간 (totalDuration - remainingTime으로 계산: 세션 복원/+1분 버튼 대응) */}
        {(timerDisplayMode === 'elapsed' || timerDisplayMode === 'both') && (
          <div className={timerDisplayMode === 'both' ? 'text-sm text-base-content/60 mb-1' : 'text-4xl font-bold text-base-content'}>
            {formatTime(Math.max(0, (totalDuration ?? effectiveDuration) - timerState.remainingTime))}
            {timerDisplayMode === 'both' && ' 경과'}
          </div>
        )}

        {/* 남은 시간 */}
        {(timerDisplayMode === 'remaining' || timerDisplayMode === 'both') && (
          <span className="text-4xl font-bold text-base-content">
            {formatTime(timerState.remainingTime)}
          </span>
        )}
      </div>

      {/* 타이머 컨트롤 버튼 (-1분, 재생/중지, +1분, PiP) */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAdjustTime(-60000)}
          className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors"
        >
          -1분
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={timerState.status === 'paused' ? onResume : onPause}
          className="btn btn-neutral rounded-full px-6"
        >
          {timerState.status === 'paused' ? (
            <Play className="w-5 h-5" />
          ) : (
            <Pause className="w-5 h-5" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAdjustTime(60000)}
          className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors"
        >
          +1분
        </motion.button>

        {/* PiP 타이머 버튼 (iOS 15+) */}
        {isPiPAvailable && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (isPiPActive) {
                onStopPiP();
              } else {
                // 시작 시간 기반 동기화: startTimeMs와 durationMs 전달
                onStartPiP(
                  startedAt.getTime(),        // 시작 시간 (Unix timestamp, ms)
                  effectiveDuration,           // 총 시간 (ms)
                  linkedTodoTitle || '포커스'
                );
              }
            }}
            className={`btn btn-circle btn-ghost ${isPiPActive ? 'text-primary' : 'text-base-content/70'}`}
            title={isPiPActive ? 'PiP 종료' : 'PiP 타이머로 보기'}
          >
            <PictureInPicture2 className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* 미완료 할일 입력 (제목 없을 때만) */}
      {!linkedTodoId && (
        <div className="mb-4 px-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inlineTodoInput}
              onChange={(e) => onInlineTodoInputChange(e.target.value)}
              placeholder="지금 무엇을 하세요?"
              className="input input-bordered input-sm flex-1 rounded-full text-center"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inlineTodoInput.trim()) {
                  onCreateInlineTodo();
                }
              }}
            />
            {inlineTodoInput.trim() && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCreateInlineTodo}
                className="btn btn-primary btn-sm btn-circle"
              >
                <Check className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* 안내 문구 */}
      <p className="text-sm text-base-content/50 mb-4">
        {linkedTodoId ? (
          <>원을 드래그해서 바로 끝낼 수도 있어요</>
        ) : (
          <>지금 기록안해도 끝나면 뭐 했는지 물어볼게요<br />원을 드래그해서 바로 끝낼 수도 있어요</>
        )}
      </p>

      {/* 인물 연결 미리보기 */}
      <div className="w-full max-w-xs mb-6 mx-auto">
        <PersonLinksPreview
          joyfulPeopleIds={joyfulPeopleIds}
          shamefulPeopleIds={shamefulPeopleIds}
          onEdit={() => setShowPersonSelector(!showPersonSelector)}
        />

        {/* 인물 선택 UI */}
        {showPersonSelector && (
          <div className="mt-3 space-y-3">
            <PersonSelector
              selectedPeopleIds={joyfulPeopleIds}
              onSelectionChange={(ids) => onLinkedPeopleChange(ids, shamefulPeopleIds)}
              linkType="joyful"
            />
            <PersonSelector
              selectedPeopleIds={shamefulPeopleIds}
              onSelectionChange={(ids) => onLinkedPeopleChange(joyfulPeopleIds, ids)}
              linkType="shameful"
            />
          </div>
        )}
      </div>

      {/* 중단 버튼 */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onStop}
        className="btn btn-ghost btn-md rounded-full border border-base-300"
      >
        <Square className="w-4 h-4" />
        그만할래
      </motion.button>
    </motion.div>
  );
}

// ============================================
// 즉흥 완료 후 기록 화면
// ============================================

interface AdhocCaptureViewProps {
  title: string;
  onTitleChange: (title: string) => void;
  onCapture: () => void;
  onSkip: () => void;
  isAnimating: boolean;
  // 인물 연결 props
  joyfulPeopleIds: string[];
  shamefulPeopleIds: string[];
  onLinkedPeopleChange: (joyfulIds: string[], shamefulIds: string[]) => void;
}

function AdhocCaptureView({
  title,
  onTitleChange,
  onCapture,
  onSkip,
  isAnimating,
  joyfulPeopleIds,
  shamefulPeopleIds,
  onLinkedPeopleChange,
}: AdhocCaptureViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <Check className="w-16 h-16 mx-auto text-success mb-4" />

      <h2 className="text-xl font-bold text-base-content mb-2">
        뭐 했어요?
      </h2>

      <p className="text-base-content/60 mb-6">
        방금 한 일을 기록해두면 나중에 도움이 돼요
      </p>

      {/* 입력 필드 */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="방금 한 일을 한 줄로"
        className="input input-bordered w-full rounded-xl mb-4 text-center"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            onCapture();
          }
        }}
      />

      {/* 인물 연결 섹션 */}
      <div className="space-y-2 mb-6">
        <PersonSelector
          selectedPeopleIds={joyfulPeopleIds}
          onSelectionChange={(ids) => onLinkedPeopleChange(ids, shamefulPeopleIds)}
          linkType="joyful"
          compact
        />
        <PersonSelector
          selectedPeopleIds={shamefulPeopleIds}
          onSelectionChange={(ids) => onLinkedPeopleChange(joyfulPeopleIds, ids)}
          linkType="shameful"
          compact
        />
      </div>

      <div className="flex flex-col gap-3">
        {/* 기록할게 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCapture}
          disabled={!title.trim() || isAnimating}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          기록할게
        </motion.button>

        {/* 그냥 넘어갈게 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-base-content/50"
        >
          그냥 넘어갈게
        </motion.button>
      </div>
    </motion.div>
  );
}
