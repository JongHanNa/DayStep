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
  MoreVertical,
  Pencil,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import type { MoodLevel, TodoDraft } from '@/types/fuel';
import { FUEL_FIELD_LABELS, PROJECT_DERIVE_LABELS, TODO_PLANNING_LABELS, FUEL_MESSAGES } from '@/types/fuel';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore, type Note } from '@/state/stores/noteStore';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTheme } from '@/hooks/useTheme';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { UsageWarningBanner } from '@/components/subscription/UsageWarningBanner';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { addTodoNote, removeTodoNote } from '@/lib/supabase/todo-notes';
import { PomodoroSessionService } from '@/services/pomodoro-session.service';
import MarkdownEditor from '@/components/notes/MarkdownEditor';

interface FuelModeProps {
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
 * 쉬운 정리 패턴 모드 (Fuel Mode)
 *
 * ExecutionMode처럼 타이머와 함께 기록 시간을 갖습니다.
 * 타이머 진행 중에 생각을 수집하고, 명료화하고, 할일을 계획합니다.
 */
export default function FuelMode({ onExit }: FuelModeProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    fuelMode,
    setFuelViewState,
    setFuelDraft,
    resetFuelDraft,
    endFuelMode,
    setCurrentRecommendation,
    enterExecuteMode,
    startAdhocMode,
    setSessionId,
    setLinkedTodo,
  } = useADHDModeStore();

  // Fuel 노트 관리 (noteStore 사용)
  const {
    notes,
    getFuelNotes,
    createFuelNote,
    getUnprocessedFuelNotes,
    markNoteAsProcessed,
    pinNote,
    unpinNote,
    updateNote,
    deleteNote,
    loading: notesLoading,
  } = useNoteStore();

  // Fuel 노트만 필터링 (entries 대신 사용)
  const fuelNotes = useMemo(() =>
    notes.filter(note => note.note_category === 'fuel'),
    [notes]
  );

  // 실행 연료 안내 메시지 (랜덤 선택)
  const fuelMessage = useMemo(() =>
    FUEL_MESSAGES[Math.floor(Math.random() * FUEL_MESSAGES.length)],
    []
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

  // 노트 편집/삭제 모달 상태
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // 할일 편집/삭제 모달 상태
  const [editingTodo, setEditingTodo] = useState<{ id: string; title: string; noteId: string } | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState('');
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [deletingTodoNoteId, setDeletingTodoNoteId] = useState<string | null>(null);

  const {
    viewState,
    draftTitle,
    draftContent,
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
  } = fuelMode;

  // 할일 스토어
  const { createTodo, updateTodo, deleteTodo } = useTodoStore();

  // 프로젝트/목표 관련 기능 제거됨 - 빈 배열/빈 함수로 대체
  const projects: { id: string; title: string }[] = [];
  const goals: { id: string; title: string }[] = [];
  // eslint-disable-next-line
  const createProject = async (_userId: string, _data: Record<string, unknown>): Promise<{ id: string } | null> => null;

  // 타이머 없이 바로 시작
  const [skipTimer, setSkipTimer] = useState(false);

  // 허브 화면 또는 history 뷰일 때 기록 로드
  useEffect(() => {
    if (userId && (viewState === 'history' || viewState === 'select-duration')) {
      getFuelNotes(userId);
    }
  }, [userId, viewState, getFuelNotes]);

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
    setFuelViewState('reflection-input');
    if (!skipTimer) {
      startPomodoroTimer(selectedDuration * 60 * 1000);
    }
  };

  // 타이머 없이 시작
  const handleStartWithoutTimer = () => {
    setSkipTimer(true);
    setFuelViewState('reflection-input');
  };

  // 선택지 화면으로 이동 (수집 후)
  const handleGoToActionChoice = () => {
    stopTimer();
    setFuelViewState('action-choice');
  };

  // 지금 바로 할래 → 할일 입력 화면
  const handleQuickTodo = () => {
    setFuelViewState('quick-todo');
  };

  // 언제 할지 정할래 → 예약 할일 화면
  const handleScheduledTodo = () => {
    setFuelViewState('scheduled-todo');
  };

