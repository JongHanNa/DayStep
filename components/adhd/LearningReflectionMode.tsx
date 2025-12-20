'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Heart,
  BookOpen,
  Sparkles,
  Check,
  Clock,
  Minus,
  Plus,
  History,
  Star,
  Lightbulb,
  FolderPlus,
  ListTodo,
  ChevronRight,
  Calendar,
  CalendarClock,
  Save,
  X,
  Trash2,
  Sun,
  Moon,
  Target,
  PenLine,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import type { MoodLevel, TodoDraft } from '@/types/learning-reflection';
import { LEARNING_FIELD_LABELS, PROJECT_DERIVE_LABELS, TODO_PLANNING_LABELS } from '@/types/learning-reflection';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import type { Project } from '@/types/second-brain';
import type { Goal } from '@/types/second-brain';
import { useNoteStore, type Note } from '@/state/stores/noteStore';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTheme } from '@/hooks/useTheme';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { UsageWarningBanner } from '@/components/subscription/UsageWarningBanner';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface LearningReflectionModeProps {
  onExit: () => void;
}

// 타이머 옵션 (분)
const TIMER_OPTIONS = [5, 10, 15, 20];

// 기분 이모지
const MOOD_EMOJIS = [
  { value: 1 as const, emoji: '😢', label: '힘들어요' },
  { value: 2 as const, emoji: '😐', label: '그저그래요' },
  { value: 3 as const, emoji: '😊', label: '괜찮아요' },
  { value: 4 as const, emoji: '😄', label: '좋아요' },
  { value: 5 as const, emoji: '🥰', label: '행복해요' },
];

// 통합 태그 옵션 (entry_type을 태그로 대체)
const UNIFIED_TAGS = [
  '깨달음', '성장', '도전', '수집', '결심',
  '위로', '희망', '평안', '격려', '감동',
  '감사', '가족', '친구', '건강', '일상',
];

/**
 * 쉬운 정리 패턴 모드
 *
 * ExecutionMode처럼 타이머와 함께 기록 시간을 갖습니다.
 * 타이머 진행 중에 생각을 수집하고, 명료화하고, 할일을 계획합니다.
 */
