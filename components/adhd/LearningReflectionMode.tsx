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
  X,
  Trash2,
  Sun,
  Moon,
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
import { useLearningReflectionStore } from '@/state/stores/learningReflectionStore';
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
  '깨달음', '성장', '도전', '배움', '결심',
  '위로', '희망', '평안', '격려', '감동',
  '감사', '가족', '친구', '건강', '일상',
];

/**
 * 배움→과제→계획 모드
 *
 * ExecutionMode처럼 타이머와 함께 배움 기록 시간을 갖습니다.
 * 타이머 진행 중에 기록을 작성하고, 과제를 도출하고, 할일을 계획합니다.
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
  } = useADHDModeStore();

  const {
    entries,
    stats,
    currentPrompt,
    loadEntries,
    loadStats,
    loadRandomPrompt,
    addEntry,
    toggleFavorite,
  } = useLearningReflectionStore();

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
      loadStats(userId);
      fetchProjects(userId);
      fetchGoals(userId);
    }
  }, [userId, loadStats, fetchProjects, fetchGoals]);

  // 타이머 없이 바로 시작
  const [skipTimer, setSkipTimer] = useState(false);

  // history 뷰일 때 기록 로드
  useEffect(() => {
    if (userId && viewState === 'history') {
      loadEntries(userId);
    }
  }, [userId, viewState, loadEntries]);

  // 타이머 시작 시 질문 로드 (통합 폼이므로 reflection 타입의 질문 사용)
  useEffect(() => {
    if (viewState === 'reflection-input') {
      loadRandomPrompt('reflection');
    }
  }, [viewState, loadRandomPrompt]);

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

  // 과제 도출로 이동
  const handleGoToProjectDerive = () => {
    stopTimer();
    setLearningReflectionViewState('project-derive');
  };

  // 배움만 기록하고 끝내기
  const handleFinishWithLearningOnly = () => {
    stopTimer();
    setLearningReflectionViewState('capture');
  };

  // 할일 계획으로 이동
  const handleGoToTodoPlanning = () => {
    setLearningReflectionViewState('todo-planning');
  };

  // 과제 없이 끝내기
  const handleFinishWithoutProject = async () => {
    await saveEntry(null);
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

  // 배움 기록 저장 (프로젝트 연결 없이)
  const saveEntry = async (projectId: string | null) => {
    if (!userId || !draftContent.trim()) return null;

    const entry = await addEntry(userId, {
      entry_type: 'reflection',
      content: draftContent.trim(),
      source_text: draftSourceText.trim() || undefined,
      source_reference: draftSourceReference.trim() || undefined,
      experience: draftExperience.trim() || undefined,
      commitment: draftCommitment.trim() || undefined,
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      mood_rating: moodRating || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      project_id: projectId || undefined,
    });
    return entry;
  };

  // 배움 + 프로젝트 저장
  const saveEntryAndProject = async () => {
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

    await saveEntry(projectId);
    loadStats(userId);
  };

  // 배움 + 프로젝트 + 할일 저장
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

    await saveEntry(projectId);
    loadStats(userId);
    setLearningReflectionViewState('completed');
  };

  // 할일 없이 저장 (프로젝트 + 기록만)
  const executeEntryAndProjectAndTodosWithoutTodos = async () => {
    if (!userId) return;

    let projectId = selectedProjectId;

    // 새 프로젝트 생성
    if (!selectedProjectId && newProjectTitle.trim()) {
      const newProject = await createProject(userId, {
        title: newProjectTitle.trim(),
        expected_outcome: newProjectExpectedOutcome.trim() || undefined,
        preparation: newProjectPreparation.trim() || undefined,
        goal_id: selectedGoalId || undefined,
        color: '#6366f1',
        order_index: 0,
        status: 'not_started',
      });
      if (newProject) {
        projectId = newProject.id;
      }
    }

    await saveEntry(projectId);
    loadStats(userId);
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

  // 기록 저장
  const handleSave = async () => {
    if (!userId || !draftContent.trim()) return;

    setIsSaving(true);
    try {
      await addEntry(userId, {
        entry_type: 'reflection', // 통합 폼: 기본값 'reflection'
        content: draftContent.trim(),
        source_text: draftSourceText.trim() || undefined,
        source_reference: draftSourceReference.trim() || undefined,
        experience: draftExperience.trim() || undefined,
        commitment: draftCommitment.trim() || undefined,
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        mood_rating: moodRating || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      resetLearningReflectionDraft();
      setMoodRating(null);
      setSelectedTags([]);
      setLearningReflectionViewState('completed');
      loadStats(userId); // 통계 갱신
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
      case 'project-derive':
        setLearningReflectionViewState('reflection-input');
        break;
      case 'todo-planning':
        setLearningReflectionViewState('project-derive');
        break;
      case 'capture':
        setLearningReflectionViewState('reflection-input');
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

  // 타이머 시간 선택 화면 (배움→과제→계획)
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
        <h1 className="text-xl font-bold flex-1">배움 → 과제 → 계획</h1>
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

        {/* 연속 기록 */}
        {stats && stats.currentStreak > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl">
            <span className="text-2xl">🔥</span>
            <span className="font-medium">연속 {stats.currentStreak}일째 기록 중!</span>
          </div>
        )}

        {/* 안내 문구 */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 min-h-[60vh]">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-6">
            <Lightbulb className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">배움 기록</h2>
          <p className="text-base-content/60 mb-6">
            배우면서, 또는 배운 것을 기록하고,<br />
            과제를 도출하고, 할일을 계획하세요.
          </p>

          {/* 타이머 시간 선택 */}
          <div className="w-full max-w-xs mb-4">
            <p className="text-sm text-base-content/60 mb-3">타이머 시간 (선택)</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {TIMER_OPTIONS.map(min => (
                <button
                  key={min}
                  onClick={() => {
                    setSelectedDuration(min);
                    setSkipTimer(false);
                  }}
                  className={`btn btn-sm ${selectedDuration === min && !skipTimer ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {min}분
                </button>
              ))}
              <button
                onClick={() => setSkipTimer(true)}
                className={`btn btn-sm ${skipTimer ? 'btn-primary' : 'btn-ghost'}`}
              >
                타이머 없이
              </button>
            </div>
          </div>

          {/* 시작 버튼 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={skipTimer ? handleStartWithoutTimer : handleStartTimer}
            className="btn btn-primary btn-lg gap-2 rounded-full px-8"
          >
            <Play className="w-5 h-5" />
            시작하기
          </motion.button>
        </div>

        {/* 과거 기록 보기 */}
        <button
          onClick={() => setLearningReflectionViewState('history')}
          className="btn btn-ghost gap-2 mt-4 w-full"
        >
          <History className="w-5 h-5" />
          과거 기록 보기
        </button>
      </div>
    </motion.div>
  );

  // 배움 기록 화면 (reflection-input)
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
          <h1 className="text-lg font-bold">오늘의 배움</h1>
        </div>

        {/* 오늘의 질문 */}
        {currentPrompt && (
          <div className="p-3 bg-base-200 rounded-xl mb-4">
            <p className="text-sm text-base-content/60 mb-1">💡 오늘의 질문</p>
            <p className="font-medium">{currentPrompt.prompt_text}</p>
          </div>
        )}

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

        {/* 배움 기록 입력 폼 - 새 라벨 */}
        <div className="flex-1 space-y-4">
          {/* 1. 배운 내용 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {LEARNING_FIELD_LABELS.sourceText.label}{' '}
              {!LEARNING_FIELD_LABELS.sourceText.required && <span className="text-base-content/40">(선택)</span>}
            </label>
            <textarea
              value={draftSourceText}
              onChange={(e) => setLearningReflectionDraft({ sourceText: e.target.value })}
              placeholder={LEARNING_FIELD_LABELS.sourceText.placeholder}
              className="textarea textarea-bordered w-full h-20 resize-none"
            />
          </div>

          {/* 2. 출처 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {LEARNING_FIELD_LABELS.sourceReference.label}{' '}
              {!LEARNING_FIELD_LABELS.sourceReference.required && <span className="text-base-content/40">(선택)</span>}
            </label>
            <input
              type="text"
              value={draftSourceReference}
              onChange={(e) => setLearningReflectionDraft({ sourceReference: e.target.value })}
              placeholder={LEARNING_FIELD_LABELS.sourceReference.placeholder}
              className="input input-bordered w-full"
            />
          </div>

          {/* 3. 나의 깨달음 (필수) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {LEARNING_FIELD_LABELS.content.label}{' '}
              {LEARNING_FIELD_LABELS.content.required && <span className="text-amber-500">*</span>}
            </label>
            <textarea
              value={draftContent}
              onChange={(e) => setLearningReflectionDraft({ content: e.target.value })}
              placeholder={LEARNING_FIELD_LABELS.content.placeholder}
              className="textarea textarea-bordered w-full h-24 resize-none"
            />
          </div>

          {/* 4. 오늘의 경험 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {LEARNING_FIELD_LABELS.experience.label}{' '}
              {!LEARNING_FIELD_LABELS.experience.required && <span className="text-base-content/40">(선택)</span>}
            </label>
            <textarea
              value={draftExperience}
              onChange={(e) => setLearningReflectionDraft({ experience: e.target.value })}
              placeholder={LEARNING_FIELD_LABELS.experience.placeholder}
              className="textarea textarea-bordered w-full h-20 resize-none"
            />
          </div>

          {/* 5. 실천 다짐 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {LEARNING_FIELD_LABELS.commitment.label}{' '}
              {!LEARNING_FIELD_LABELS.commitment.required && <span className="text-base-content/40">(선택)</span>}
            </label>
            <textarea
              value={draftCommitment}
              onChange={(e) => setLearningReflectionDraft({ commitment: e.target.value })}
              placeholder={LEARNING_FIELD_LABELS.commitment.placeholder}
              className="textarea textarea-bordered w-full h-20 resize-none"
            />
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="mt-4 space-y-2">
          <button
            onClick={handleGoToProjectDerive}
            disabled={!draftContent.trim()}
            className="btn btn-primary w-full gap-2"
          >
            다음: 과제 도출하기
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleFinishWithLearningOnly}
            disabled={!draftContent.trim()}
            className="btn btn-ghost btn-sm w-full"
          >
            배움만 기록하고 끝내기
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

  // 과제 도출 화면
  const renderProjectDeriveView = () => {
    const filteredProjects = projects.filter((p: Project) => p.status !== 'completed');

    return (
      <motion.div
        key="project-derive"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 p-4 border-b border-base-300">
          <button onClick={() => setLearningReflectionViewState('reflection-input')} className="btn btn-ghost btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">과제 도출</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 mobile-container">
          {/* 깨달음 미리보기 */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">나의 깨달음</span>
            </div>
            <p className="text-sm text-base-content/80 line-clamp-3">
              {draftContent || '(작성된 내용이 없습니다)'}
            </p>
          </div>

          {/* 기존 프로젝트에 연결 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              기존 과제에 연결
            </label>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => {
                setLearningReflectionDraft({ selectedProjectId: e.target.value || null, newProjectTitle: '' });
              }}
              className="select select-bordered w-full"
            >
              <option value="">선택 안 함 (새 과제 만들기)</option>
              {filteredProjects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* 구분선 */}
          {!selectedProjectId && (
            <>
              <div className="divider text-base-content/40">또는</div>

              {/* 새 과제 만들기 */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-base-content/70 mb-2 block">
                    <FolderPlus className="w-4 h-4 inline mr-1" />
                    {PROJECT_DERIVE_LABELS.title.label}
                  </label>
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(e) => setLearningReflectionDraft({ newProjectTitle: e.target.value })}
                    placeholder={PROJECT_DERIVE_LABELS.title.placeholder}
                    className="input input-bordered w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-base-content/70 mb-2 block">
                    {PROJECT_DERIVE_LABELS.expectedOutcome.label}
                  </label>
                  <textarea
                    value={newProjectExpectedOutcome}
                    onChange={(e) => setLearningReflectionDraft({ newProjectExpectedOutcome: e.target.value })}
                    placeholder={PROJECT_DERIVE_LABELS.expectedOutcome.placeholder}
                    rows={2}
                    className="textarea textarea-bordered w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-base-content/70 mb-2 block">
                    {PROJECT_DERIVE_LABELS.goalConnection.label}
                  </label>
                  <select
                    value={selectedGoalId || ''}
                    onChange={(e) => setLearningReflectionDraft({ selectedGoalId: e.target.value || null })}
                    className="select select-bordered w-full"
                  >
                    <option value="">목표 없이 진행</option>
                    {goals.filter((g: Goal) => g.status !== 'completed').map((g: Goal) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t border-base-300 space-y-3">
          <button
            onClick={handleGoToTodoPlanning}
            disabled={!selectedProjectId && !newProjectTitle.trim()}
            className="btn btn-primary w-full gap-2"
          >
            다음: 할일 계획하기 <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              // 과제 없이 배움만 저장
              await saveEntry(null);
              setLearningReflectionViewState('completed');
            }}
            className="btn btn-ghost w-full"
          >
            과제 없이 끝내기
          </button>
        </div>
      </motion.div>
    );
  };

  // 할일 계획 화면
  const renderTodoPlanningView = () => {
    const projectName = selectedProjectId
      ? projects.find(p => p.id === selectedProjectId)?.title
      : newProjectTitle;

    return (
      <motion.div
        key="todo-planning"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 p-4 border-b border-base-300">
          <button onClick={() => setLearningReflectionViewState('project-derive')} className="btn btn-ghost btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">할일 계획</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 mobile-container">
          {/* 과제 정보 */}
          <div className="p-3 bg-base-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">&quot;{projectName}&quot;을 위한 할일</span>
            </div>
          </div>

          {/* 준비할 것 */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-2 block">
              {TODO_PLANNING_LABELS.preparation.label}
            </label>
            <textarea
              value={newProjectPreparation}
              onChange={(e) => setLearningReflectionDraft({ newProjectPreparation: e.target.value })}
              placeholder={TODO_PLANNING_LABELS.preparation.placeholder}
              rows={2}
              className="textarea textarea-bordered w-full"
            />
          </div>

          {/* 할일 목록 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-base-content/70">
                <ListTodo className="w-4 h-4 inline mr-1" />
                {TODO_PLANNING_LABELS.todoTitle.label}
              </label>
              <button
                onClick={handleAddTodoDraft}
                className="btn btn-ghost btn-xs gap-1"
              >
                <Plus className="w-3 h-3" /> 추가
              </button>
            </div>

            <div className="space-y-3">
              {todosDraft.length === 0 ? (
                <div className="text-center text-base-content/50 py-4">
                  <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">할일을 추가해보세요</p>
                </div>
              ) : (
                todosDraft.map((todo, index) => (
                  <div key={todo.id} className="p-3 bg-base-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-base-content/50">#{index + 1}</span>
                      <input
                        type="text"
                        value={todo.title}
                        onChange={(e) => handleUpdateTodoDraft(todo.id, { title: e.target.value })}
                        placeholder={TODO_PLANNING_LABELS.todoTitle.placeholder}
                        className="input input-bordered input-sm flex-1"
                      />
                      <button
                        onClick={() => handleRemoveTodoDraft(todo.id)}
                        className="btn btn-ghost btn-xs btn-circle text-error"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-base-content/50 mb-1 block">
                          <Calendar className="w-3 h-3 inline mr-1" />날짜
                        </label>
                        <input
                          type="date"
                          value={todo.scheduledDate || ''}
                          onChange={(e) => handleUpdateTodoDraft(todo.id, { scheduledDate: e.target.value || null })}
                          className="input input-bordered input-xs w-full"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-base-content/50 mb-1 block">
                          <Clock className="w-3 h-3 inline mr-1" />시간
                        </label>
                        <input
                          type="time"
                          value={todo.scheduledTime || ''}
                          onChange={(e) => handleUpdateTodoDraft(todo.id, { scheduledTime: e.target.value || null })}
                          className="input input-bordered input-xs w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t border-base-300 space-y-3">
          <button
            onClick={saveEntryAndProjectAndTodos}
            disabled={isSaving}
            className="btn btn-primary w-full gap-2"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>완료하기 <Check className="w-4 h-4" /></>
            )}
          </button>
          <button
            onClick={async () => {
              // 할일 없이 배움+과제만 저장
              await saveEntryAndProject();
              setLearningReflectionViewState('completed');
            }}
            disabled={isSaving}
            className="btn btn-ghost w-full"
          >
            할일 없이 끝내기
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
            {projectName ? '오늘의 배움이 계획이 되었어요!' : '오늘의 배움을 기록했어요!'}
          </h2>
          {stats && stats.currentStreak > 0 && (
            <p className="text-base-content/60 mb-6">
              🔥 연속 {stats.currentStreak}일째 기록 중
            </p>
          )}

          {/* 요약 카드들 */}
          <div className="w-full max-w-sm space-y-3 mb-6">
            {/* 배움 요약 */}
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">배움</span>
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
        {entries.length === 0 ? (
          <div className="text-center text-base-content/50 py-10">
            아직 기록이 없어요
          </div>
        ) : (
          entries.map(entry => (
            <motion.div
              key={entry.id}
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
                      {format(new Date(entry.entry_date), 'M월 d일 (EEE)', { locale: ko })}
                    </span>
                    <button
                      onClick={() => userId && toggleFavorite(entry, userId)}
                      className={`btn btn-ghost btn-xs ${entry.is_favorite ? 'text-yellow-500' : 'text-base-content/30'}`}
                    >
                      <Star className="w-4 h-4" fill={entry.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {entry.source_text && (
                    <p className="text-sm text-base-content/70 italic mb-1 line-clamp-2">
                      &quot;{entry.source_text}&quot;
                    </p>
                  )}
                  <p className="text-sm line-clamp-2">{entry.content}</p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {entry.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="badge badge-sm badge-ghost">#{tag}</span>
                      ))}
                    </div>
                  )}
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
        {viewState === 'project-derive' && renderProjectDeriveView()}
        {viewState === 'todo-planning' && renderTodoPlanningView()}
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