  // 저장만 할래 → 바로 저장 후 completed 화면
  const handleSaveOnly = async () => {
    if (!userId || !draftContent.trim()) return;

    setIsSaving(true);
    try {
      // 기분/태그 없이 바로 저장
      await saveEntry();
      setFuelViewState('completed');
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 지금 바로 할래 → 원동력 저장 + 할일 생성 + 타이머 시작 + ExecutionMode로 이동
  const handleStartQuickTodo = async () => {
    if (!userId || !quickTodoTitle.trim()) return;

    setIsSaving(true);
    try {
      // 1. 원동력(노트) 저장
      const savedNote = await saveEntry();

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
        // 3. 노트-할일 연결 (todo_notes) + 처리됨 표시
        if (savedNote) {
          await addTodoNote(newTodo.id, savedNote.id, userId);
          await markNoteAsProcessed(savedNote.id);
        }

        // 4. 기존 노트에서 할일 만들기였으면 해당 노트도 처리됨으로 표시
        if (selectedNoteId && selectedNoteId !== savedNote?.id) {
          await markNoteAsProcessed(selectedNoteId);
          setSelectedNoteId(null); // 초기화
        }

        // 5. DB 세션 생성 (기본 25분) + 할일 연결
        const duration = 25 * 60 * 1000; // 25분
        const sessionId = await PomodoroSessionService.createSession(userId, duration);
        await PomodoroSessionService.linkTodo(sessionId, newTodo.id);

        // 6. adhoc 모드 활성화 + 할일 연결
        startAdhocMode();
        setSessionId(sessionId);
        setLinkedTodo(newTodo.id, newTodo.title);
        setCurrentRecommendation(newTodo);

        // 7. ExecutionMode로 전환 (세션 복원 로직이 자동으로 타이머 시작)
        await enterExecuteMode(userId);
      }
    } catch (error) {
      console.error('빠른 할일 생성 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 예약 할일 저장 → 원동력 저장 + 할일 생성 (날짜/시간 포함)
  const handleSaveScheduledTodo = async () => {
    if (!userId || !scheduledTodoTitle.trim() || !scheduledDate) return;

    setIsSaving(true);
    try {
      // 1. 원동력(노트) 저장
      const savedNote = await saveEntry();

      // 2. 할일 생성 (예약된 날짜/시간)
      // 시간이 있으면 해당 시간, 없으면 자정으로 설정
      let startTime: string;
      if (scheduledTime) {
        startTime = new Date(`${scheduledDate}T${scheduledTime}:00+09:00`).toISOString();
      } else {
        startTime = new Date(`${scheduledDate}T00:00:00+09:00`).toISOString();
      }

      const newTodo = await createTodo({
        user_id: userId,
        title: scheduledTodoTitle.trim(),
        start_time: startTime,
        schedule_type: scheduledTime ? 'timed' as const : 'anytime' as const,
      });

      // 3. 노트-할일 연결 (todo_notes) + 처리됨 표시
      if (newTodo && savedNote) {
        await addTodoNote(newTodo.id, savedNote.id, userId);
        await markNoteAsProcessed(savedNote.id);
      }

      // 4. 기존 노트에서 할일 만들기였으면 해당 노트도 처리됨으로 표시
      if (selectedNoteId && selectedNoteId !== savedNote?.id) {
        await markNoteAsProcessed(selectedNoteId);
        setSelectedNoteId(null); // 초기화
      }

      // 5. 완료 화면으로 이동 (예약이므로 타이머 시작 안함)
      setFuelViewState('completed');
    } catch (error) {
      console.error('예약 할일 생성 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 과제 없이 끝내기
  const handleFinishWithoutProject = async () => {
    await saveEntry();
    setFuelViewState('completed');
  };

  // ============================================
  // 노트 편집/삭제 핸들러
  // ============================================

  // 편집 모달 열기
  const handleOpenEditModal = (note: Note) => {
    setEditingNote(note);
    setEditContent(note.content || '');
    setOpenDropdownId(null);
  };

  // 편집 저장
  const handleSaveEdit = async () => {
    if (!editingNote || !editContent.trim()) return;

    try {
      await updateNote({
        id: editingNote.id,
        content: editContent.trim(),
      });
      setEditingNote(null);
      setEditContent('');
    } catch (error) {
      console.error('노트 수정 실패:', error);
    }
  };

  // 편집 모달 닫기
  const handleCloseEditModal = () => {
    setEditingNote(null);
    setEditContent('');
  };

  // 삭제 확인 모달 열기
  const handleOpenDeleteModal = (noteId: string) => {
    setDeletingNoteId(noteId);
    setOpenDropdownId(null);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!deletingNoteId) return;

    try {
      await deleteNote(deletingNoteId);
      setDeletingNoteId(null);
    } catch (error) {
      console.error('노트 삭제 실패:', error);
    }
  };

  // 삭제 모달 닫기
  const handleCloseDeleteModal = () => {
    setDeletingNoteId(null);
  };

  // 드롭다운 토글
  const handleToggleDropdown = (noteId: string) => {
    setOpenDropdownId(prev => prev === noteId ? null : noteId);
  };

  // ============================================
  // 할일 편집/삭제 핸들러
  // ============================================

  // 할일 편집 모달 열기
  const handleOpenTodoEditModal = (todoId: string, todoTitle: string, noteId: string) => {
    setEditingTodo({ id: todoId, title: todoTitle, noteId });
    setEditTodoTitle(todoTitle);
  };

  // 할일 편집 저장
  const handleSaveTodoEdit = async () => {
    if (!editingTodo || !editTodoTitle.trim()) return;

    try {
      await updateTodo(editingTodo.id, {
        title: editTodoTitle.trim(),
      });
      setEditingTodo(null);
      setEditTodoTitle('');
      // 노트 목록 새로고침 (연결된 할일 정보 갱신)
      if (userId) {
        await getFuelNotes(userId);
      }
    } catch (error) {
      console.error('할일 수정 실패:', error);
    }
  };

  // 할일 편집 모달 닫기
  const handleCloseTodoEditModal = () => {
    setEditingTodo(null);
    setEditTodoTitle('');
  };

  // 할일 삭제/연결해제 모달 열기
  const handleOpenTodoDeleteModal = (todoId: string, noteId: string) => {
    setDeletingTodoId(todoId);
    setDeletingTodoNoteId(noteId);
  };

  // 할일 삭제 실행 (연결 해제 또는 완전 삭제)
  const handleConfirmTodoDelete = async (deleteCompletely: boolean = false) => {
    if (!deletingTodoId || !deletingTodoNoteId || !userId) return;

    try {
      if (deleteCompletely) {
        // 할일 완전 삭제
        await deleteTodo(deletingTodoId);
      } else {
        // 연결만 해제 (할일은 유지)
        await removeTodoNote(deletingTodoId, deletingTodoNoteId);
      }

      setDeletingTodoId(null);
      setDeletingTodoNoteId(null);

      // 노트 목록 새로고침
      await getFuelNotes(userId);
    } catch (error) {
      console.error('할일 처리 실패:', error);
    }
  };

  // 할일 삭제 모달 닫기
  const handleCloseTodoDeleteModal = () => {
    setDeletingTodoId(null);
    setDeletingTodoNoteId(null);
  };

  // 할일 없이 끝내기
  const handleFinishWithoutTodos = async () => {
    await saveEntryAndProject();
    setFuelViewState('completed');
  };

  // 전체 완료 (할일까지)
  const handleCompleteAll = async () => {
    await saveEntryAndProjectAndTodos();
    setFuelViewState('completed');
  };

  // 할일 초안 추가
  const handleAddTodoDraft = () => {
    const newTodo: TodoDraft = {
      id: `draft-${Date.now()}`,
      title: '',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      scheduledTime: null,
    };
    setFuelDraft({ todosDraft: [...todosDraft, newTodo] });
  };

  // 할일 초안 수정
  const handleUpdateTodoDraft = (id: string, updates: Partial<TodoDraft>) => {
    setFuelDraft({
      todosDraft: todosDraft.map(t => t.id === id ? { ...t, ...updates } : t),
    });
  };

  // 할일 초안 삭제
  const handleRemoveTodoDraft = (id: string) => {
    setFuelDraft({ todosDraft: todosDraft.filter(t => t.id !== id) });
  };

  // 수집 저장 (notes 테이블에 fuel로 저장)
  const saveEntry = async () => {
    if (!userId || !draftContent.trim()) return null;

    const note = await createFuelNote({
      title: draftTitle.trim() || undefined,
      content: draftContent.trim(),
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
    setFuelViewState('completed');
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
    setFuelViewState('completed');
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
    setFuelViewState('capture');
  }, [stopTimer, setFuelViewState]);

  // 타이머 드래그로 완료
  const handleDragComplete = () => {
    stopTimer();
    setFuelViewState('capture');
  };

  // 타이머 중지 (뒤로가기)
  const handleStopTimer = () => {
    stopTimer();
    resetFuelDraft();
    setFuelViewState('select-duration');
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
      await createFuelNote({
        title: draftTitle.trim() || undefined,
        content: draftContent.trim(),
        linked_date: format(new Date(), 'yyyy-MM-dd'),
        is_pinned: false,
      });

      resetFuelDraft();
      setMoodRating(null);
      setSelectedTags([]);
      setFuelViewState('completed');
    } catch (error) {
      console.error('기록 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 저장 건너뛰기
  const handleSkipSave = () => {
    resetFuelDraft();
    setMoodRating(null);
    setSelectedTags([]);
    setFuelViewState('completed');
  };

  // 뒤로가기 처리
  const handleBack = () => {
    switch (viewState) {
      case 'reflection-input':
        handleStopTimer();
        break;
      case 'action-choice':
        setFuelViewState('reflection-input');
        break;
      case 'quick-todo':
      case 'scheduled-todo':
        setFuelViewState('action-choice');
        break;
      case 'capture':
        setFuelViewState('action-choice');
        break;
      case 'history':
        setFuelViewState('select-duration');
        break;
      case 'completed':
        endFuelMode();
        onExit();
        break;
      default:
        endFuelMode();
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
  // 미처리 원동력 목록: is_processed가 false이고 연결된 할일이 없는 것
  const unprocessedEntries = useMemo(() => {
    return fuelNotes.filter(note =>
      !note.is_processed && (note.todos?.length ?? 0) === 0
    );
  }, [fuelNotes]);

  // 처리된 원동력 목록: is_processed가 true이거나 연결된 할일이 있는 것
  const processedEntries = useMemo(() => {
    return fuelNotes.filter(note =>
      note.is_processed === true || (note.todos?.length ?? 0) > 0
    );
  }, [fuelNotes]);

  // "실행과 집중으로 가기" 핸들러
  const handleGoToExecute = useCallback(() => {
    if (!userId) return;
    endFuelMode();
    enterExecuteMode(userId);
  }, [userId, endFuelMode, enterExecuteMode]);

  // "새로 수집하기" 핸들러 (기본 10분 타이머로 바로 시작) - 레거시
  const handleStartNewCollection = useCallback(() => {
    setSelectedDuration(10); // 기본 10분
    setSkipTimer(false);
    handleStartTimer();
  }, [handleStartTimer]);

  // "수집→실행" 핸들러 (영감 노트 입력 화면으로 이동)
  const handleStartCollectToExecute = useCallback(() => {
    resetFuelDraft();  // 기존 draft 초기화
    setFuelViewState('inspiration-input');
  }, [resetFuelDraft, setFuelViewState]);

  // ============================================
  // 영감 노트 플로우 핸들러들
  // ============================================

  // 영감 노트 저장 후 "지금 바로 할래"
  const handleInspirationQuickTodo = useCallback(() => {
    // quick-todo 화면으로 이동 (기존 플로우 재사용)
    setFuelViewState('quick-todo');
  }, [setFuelViewState]);

  // 영감 노트 저장 후 "언제 할지 정할래"
  const handleInspirationScheduledTodo = useCallback(() => {
    // scheduled-todo 화면으로 이동 (기존 플로우 재사용)
    setFuelViewState('scheduled-todo');
  }, [setFuelViewState]);

  // 영감 노트 "일단 저장만"
  const handleInspirationSaveOnly = useCallback(async () => {
    if (!userId || !draftContent.trim()) return;

    setIsSaving(true);
    try {
      // 영감 노트 저장
      await createFuelNote({
        title: draftTitle.trim() || undefined,
        content: draftContent.trim(),
        linked_date: format(new Date(), 'yyyy-MM-dd'),
        is_pinned: false,
      });

      // 완료 화면으로 이동
      setFuelViewState('completed');
    } catch (error) {
      console.error('영감 노트 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  }, [userId, draftTitle, draftContent, createFuelNote, setFuelViewState]);

  // 미처리 수집에서 "할일 만들기" 핸들러
  const handleCreateTodoFromEntry = useCallback((note: Note) => {
    // 해당 수집의 노트 ID 저장 (할일 생성 후 처리됨으로 표시하기 위해)
    setSelectedNoteId(note.id);
    // 해당 수집의 내용을 draft에 로드
    setFuelDraft({
      content: note.content,
    });
    // action-choice 화면으로 이동
    setFuelViewState('action-choice');
  }, [setFuelDraft, setFuelViewState]);

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
          {/* 먼저 실행 후 원동력 적기 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoToExecute}
            className="btn btn-primary btn-lg w-full rounded-2xl h-16 flex items-center justify-center gap-3 shadow-lg"
          >
            <Target className="w-6 h-6" />
            <span className="text-lg font-semibold">먼저 실행 후 원동력 적기</span>
          </motion.button>

          {/* 원동력 부터 적고 실행 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartCollectToExecute}
            className="btn btn-lg w-full rounded-2xl h-16 flex items-center justify-center gap-3 shadow-lg bg-orange-500 text-white border-none hover:bg-orange-600"
          >
            <PenLine className="w-6 h-6" />
            <span className="text-lg font-semibold">원동력 부터 적고 실행</span>
          </motion.button>
        </div>

        {/* 미처리 원동력 목록 */}
        {unprocessedEntries.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-base-content/70">미처리 원동력</span>
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
                      {format(new Date(entry.created_at), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreateTodoFromEntry(entry)}
                    className="btn btn-sm btn-ghost text-primary"
                  >
                    <ListTodo className="w-4 h-4" />
                    <span className="hidden sm:inline">할일 만들기</span>
                  </button>
                  {/* 드롭다운 메뉴 */}
                  <div className="relative">
                    <button
                      onClick={() => handleToggleDropdown(entry.id)}
                      className="btn btn-sm btn-ghost btn-circle"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openDropdownId === entry.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
                        <button
                          onClick={() => handleOpenEditModal(entry)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 rounded-t-lg"
                        >
                          <Pencil className="w-4 h-4" />
                          수정
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(entry.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-base-200 rounded-b-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 처리된 원동력 목록 */}
        {processedEntries.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-base-content/70">처리된 원동력</span>
              <span className="text-xs text-base-content/50">({processedEntries.length}개)</span>
            </div>
            <div className="flex flex-col gap-2">
              {processedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="p-3 bg-base-200/50 rounded-xl"
                >
                  <p className="text-sm text-base-content/70 line-clamp-2">{entry.content}</p>
                  {/* 연결된 할일 표시 */}
                  {entry.todos && entry.todos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.todos.map((todo) => (
                        <div key={todo.id} className="group flex items-center">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-l-full">
                            {todo.title}
                          </span>
                          <button
                            onClick={() => handleOpenTodoEditModal(todo.id, todo.title, entry.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-primary/10 text-primary px-1.5 py-0.5 hover:bg-primary/20"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleOpenTodoDeleteModal(todo.id, entry.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-r-full hover:bg-error/20 hover:text-error"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-base-content/40 mt-1">
                    {format(new Date(entry.created_at), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
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
          <h1 className="text-lg font-bold">원동력 채우기</h1>
        </div>

        {/* 오늘의 힌트 (정적 프롬프트) */}
        <div className="p-3 bg-base-200 rounded-xl mb-4">
          <p className="text-sm text-base-content/60 mb-1">오늘의 힌트</p>
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

        {/* 수집 입력 폼 - 단순화 */}
        <div className="flex-1 space-y-4">
          {/* 떠오른 것 (필수) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {FUEL_FIELD_LABELS.content.label}{' '}
              {FUEL_FIELD_LABELS.content.required && <span className="text-amber-500">*</span>}
            </label>
            <textarea
              value={draftContent}
              onChange={(e) => setFuelDraft({ content: e.target.value })}
              placeholder={FUEL_FIELD_LABELS.content.placeholder}
              className="textarea textarea-bordered w-full h-32 resize-none"
              autoFocus
            />
          </div>
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
            onClick={() => setFuelViewState('reflection-input')}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">이걸로 뭐 할래?</h1>
        </div>

        {/* 수집한 내용 미리보기 */}
        <div className="bg-base-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-base-content/60 mb-1">채운 원동력</p>
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

  // ============================================
  // 영감 노트 입력 화면 (inspiration-input) - "수집->실행" 플로우
  // ============================================
  const renderInspirationInputView = () => {
    return (
      <motion.div
        key="inspiration-input"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full p-4"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setFuelViewState('select-duration')}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">원동력 채우기</h1>
        </div>

        {/* 안내 문구 (랜덤) */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {fuelMessage}
          </p>
        </div>

        {/* 실행 연료 입력 폼 */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* 제목 입력 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              제목 (선택)
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setFuelDraft({ title: e.target.value })}
              placeholder="제목을 입력하세요 (없으면 내용에서 자동 생성)"
              className="input input-bordered w-full"
            />
          </div>

          {/* 1. 실행 연료 내용 (필수) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              {FUEL_FIELD_LABELS.content.label} <span className="text-amber-500">*</span>
            </label>
            <MarkdownEditor
              value={draftContent}
              onChange={(value) => setFuelDraft({ content: value })}
              placeholder={FUEL_FIELD_LABELS.content.placeholder}
              minHeight={150}
            />
          </div>
        </div>

        {/* 하단 액션 버튼들 - 내용 입력 시 활성화 */}
        <div className="mt-4 flex flex-col gap-3">
          {/* 지금 바로 할래 */}
          <motion.button
            whileHover={{ scale: draftContent.trim() ? 1.02 : 1 }}
            whileTap={{ scale: draftContent.trim() ? 0.98 : 1 }}
            onClick={handleInspirationQuickTodo}
            disabled={!draftContent.trim()}
            className="btn btn-primary btn-lg w-full h-16 flex items-center justify-center gap-3 shadow-lg"
          >
            <Play className="w-6 h-6" />
            <span className="text-lg font-semibold">지금 바로 할래</span>
          </motion.button>

          {/* 언제 할지 정할래 */}
          <motion.button
            whileHover={{ scale: draftContent.trim() ? 1.02 : 1 }}
            whileTap={{ scale: draftContent.trim() ? 0.98 : 1 }}
            onClick={handleInspirationScheduledTodo}
            disabled={!draftContent.trim()}
            className="btn btn-ghost btn-lg w-full h-14 flex items-center justify-center gap-3 border-2 border-base-300 bg-base-200"
          >
            <CalendarClock className="w-5 h-5" />
            <span className="text-base font-semibold">언제 할지 정할래</span>
          </motion.button>

          {/* 일단 저장만 */}
          <motion.button
            whileHover={{ scale: draftContent.trim() && !isSaving ? 1.02 : 1 }}
            whileTap={{ scale: draftContent.trim() && !isSaving ? 0.98 : 1 }}
            onClick={handleInspirationSaveOnly}
            disabled={!draftContent.trim() || isSaving}
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
            onClick={() => setFuelViewState('action-choice')}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">지금 바로 할래</h1>
        </div>

        {/* 수집한 내용 미리보기 */}
        <div className="bg-base-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-base-content/60 mb-1">채운 원동력</p>
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
            onClick={() => setFuelViewState('action-choice')}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">언제 할지 정할래</h1>
        </div>

        {/* 수집한 내용 미리보기 */}
        <div className="bg-base-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-base-content/60 mb-1">채운 원동력</p>
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
          <button onClick={() => setFuelViewState('reflection-input')} className="btn btn-ghost btn-circle">
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
          </motion.div>
          <h2 className="text-2xl font-bold mb-2 text-center">
            {projectName ? '오늘의 생각,정보가 계획이 되었어요!' : '오늘의 원동력을 채웠어요!'}
          </h2>

          {/* 요약 카드들 */}
          <div className="w-full max-w-sm space-y-3 mb-6">
            {/* 원동력 요약 */}
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">원동력</span>
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
                resetFuelDraft();
                setFuelViewState('select-duration');
              }}
              className="btn btn-ghost flex-1"
            >
              처음으로
            </button>
            <button
              onClick={() => setFuelViewState('history')}
              className="btn btn-outline flex-1"
            >
              과거 기록 보기
            </button>
          </div>
          <button
            onClick={() => {
              endFuelMode();
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
        <button onClick={() => setFuelViewState('select-duration')} className="btn btn-ghost btn-circle">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">과거 기록</h1>
      </div>

      {/* 기록 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 mobile-container">
        {fuelNotes.length === 0 ? (
          <div className="text-center text-base-content/50 py-10">
            아직 기록이 없어요
          </div>
        ) : (
          fuelNotes.map(note => (
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
                    <div className="flex items-center gap-1">
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
                      {/* 드롭다운 메뉴 */}
                      <div className="relative">
                        <button
                          onClick={() => handleToggleDropdown(note.id)}
                          className="btn btn-ghost btn-xs"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openDropdownId === note.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
                            <button
                              onClick={() => handleOpenEditModal(note)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 rounded-t-lg"
                            >
                              <Pencil className="w-4 h-4" />
                              수정
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(note.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-base-200 rounded-b-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
        {viewState === 'inspiration-input' && renderInspirationInputView()}
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

      {/* 편집 모달 */}
      {editingNote && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">원동력 수정</h3>
              <button
                onClick={handleCloseEditModal}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-base-content/70 mb-1 block">
                  떠오른 것 <span className="text-amber-500">*</span>
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="textarea textarea-bordered w-full h-24"
                  placeholder="내용을 입력하세요"
                />
              </div>
            </div>
            <div className="modal-action">
              <button onClick={handleCloseEditModal} className="btn btn-ghost">
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                className="btn btn-primary"
              >
                저장
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseEditModal}>close</button>
          </form>
        </dialog>
      )}

      {/* 노트 삭제 확인 모달 */}
      {deletingNoteId && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg mb-2">삭제 확인</h3>
            <p className="text-base-content/70">
              이 원동력을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-error">삭제된 원동력은 복구할 수 없습니다.</span>
            </p>
            <div className="modal-action">
              <button onClick={handleCloseDeleteModal} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-error">
                삭제
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseDeleteModal}>close</button>
          </form>
        </dialog>
      )}

      {/* 할일 편집 모달 */}
      {editingTodo && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">할일 수정</h3>
              <button
                onClick={handleCloseTodoEditModal}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={editTodoTitle}
              onChange={(e) => setEditTodoTitle(e.target.value)}
              className="input input-bordered w-full"
              placeholder="할일 제목"
              autoFocus
            />
            <div className="modal-action">
              <button onClick={handleCloseTodoEditModal} className="btn btn-ghost rounded-full">
                취소
              </button>
              <button
                onClick={handleSaveTodoEdit}
                disabled={!editTodoTitle.trim()}
                className="btn btn-primary rounded-full"
              >
                저장
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseTodoEditModal}>close</button>
          </form>
        </dialog>
      )}

      {/* 할일 삭제/연결해제 모달 */}
      {deletingTodoId && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg mb-4">할일 처리</h3>
            <p className="text-sm text-base-content/70 mb-4">
              이 할일을 어떻게 처리하시겠습니까?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleConfirmTodoDelete(false)}
                className="btn btn-outline rounded-full"
              >
                연결만 해제 (할일은 유지)
              </button>
              <button
                onClick={() => handleConfirmTodoDelete(true)}
                className="btn btn-error rounded-full"
              >
                할일 완전 삭제
              </button>
            </div>
            <div className="modal-action">
              <button onClick={handleCloseTodoDeleteModal} className="btn btn-ghost rounded-full">
                취소
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseTodoDeleteModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