export default function LearningReflectionMode({ onExit }: LearningReflectionModeProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    learningReflectionMode,
    setLearningReflectionViewState,
    setLearningReflectionDraft,
    resetLearningReflectionDraft,
    endLearningReflectionMode,
    setCurrentRecommendation,
    enterExecuteMode,
  } = useADHDModeStore();

  // Capture 노트 관리 (noteStore 사용)
  const {
    notes,
    getCaptureNotes,
    createCaptureNote,
    getUnprocessedCaptureNotes,
    markNoteAsProcessed,
    pinNote,
    unpinNote,
    loading: notesLoading,
  } = useNoteStore();

  // Capture 노트만 필터링 (entries 대신 사용)
  const captureNotes = useMemo(() =>
    notes.filter(note => note.note_category === 'capture'),
    [notes]
  );

  // 포모도로 훅 (Web Worker 기반 실제 타이머)
  const {
    timerState,
    startTimer: startPomodoroTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    adjustTime,
  } = usePomodoro();

  const { resolvedTheme, setTheme } = useTheme();
  const { checkAndProceed, limitResult, isModalOpen: isLimitModalOpen, closeModal: closeLimitModal, onCreateSuccess } = useUsageLimitCheck();

  // 로컬 상태
  const [selectedDuration, setSelectedDuration] = useState(10); // 기본 10분
  const [moodRating, setMoodRating] = useState<MoodLevel | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [quickTodoTitle, setQuickTodoTitle] = useState(''); // 빠른 할일 제목
  const [scheduledTodoTitle, setScheduledTodoTitle] = useState(''); // 예약 할일 제목
  const [scheduledDate, setScheduledDate] = useState(''); // 예약 날짜
  const [scheduledTime, setScheduledTime] = useState(''); // 예약 시간
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null); // 기존 수집에서 할일 만들기 시 해당 노트 ID

  const {
    viewState,
    draftContent,
    draftSourceText,
    draftSourceReference,
    draftExperience,
    draftCommitment,
    // 과제 도출 필드
    selectedProjectId,
    newProjectTitle,
    newProjectExpectedOutcome,
    selectedGoalId,
    // 할일 계획 필드
    newProjectPreparation,
    todosDraft,
  } = learningReflectionMode;

  // 프로젝트/할일/목표 스토어
  const { projects, fetchProjects, createProject } = useProjectStore();
  const { goals, fetchGoals } = useGoalStore();
  const { createTodo } = useTodoStore();

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      fetchProjects(userId);
      fetchGoals(userId);
    }
  }, [userId, fetchProjects, fetchGoals]);

  // 타이머 없이 바로 시작
  const [skipTimer, setSkipTimer] = useState(false);

  // 허브 화면 또는 history 뷰일 때 기록 로드
  useEffect(() => {
    if (userId && (viewState === 'history' || viewState === 'select-duration')) {
      getCaptureNotes(userId);
    }
  }, [userId, viewState, getCaptureNotes]);

  // 타이머 시작 시 - 질문 기능 제거됨 (DB 테이블 삭제)
  // 이전: loadRandomPrompt('reflection')

  // 타이머 완료 감지
  useEffect(() => {
    if (timerState.status === 'completed' && viewState === 'reflection-input') {
      handleTimerComplete();
    }
  }, [timerState.status, viewState]);

  // 타이머 시작
  const handleStartTimer = () => {
    setLearningReflectionViewState('reflection-input');
    if (!skipTimer) {
      startPomodoroTimer(selectedDuration * 60 * 1000);
    }
  };

  // 타이머 없이 시작
  const handleStartWithoutTimer = () => {
    setSkipTimer(true);
    setLearningReflectionViewState('reflection-input');
  };

  // 선택지 화면으로 이동 (수집 후)
  const handleGoToActionChoice = () => {
    stopTimer();
    setLearningReflectionViewState('action-choice');
  };

  // 지금 바로 할래 → 할일 입력 화면
  const handleQuickTodo = () => {
    setLearningReflectionViewState('quick-todo');
  };

  // 언제 할지 정할래 → 예약 할일 화면
  const handleScheduledTodo = () => {
    setLearningReflectionViewState('scheduled-todo');
  };

  // 저장만 할래 → 바로 저장 후 completed 화면
  const handleSaveOnly = async () => {
    if (!userId || !draftContent.trim()) return;

    setIsSaving(true);
    try {
      // 기분/태그 없이 바로 저장
      await saveEntry();
      setLearningReflectionViewState('completed');
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 지금 바로 할래 → 수집 저장 + 할일 생성 + ExecutionMode로 이동
  const handleStartQuickTodo = async () => {
    if (!userId || !quickTodoTitle.trim()) return;

    setIsSaving(true);
    try {
      // 1. 수집 저장 (프로젝트 연결 없이)
      await saveEntry();

      // 2. 할일 생성 (오늘 날짜, anytime)
      const today = new Date();
      // 한국 시간 자정을 UTC로 변환
      const startTime = new Date(`${today.toISOString().split('T')[0]}T00:00:00+09:00`).toISOString();
      const newTodo = await createTodo({
        user_id: userId,
        title: quickTodoTitle.trim(),
        start_time: startTime,
        schedule_type: 'anytime' as const,
        is_today_highlight: true, // 오늘의 하이라이트로 설정
      });

      if (newTodo) {
        // 3. 기존 수집에서 할일 만들기였으면 해당 노트를 처리됨으로 표시
        if (selectedNoteId) {
          await markNoteAsProcessed(selectedNoteId);
          setSelectedNoteId(null); // 초기화
        }

        // 4. ExecutionMode에 할일 설정
        setCurrentRecommendation(newTodo);

        // 5. ExecutionMode로 전환
        await enterExecuteMode(userId);
      }
    } catch (error) {
      console.error('빠른 할일 생성 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 예약 할일 저장 → 수집 저장 + 할일 생성 (날짜/시간 포함)
  const handleSaveScheduledTodo = async () => {
    if (!userId || !scheduledTodoTitle.trim() || !scheduledDate) return;

    setIsSaving(true);
    try {
      // 1. 수집 저장
      await saveEntry();

      // 2. 할일 생성 (예약된 날짜/시간)
      // 시간이 있으면 해당 시간, 없으면 자정으로 설정
      let startTime: string;
      if (scheduledTime) {
        startTime = new Date(`${scheduledDate}T${scheduledTime}:00+09:00`).toISOString();
      } else {
        startTime = new Date(`${scheduledDate}T00:00:00+09:00`).toISOString();
      }

      await createTodo({
        user_id: userId,
        title: scheduledTodoTitle.trim(),
        start_time: startTime,
        schedule_type: scheduledTime ? 'timed' as const : 'anytime' as const,
      });

      // 3. 기존 수집에서 할일 만들기였으면 해당 노트를 처리됨으로 표시
      if (selectedNoteId) {
        await markNoteAsProcessed(selectedNoteId);
        setSelectedNoteId(null); // 초기화
      }

      // 4. 완료 화면으로 이동
      setLearningReflectionViewState('completed');
    } catch (error) {
      console.error('예약 할일 생성 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 과제 없이 끝내기
  const handleFinishWithoutProject = async () => {
    await saveEntry();
    setLearningReflectionViewState('completed');
  };

  // 할일 없이 끝내기
  const handleFinishWithoutTodos = async () => {
    await saveEntryAndProject();
    setLearningReflectionViewState('completed');
  };

  // 전체 완료 (할일까지)
  const handleCompleteAll = async () => {
    await saveEntryAndProjectAndTodos();
    setLearningReflectionViewState('completed');
  };

  // 할일 초안 추가
  const handleAddTodoDraft = () => {
    const newTodo: TodoDraft = {
      id: `draft-${Date.now()}`,
      title: '',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      scheduledTime: null,
    };
    setLearningReflectionDraft({ todosDraft: [...todosDraft, newTodo] });
  };

  // 할일 초안 수정
  const handleUpdateTodoDraft = (id: string, updates: Partial<TodoDraft>) => {
    setLearningReflectionDraft({
      todosDraft: todosDraft.map(t => t.id === id ? { ...t, ...updates } : t),
    });
  };

  // 할일 초안 삭제
  const handleRemoveTodoDraft = (id: string) => {
    setLearningReflectionDraft({ todosDraft: todosDraft.filter(t => t.id !== id) });
  };

  // 수집 저장 (notes 테이블에 capture로 저장)
  const saveEntry = async () => {
    if (!userId || !draftContent.trim()) return null;

    const note = await createCaptureNote({
      content: draftContent.trim(),
      source_text: draftSourceText.trim() || null,
      source_reference: draftSourceReference.trim() || null,
      linked_date: format(new Date(), 'yyyy-MM-dd'),
      is_pinned: false,
    });
    return note;
  };

  // 수집 + 프로젝트 저장
  const saveEntryAndProject = async () => {
    if (!userId) return;

    // 새 프로젝트 생성
    if (!selectedProjectId && newProjectTitle.trim()) {
      await createProject(userId, {
        title: newProjectTitle.trim(),
        expected_outcome: newProjectExpectedOutcome.trim() || undefined,
        preparation: newProjectPreparation.trim() || undefined,
        goal_id: selectedGoalId || undefined,
        color: '#6366f1', // 기본 인디고 색상
        order_index: 0,
        status: 'not_started',
      });
    }

    await saveEntry();
  };

  // 수집 + 프로젝트 + 할일 저장
  const saveEntryAndProjectAndTodos = async () => {
    if (!userId) return;

    // 할일 생성이 필요한지 확인
    const validTodos = todosDraft.filter(draft => draft.title.trim());
    const needsTodoCreation = validTodos.length > 0;

    // 할일 생성이 필요한 경우 용량 체크
    if (needsTodoCreation) {
      await checkAndProceed('todo', async () => {
        await executeEntryAndProjectAndTodos();
      });
    } else {
      // 할일 없이 프로젝트와 기록만 저장
      await executeEntryAndProjectAndTodosWithoutTodos();
    }
  };

  // 실제 저장 로직 (할일 포함)
  const executeEntryAndProjectAndTodos = async () => {
    if (!userId) return;

    let projectId = selectedProjectId;

    // 새 프로젝트 생성
    if (!selectedProjectId && newProjectTitle.trim()) {
      const newProject = await createProject(userId, {
        title: newProjectTitle.trim(),
        expected_outcome: newProjectExpectedOutcome.trim() || undefined,
        preparation: newProjectPreparation.trim() || undefined,
        goal_id: selectedGoalId || undefined,
        color: '#6366f1', // 기본 인디고 색상
        order_index: 0,
        status: 'not_started',
      });
      if (newProject) {
        projectId = newProject.id;
      }
    }

    // 할일 저장
    for (const draft of todosDraft) {
      if (draft.title.trim()) {
        await createTodo({
          title: draft.title.trim(),
          user_id: userId,
          schedule_type: 'anytime',
          project_ids: projectId ? [projectId] : undefined,
        });
        onCreateSuccess('todo');
      }
    }

    await saveEntry();
    setLearningReflectionViewState('completed');
  };

  // 할일 없이 저장 (프로젝트 + 기록만)
  const executeEntryAndProjectAndTodosWithoutTodos = async () => {
    if (!userId) return;

    // 새 프로젝트 생성
    if (!selectedProjectId && newProjectTitle.trim()) {
      await createProject(userId, {
        title: newProjectTitle.trim(),
        expected_outcome: newProjectExpectedOutcome.trim() || undefined,
        preparation: newProjectPreparation.trim() || undefined,
        goal_id: selectedGoalId || undefined,
        color: '#6366f1',
        order_index: 0,
        status: 'not_started',
      });
    }

    await saveEntry();
    setLearningReflectionViewState('completed');
  };

  // 생성된 프로젝트 이름 (완료 화면용)
  const createdProjectName = useMemo(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      return project?.title || '';
    }
    return newProjectTitle;
  }, [selectedProjectId, newProjectTitle, projects]);

  // 타이머 완료 처리
  const handleTimerComplete = useCallback(() => {
    stopTimer();
    setLearningReflectionViewState('capture');
  }, [stopTimer, setLearningReflectionViewState]);

  // 타이머 드래그로 완료
  const handleDragComplete = () => {
    stopTimer();
    setLearningReflectionViewState('capture');
  };

  // 타이머 중지 (뒤로가기)
  const handleStopTimer = () => {
    stopTimer();
    resetLearningReflectionDraft();
    setLearningReflectionViewState('select-duration');
  };

  // 시간 조정
  const handleAdjustTime = (minutes: number) => {
    adjustTime(minutes * 60 * 1000);
  };

  // 기록 저장 (capture 화면에서 기분/태그 선택 후 저장 - 현재는 거의 사용 안함)
  const handleSave = async () => {
    if (!userId || !draftContent.trim()) return;

    setIsSaving(true);
    try {
      await createCaptureNote({
        user_id: userId,
        content: draftContent.trim(),
        source_text: draftSourceText.trim() || null,
        source_reference: draftSourceReference.trim() || null,
        linked_date: format(new Date(), 'yyyy-MM-dd'),
        is_pinned: false,
      });

      resetLearningReflectionDraft();
      setMoodRating(null);
      setSelectedTags([]);
      setLearningReflectionViewState('completed');
    } catch (error) {
      console.error('기록 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 저장 건너뛰기
  const handleSkipSave = () => {
    resetLearningReflectionDraft();
    setMoodRating(null);
    setSelectedTags([]);
    setLearningReflectionViewState('completed');
  };

  // 뒤로가기 처리
  const handleBack = () => {
    switch (viewState) {
      case 'reflection-input':
        handleStopTimer();
        break;
      case 'action-choice':
        setLearningReflectionViewState('reflection-input');
        break;
      case 'quick-todo':
      case 'scheduled-todo':
        setLearningReflectionViewState('action-choice');
        break;
      case 'capture':
        setLearningReflectionViewState('action-choice');
        break;
      case 'history':
        setLearningReflectionViewState('select-duration');
        break;
      case 'completed':
        endLearningReflectionMode();
        onExit();
        break;
      default:
        endLearningReflectionMode();
        onExit();
    }
  };

  // 태그 토글
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // 시간 포맷팅
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 진행률 계산
  const progress = timerState.duration > 0
    ? ((timerState.duration - timerState.remainingTime) / timerState.duration) * 100
    : 0;

  // ============================================
  // 뷰 렌더링
  // ============================================

  // 타이머 시간 선택 화면 (쉬운 정리 패턴)
  // 미처리 수집 목록 (is_processed가 false인 것만 전체 표시)
  const unprocessedEntries = useMemo(() => {
    return captureNotes.filter(note => !note.is_processed);
  }, [captureNotes]);

  // "실행과 집중으로 가기" 핸들러
  const handleGoToExecute = useCallback(() => {
    if (!userId) return;
    endLearningReflectionMode();
    enterExecuteMode(userId);
  }, [userId, endLearningReflectionMode, enterExecuteMode]);

  // "새로 수집하기" 핸들러 (기본 10분 타이머로 바로 시작)
  const handleStartNewCollection = useCallback(() => {
    setSelectedDuration(10); // 기본 10분
    setSkipTimer(false);
    handleStartTimer();
  }, [handleStartTimer]);

  // 미처리 수집에서 "할일 만들기" 핸들러
  const handleCreateTodoFromEntry = useCallback((note: Note) => {
    // 해당 수집의 노트 ID 저장 (할일 생성 후 처리됨으로 표시하기 위해)
    setSelectedNoteId(note.id);
    // 해당 수집의 내용을 draft에 로드
    setLearningReflectionDraft({
      content: note.content,
      sourceText: note.source_text || '',
      sourceReference: note.source_reference || '',
      experience: '', // Note에는 experience 필드가 없음
    });
    // action-choice 화면으로 이동
    setLearningReflectionViewState('action-choice');
  }, [setLearningReflectionDraft, setLearningReflectionViewState]);

  const renderSelectDurationView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full"
    >
      {/* 헤더 - 고정 영역 */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={handleBack} className="btn btn-ghost btn-circle">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">쉬운 정리 패턴</h1>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="btn btn-circle btn-sm btn-ghost"
          aria-label="테마 전환"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* 콘텐츠 - 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 mobile-container">
        {/* 용량 경고 배너 */}
        <UsageWarningBanner
          entities={['todo']}
          className="mb-4"
        />

        {/* TODO: 연속 기록 기능은 notes 테이블 기반으로 재구현 필요 */}

        {/* 메인 액션 버튼들 */}
        <div className="flex flex-col gap-3 mb-6">
          {/* 실행과 집중으로 가기 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoToExecute}
            className="btn btn-primary btn-lg w-full rounded-2xl h-16 flex items-center justify-center gap-3 shadow-lg"
          >
            <Target className="w-6 h-6" />
            <span className="text-lg font-semibold">실행과 집중으로 가기</span>
          </motion.button>

          {/* 새로 수집하기 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartNewCollection}
            className="btn btn-lg w-full rounded-2xl h-16 flex items-center justify-center gap-3 shadow-lg bg-orange-500 text-white border-none hover:bg-orange-600"
          >
            <PenLine className="w-6 h-6" />
            <span className="text-lg font-semibold">새로 수집하기</span>
          </motion.button>
        </div>

        {/* 미처리 수집 목록 */}
        {unprocessedEntries.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-base-content/70">미처리 수집</span>
              <span className="text-xs text-base-content/50">({unprocessedEntries.length}개)</span>
            </div>
            <div className="flex flex-col gap-2">
              {unprocessedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 bg-base-200 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.content}</p>
                    <p className="text-xs text-base-content/50">
                      {format(new Date(entry.created_at), 'M/d', { locale: ko })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreateTodoFromEntry(entry)}
                    className="btn btn-sm btn-ghost text-primary"
                  >
                    <ListTodo className="w-4 h-4" />
                    <span className="hidden sm:inline">할일 만들기</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 전체 기록 보기 */}
        <button
          onClick={() => setLearningReflectionViewState('history')}
          className="btn btn-ghost gap-2 w-full"
        >
          <History className="w-5 h-5" />
          전체 기록 보기
        </button>
      </div>
    </motion.div>
  );

  // 수집 화면 (reflection-input)
  const renderTimerRunningView = () => {
    const showTimer = !skipTimer && timerState.duration > 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full p-4 overflow-y-auto mobile-container"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleStopTimer} className="btn btn-ghost btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <BookOpen className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-bold">수집</h1>
        </div>

        {/* 오늘의 힌트 (정적 프롬프트) */}
        <div className="p-3 bg-base-200 rounded-xl mb-4">
          <p className="text-sm text-base-content/60 mb-1">💡 오늘의 힌트</p>
          <p className="font-medium">지금 떠오르는 게 뭐야?</p>
        </div>

        {/* 원형 타이머 (타이머 선택 시만 표시) */}
        {showTimer && (
          <>
            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="6"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={2 * Math.PI * 56 * (1 - progress / 100)}
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{formatTime(timerState.remainingTime)}</span>
                </div>
              </div>
            </div>

            {/* 타이머 컨트롤 */}
            <div className="flex justify-center items-center gap-4 mb-4">
              <button onClick={() => handleAdjustTime(-1)} className="btn btn-ghost btn-xs">
                <Minus className="w-3 h-3" /> 1분
              </button>
              {timerState.isRunning ? (
                <button onClick={pauseTimer} className="btn btn-warning btn-circle">
                  <Pause className="w-5 h-5" />
                </button>
              ) : (
                <button onClick={resumeTimer} className="btn btn-warning btn-circle">
                  <Play className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => handleAdjustTime(1)} className="btn btn-ghost btn-xs">
                <Plus className="w-3 h-3" /> 1분
              </button>
            </div>
          </>
        )}

        {/* 수집 입력 폼 - 단순화 (2개 필드 + 더 적기) */}
        <div className="flex-1 space-y-4">
          {/* 1. 떠오른 것 (필수) - 메인 필드 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {LEARNING_FIELD_LABELS.content.label}{' '}
              {LEARNING_FIELD_LABELS.content.required && <span className="text-amber-500">*</span>}
            </label>
            <textarea
              value={draftContent}
              onChange={(e) => setLearningReflectionDraft({ content: e.target.value })}
              placeholder={LEARNING_FIELD_LABELS.content.placeholder}
              className="textarea textarea-bordered w-full h-32 resize-none"
              autoFocus
            />
          </div>

          {/* 2. 출처 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {LEARNING_FIELD_LABELS.sourceReference.label}{' '}
              <span className="text-base-content/40">(선택)</span>
            </label>
            <input
              type="text"
              value={draftSourceReference}
              onChange={(e) => setLearningReflectionDraft({ sourceReference: e.target.value })}
              placeholder={LEARNING_FIELD_LABELS.sourceReference.placeholder}
              className="input input-bordered w-full"
            />
          </div>

          {/* 더 적기 (펼침) */}
          <details className="collapse collapse-arrow bg-base-200 rounded-lg">
            <summary className="collapse-title text-sm font-medium min-h-0 py-2 px-3">
              더 적기
            </summary>
            <div className="collapse-content space-y-3 px-3 pb-3">
              {/* 상세 내용 */}
              <div>
                <label className="text-sm font-medium text-base-content/70 mb-1 block">
                  {LEARNING_FIELD_LABELS.sourceText.label}
                </label>
                <textarea
                  value={draftSourceText}
                  onChange={(e) => setLearningReflectionDraft({ sourceText: e.target.value })}
                  placeholder={LEARNING_FIELD_LABELS.sourceText.placeholder}
                  className="textarea textarea-bordered w-full h-20 resize-none"
                />
              </div>

              {/* 관련 경험 */}
              <div>
                <label className="text-sm font-medium text-base-content/70 mb-1 block">
                  {LEARNING_FIELD_LABELS.experience.label}
                </label>
                <textarea
                  value={draftExperience}
                  onChange={(e) => setLearningReflectionDraft({ experience: e.target.value })}
                  placeholder={LEARNING_FIELD_LABELS.experience.placeholder}
                  className="textarea textarea-bordered w-full h-20 resize-none"
                />
              </div>
            </div>
          </details>
        </div>

        {/* 하단 버튼 */}
        <div className="mt-4">
          <button
            onClick={handleGoToActionChoice}
            disabled={!draftContent.trim()}
            className="btn btn-primary w-full gap-2"
          >
            이걸로 뭐 할래?
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  // 선택지 화면 (action-choice)
  const renderActionChoiceView = () => {
    return (
      <motion.div
        key="action-choice"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full p-4"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setLearningReflectionViewState('reflection-input')}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">이걸로 뭐 할래?</h1>
        </div>

        {/* 수집한 내용 미리보기 */}
        <div className="bg-base-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-base-content/60 mb-1">수집한 내용</p>
          <p className="text-base-content line-clamp-3">{draftContent}</p>
        </div>

        {/* 선택지 버튼들 */}
        <div className="flex-1 flex flex-col gap-4">
          {/* 지금 바로 할래 - 가장 눈에 띄게 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleQuickTodo}
            className="btn btn-primary btn-lg w-full h-20 flex items-center justify-center gap-3 shadow-lg"
          >
            <Play className="w-7 h-7" />
            <span className="text-xl font-semibold">지금 바로 할래</span>
          </motion.button>

          {/* 언제 할지 정할래 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleScheduledTodo}
            className="btn btn-ghost btn-lg w-full h-16 flex items-center justify-center gap-3 border-2 border-base-300 bg-base-200"
          >
            <CalendarClock className="w-6 h-6" />
            <span className="text-lg font-semibold">언제 할지 정할래</span>
          </motion.button>

          {/* 일단 저장만 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveOnly}
            disabled={isSaving}
            className="btn btn-ghost btn-md w-full flex items-center justify-center gap-2 text-base-content/60"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{isSaving ? '저장 중...' : '일단 저장만'}</span>
          </motion.button>
        </div>
      </motion.div>
    );
  };

  // 빠른 할일 화면 (quick-todo)
  const renderQuickTodoView = () => {
    return (
      <motion.div
        key="quick-todo"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full p-4"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setLearningReflectionViewState('action-choice')}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">지금 바로 할래</h1>
        </div>

        {/* 수집한 내용 미리보기 */}
        <div className="bg-base-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-base-content/60 mb-1">수집한 내용</p>
          <p className="text-base-content line-clamp-2">{draftContent}</p>
        </div>

        {/* 할일 제목 입력 */}
        <div className="flex-1">
          <label className="text-sm font-medium text-base-content/70 mb-2 block">
            이걸로 뭘 할까?
          </label>
          <input
            type="text"
            value={quickTodoTitle}
            onChange={(e) => setQuickTodoTitle(e.target.value)}
            placeholder="가장 작은 것 하나만"
            className="input input-bordered w-full text-lg"
            autoFocus
          />
          <p className="text-xs text-base-content/50 mt-2">
            작게 시작하면 더 쉬워요
          </p>
        </div>

        {/* 하단 버튼 */}
        <div className="mt-auto">
          <button
            onClick={handleStartQuickTodo}
            disabled={!quickTodoTitle.trim() || isSaving}
            className="btn btn-primary btn-lg w-full gap-2"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                타이머 켜고 시작
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  // 예약 할일 화면 (scheduled-todo)
  const renderScheduledTodoView = () => {
    // 기본 날짜를 오늘로 설정
    const today = new Date().toISOString().split('T')[0];

    return (
      <motion.div
        key="scheduled-todo"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full p-4"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setLearningReflectionViewState('action-choice')}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">언제 할지 정할래</h1>
        </div>

        {/* 수집한 내용 미리보기 */}
        <div className="bg-base-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-base-content/60 mb-1">수집한 내용</p>
          <p className="text-base-content line-clamp-2">{draftContent}</p>
        </div>

        {/* 할일 입력 */}
        <div className="space-y-4 flex-1">
          {/* 할일 제목 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              이걸로 뭘 할까?
            </label>
            <input
              type="text"
              value={scheduledTodoTitle}
              onChange={(e) => setScheduledTodoTitle(e.target.value)}
              placeholder="할일을 적어주세요"
              className="input input-bordered w-full"
              autoFocus
            />
          </div>

          {/* 날짜 선택 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              언제 할래?
            </label>
            <input
              type="date"
              value={scheduledDate || today}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={today}
              className="input input-bordered w-full"
            />
          </div>

          {/* 시간 선택 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              <Clock className="w-4 h-4 inline mr-1" />
              몇 시에? <span className="text-base-content/40">(선택)</span>
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="mt-auto">
          <button
            onClick={handleSaveScheduledTodo}
            disabled={!scheduledTodoTitle.trim() || !scheduledDate || isSaving}
            className="btn btn-primary btn-lg w-full gap-2"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>
                <CalendarClock className="w-5 h-5" />
                등록하기
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  // 기록 저장 화면
  const renderCaptureView = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full p-4"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLearningReflectionViewState('reflection-input')} className="btn btn-ghost btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">마음 돌봄 완료!</h1>
        </div>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* 기분 선택 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-base-content/70 mb-3">기분은 어땠나요?</p>
          <div className="flex justify-between">
            {MOOD_EMOJIS.map(mood => (
              <button
                key={mood.value}
                onClick={() => setMoodRating(mood.value)}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  moodRating === mood.value ? 'bg-primary/10 scale-110' : ''
                }`}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span className="text-xs text-base-content/60 mt-1">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 통합 태그 선택 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-base-content/70 mb-3">태그 선택 (선택)</p>
          <div className="flex flex-wrap gap-2">
            {UNIFIED_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`badge badge-lg ${
                  selectedTags.includes(tag) ? 'badge-primary' : 'badge-ghost'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div className="mt-auto flex gap-3">
          <button
            onClick={handleSkipSave}
            className="btn btn-ghost flex-1"
          >
            그냥 넘어갈게
          </button>
          <button
            onClick={handleSave}
            disabled={!draftContent.trim() || isSaving}
            className="btn btn-primary flex-1"
          >
            {isSaving ? <span className="loading loading-spinner loading-sm" /> : '저장하기'}
          </button>
        </div>
      </motion.div>
    );
  };

  // 완료 화면
  const renderCompletedView = () => {
    const projectName = selectedProjectId
      ? projects.find(p => p.id === selectedProjectId)?.title
      : newProjectTitle;
    const hasTodos = todosDraft.filter(t => t.title.trim()).length > 0;
    const todoCount = todosDraft.filter(t => t.title.trim()).length;

    return (
      <motion.div
        key="completed"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex flex-col h-full p-4"
      >
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-6xl mb-4"
          >
            ✨
          </motion.div>
          <h2 className="text-2xl font-bold mb-2 text-center">
            {projectName ? '오늘의 생각,정보가 계획이 되었어요!' : '오늘의 생각,정보를 수집했어요!'}
          </h2>

          {/* 요약 카드들 */}
          <div className="w-full max-w-sm space-y-3 mb-6">
            {/* 수집 요약 */}
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">수집</span>
              </div>
              <p className="text-sm text-base-content/80 line-clamp-2">
                {draftContent || '(내용 없음)'}
              </p>
            </div>

            {/* 과제 요약 */}
            {projectName && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <FolderPlus className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">과제</span>
                </div>
                <p className="text-sm text-base-content/80">{projectName}</p>
              </div>
            )}

            {/* 할일 요약 */}
            {hasTodos && (
              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">할일</span>
                  <span className="ml-auto badge badge-sm badge-success">{todoCount}개 추가됨</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <button
              onClick={() => {
                resetLearningReflectionDraft();
                setLearningReflectionViewState('select-duration');
              }}
              className="btn btn-ghost flex-1"
            >
              처음으로
            </button>
            <button
              onClick={() => setLearningReflectionViewState('history')}
              className="btn btn-outline flex-1"
            >
              과거 기록 보기
            </button>
          </div>
          <button
            onClick={() => {
              endLearningReflectionMode();
              onExit();
            }}
            className="btn btn-primary w-full"
          >
            완료
          </button>
        </div>
      </motion.div>
    );
  };

  // 과거 기록 화면
  const renderHistoryView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 p-4 border-b border-base-300">
        <button onClick={() => setLearningReflectionViewState('select-duration')} className="btn btn-ghost btn-circle">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">과거 기록</h1>
      </div>

      {/* 기록 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 mobile-container">
        {captureNotes.length === 0 ? (
          <div className="text-center text-base-content/50 py-10">
            아직 기록이 없어요
          </div>
        ) : (
          captureNotes.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-base-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-500">
                  <Heart className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-base-content/50">
                      {format(new Date(note.linked_date || note.created_at), 'M월 d일 (EEE)', { locale: ko })}
                    </span>
                    <button
                      onClick={() => {
                        if (!userId) return;
                        if (note.is_pinned) {
                          unpinNote(note.id);
                        } else {
                          pinNote(note.id);
                        }
                      }}
                      className={`btn btn-ghost btn-xs ${note.is_pinned ? 'text-yellow-500' : 'text-base-content/30'}`}
                    >
                      <Star className="w-4 h-4" fill={note.is_pinned ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {note.source_text && (
                    <p className="text-sm text-base-content/70 italic mb-1 line-clamp-2">
                      &quot;{note.source_text}&quot;
                    </p>
                  )}
                  <p className="text-sm line-clamp-2">{note.content}</p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-base-100 flex flex-col safe-area-top">
      <AnimatePresence mode="wait">
        {viewState === 'select-duration' && renderSelectDurationView()}
        {viewState === 'reflection-input' && renderTimerRunningView()}
        {viewState === 'action-choice' && renderActionChoiceView()}
        {viewState === 'quick-todo' && renderQuickTodoView()}
        {viewState === 'scheduled-todo' && renderScheduledTodoView()}
        {viewState === 'capture' && renderCaptureView()}
        {viewState === 'completed' && renderCompletedView()}
        {viewState === 'history' && renderHistoryView()}
      </AnimatePresence>

      {/* 용량 제한 모달 */}
      {limitResult && (
        <UsageLimitModal
          isOpen={isLimitModalOpen}
          onClose={closeLimitModal}
          result={limitResult}
        />
      )}
    </div>
  );
}
