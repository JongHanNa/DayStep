'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Plus,
  Heart,
  Gift,
  MessageCircle,
  Check,
  Play,
  Pause,
  Users,
  Search,
  X,
  Newspaper,
  Phone,
  Home,
  Utensils,
  Mail,
  HandHelping,
  Sparkles,
  Sun,
  Moon,
  MoreVertical,
  Pencil,
  type LucideIcon,
} from 'lucide-react';
import AddPersonModal from '../cherished/AddPersonModal';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTheme } from '@/hooks/useTheme';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { UsageWarningBanner } from '@/components/subscription/UsageWarningBanner';
import type { CherishedPerson, InteractionType, CareInteractionInput } from '@/types/cherished-people';
import { INTERACTION_TYPE_LABELS } from '@/types/cherished-people';

interface CareModeProps {
  onExit: () => void;
}

type ViewState = 'select-person' | 'care-timer' | 'write-news' | 'completed';
type QuickRecordMode = 'news' | 'thanks' | 'gift' | null;

// Lucide 아이콘 매핑 객체
const INTERACTION_ICONS: Record<string, LucideIcon> = {
  Phone,
  MessageCircle,
  Home,
  Utensils,
  Gift,
  Mail,
  HandHelping,
  Heart,
  Sparkles,
};


/**
 * 마음 전해보기 모드
 *
 * ExecutionMode처럼 타이머와 함께 소중한 사람에게 관심을 표현하는 시간을 갖습니다.
 * 완료 시 todos + care_interactions에 연결하여 저장합니다.
 */
export default function CareMode({ onExit }: CareModeProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    careMode,
    setCareModePerson,
    setCareModeLinkedTodo,
    endCareMode,
  } = useADHDModeStore();

  const {
    people,
    recommendations,
    loadPeople,
    loadRecommendations,
    addPerson,
    addInteractionWithTodo,
    showAddPersonModal,
    closeAddPersonModal,
    editingPerson,
    openAddPersonModal,
    deactivatePerson,
  } = useCherishedPeopleStore();

  const { resolvedTheme, setTheme } = useTheme();
  const { checkAndProceed, limitResult, isModalOpen: isLimitModalOpen, closeModal: closeLimitModal, onCreateSuccess } = useUsageLimitCheck();

  // 포모도로 훅 (Web Worker 기반 실제 타이머)
  const {
    timerState,
    startTimer: startPomodoroTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    adjustTime,
  } = usePomodoro();

  const [viewState, setViewState] = useState<ViewState>('select-person');
  const [reminderMessage, setReminderMessage] = useState<string>('');
  const [quickRecordMode, setQuickRecordMode] = useState<QuickRecordMode>(null);
  const [personToDelete, setPersonToDelete] = useState<CherishedPerson | null>(null);

  // 검색+생성 통합
  const [searchQuery, setSearchQuery] = useState('');

  // 필터링 로직
  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const query = searchQuery.toLowerCase();
    return people.filter(person =>
      person.name.toLowerCase().includes(query)
    );
  }, [people, searchQuery]);

  // 검색어와 정확히 일치하는 사람이 있는지 확인
  const exactMatchExists = useMemo(() => {
    return people.some(
      person => person.name.toLowerCase() === searchQuery.toLowerCase().trim()
    );
  }, [people, searchQuery]);

  // 새 사람 추가 가능 여부 (검색어 있고 + 정확히 일치 없음)
  const canCreateNew = searchQuery.trim() && !exactMatchExists;

  // 소식 작성 폼
  const [interactionType, setInteractionType] = useState<InteractionType | null>(null);
  const [skipInteractionType, setSkipInteractionType] = useState(false); // 소식만 기록할게요
  const [recentNews, setRecentNews] = useState('');
  const [gratitudeNote, setGratitudeNote] = useState('');
  const [giftPlan, setGiftPlan] = useState('');
  const [createGiftTodo, setCreateGiftTodo] = useState(false); // 할일로 추가하기
  const [giftTodoDate, setGiftTodoDate] = useState(''); // 할일 날짜
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      loadPeople(userId);
      loadRecommendations(userId, 7);
      loadReminderMessage();
    }
  }, [userId, loadPeople, loadRecommendations]);

  // 성찰 메시지 로드
  const loadReminderMessage = async () => {
    const reminder = await CherishedPeopleService.getRandomPriorityReminder();
    if (reminder) {
      setReminderMessage(reminder.message_text);
    }
  };

  // 사람 선택 - 타이머 없이 바로 소식 입력으로 이동
  const handleSelectPerson = (person: CherishedPerson) => {
    setCareModePerson(person.id, person.name);
    setViewState('write-news');
  };

  // 검색어로 새 사람 추가 (용량 체크 포함)
  const handleAddNewPersonFromSearch = async () => {
    if (!searchQuery.trim() || !userId) return;

    // 소중한 사람 용량 체크 후 추가
    await checkAndProceed('cherished_people', async () => {
      const person = await addPerson(userId, { name: searchQuery.trim() });
      if (person) {
        onCreateSuccess('cherished_people');
        handleSelectPerson(person);
        setSearchQuery('');
      }
    });
  };

  // 사람 삭제
  const handleDeletePerson = async (person: CherishedPerson) => {
    if (!userId) return;
    await deactivatePerson(person.id, userId);
    setPersonToDelete(null);
    loadPeople(userId);
    loadRecommendations(userId, 7);
  };

  // 모달 닫을 때 데이터 리로드
  const handleCloseAddPersonModal = async () => {
    closeAddPersonModal();
    if (userId) {
      await loadPeople(userId);
      await loadRecommendations(userId, 7);
    }
  };

  // 타이머 완료 처리
  const handleTimerComplete = useCallback(() => {
    stopTimer();
    setViewState('write-news');
  }, [stopTimer]);

  // 타이머 드래그로 완료 (마음 전했어요)
  const handleDragComplete = () => {
    stopTimer();
    setQuickRecordMode(null); // 전체 화면 표시
    setViewState('write-news');
  };

  // 빠른 기록 (소식/감사/선물)
  const handleQuickRecord = (mode: QuickRecordMode) => {
    stopTimer();
    setQuickRecordMode(mode);
    setViewState('write-news');
  };

  // 타이머 중지 (뒤로가기)
  const handleStopTimer = () => {
    stopTimer();
    setCareModePerson(null as any, null as any);
    setViewState('select-person');
  };

  // 시간 조정 (+5분)
  const handleAdjustTime = (minutes: number) => {
    adjustTime(minutes * 60 * 1000);
  };

  // 소식 저장
  const handleSave = async () => {
    if (!careMode.selectedPersonId || !userId) return;

    const input: CareInteractionInput = {
      person_id: careMode.selectedPersonId,
      interaction_type: skipInteractionType ? 'other' : (interactionType || 'other'),
      interaction_date: CherishedPeopleService.getTodayDateString(),
      description: giftPlan.trim() || undefined,
      gratitude_note: gratitudeNote.trim() || undefined,
      recent_news: recentNews.trim() || undefined,
    };

    // todos 제목 생성
    const todoTitle = `${careMode.selectedPersonName}님 소식 기록`;

    // 용량 체크 후 저장
    await checkAndProceed('care_interaction', async () => {
      setIsSaving(true);
      try {
        // addInteractionWithTodo로 저장 (todos + care_interactions 연결)
        const result = await addInteractionWithTodo(userId, input, todoTitle);

        if (result) {
          onCreateSuccess('care_interaction');
          setCareModeLinkedTodo(result.todoId);

          // 해드리고 싶은 것 할일로 추가
          if (createGiftTodo && giftPlan.trim()) {
            const { useTodoStore } = await import('@/state/stores/todoStore');
            const todoStore = useTodoStore.getState();
            const giftTodoTitle = `${careMode.selectedPersonName}님께: ${giftPlan.trim().slice(0, 30)}${giftPlan.length > 30 ? '...' : ''}`;
            await todoStore.createTodo({
              user_id: userId,
              title: giftTodoTitle,
              schedule_type: giftTodoDate ? 'anytime' : 'none',
              start_time: giftTodoDate ? new Date(`${giftTodoDate}T00:00:00+09:00`).toISOString() : undefined,
            });
          }

          setViewState('completed');
        }
      } catch (error) {
        console.error('소식 저장 실패:', error);
      } finally {
        setIsSaving(false);
      }
    });
  };

  // 완료 후 종료
  const handleFinish = () => {
    endCareMode();
    onExit();
  };

  // 뒤로가기 - 소식 입력에서 바로 선택 화면으로
  const handleBack = () => {
    if (viewState === 'write-news') {
      setCareModePerson(null as any, null as any);
      setViewState('select-person');
    }
  };

  // 7일 이상 연락 안 한 사람인지 확인
  const isOverdue = (person: CherishedPerson) => {
    const rec = recommendations.find(r => r.person.id === person.id);
    return rec && (rec.daysSinceLastContact >= 7 || rec.daysSinceLastContact === -1);
  };

  // 시간 포맷팅 (mm:ss)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 타이머 자연 완료 감지
  useEffect(() => {
    if (viewState === 'care-timer' && timerState.remainingTime <= 0 && timerState.status === 'running') {
      handleTimerComplete();
    }
  }, [timerState.remainingTime, timerState.status, viewState, handleTimerComplete]);

  // 진행률 계산 (0-1)
  const progress = timerState.duration > 0
    ? (timerState.duration - timerState.remainingTime) / timerState.duration
    : 0;

  return (
    <div className="min-h-screen bg-base-100 p-4 safe-area-top">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        {viewState !== 'completed' && viewState !== 'select-person' && (
          <button
            onClick={handleBack}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {viewState === 'select-person' && (
          <button
            onClick={onExit}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Heart className="w-5 h-5" fill="currentColor" />
          소식을 기록하거나 마음 전해보기
        </h1>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="btn btn-circle btn-sm btn-ghost"
          aria-label="테마 전환"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* 사람 선택 화면 */}
        {viewState === 'select-person' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* 용량 경고 배너 */}
            <UsageWarningBanner
              entities={['cherished_people', 'care_interaction']}
            />

            {/* 성찰 메시지 */}
            {reminderMessage && (
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950">
                <p className="text-sm text-sky-700 dark:text-sky-300 text-center italic">
                  &ldquo;{reminderMessage}&rdquo;
                </p>
              </div>
            )}

            {/* 검색 입력란 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름을 검색하거나 새로 추가하세요"
                className="w-full h-12 pl-10 pr-10 rounded-xl bg-base-200 border-0 text-base placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-base-300"
                >
                  <X className="w-4 h-4 text-base-content/40" />
                </button>
              )}
            </div>

            {/* 새 사람 추가 버튼 (검색어가 있고, 정확히 일치하는 사람이 없을 때) */}
            {canCreateNew && (
              <button
                onClick={handleAddNewPersonFromSearch}
                className="w-full p-4 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-left transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>&quot;{searchQuery}&quot;</span> 새로 추가
              </button>
            )}

            {/* 검색 결과 또는 추천/전체 목록 */}
            {searchQuery.trim() ? (
              // 검색어가 있을 때: 필터링된 목록
              <div className="space-y-2">
                {filteredPeople.length > 0 ? (
                  filteredPeople.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleSelectPerson(person)}
                      className="w-full p-4 rounded-xl bg-base-200 text-left hover:bg-base-300 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium">{person.name}</span>
                      {isOverdue(person) && (
                        <span className="badge badge-warning badge-sm">오래됨</span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-center text-base-content/50 py-4">
                    검색 결과가 없습니다
                  </p>
                )}
              </div>
            ) : (
              // 검색어 없을 때: 추천 섹션 + 전체 목록
              <>
                {/* 추천 섹션 (7일 이상 연락 안 한 사람) */}
                {recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-base-content/50 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      오래 연락 안 한 분들
                    </p>
                    {recommendations.slice(0, 3).map((rec) => (
                      <div
                        key={rec.person.id}
                        className="w-full p-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleSelectPerson(rec.person)}
                            className="flex-1 text-left"
                          >
                            <div>
                              <span className="font-medium text-lg">{rec.person.name}</span>
                              {(rec.person.relationships?.length > 0 || rec.person.departments?.length > 0 || rec.person.roles?.length > 0) && (
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {rec.person.relationships?.length > 0 && (
                                    <span className="text-xs text-base-content/50">
                                      {rec.person.relationships.join(', ')}
                                    </span>
                                  )}
                                  {rec.person.departments?.length > 0 && (
                                    <span className="text-xs text-secondary/70">
                                      {rec.person.departments.join(', ')}
                                    </span>
                                  )}
                                  {rec.person.roles?.length > 0 && (
                                    <span className="text-xs text-primary/70">
                                      {rec.person.roles.join(', ')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-base-content/60">
                              {CherishedPeopleService.formatDaysSince(rec.daysSinceLastContact)}
                            </span>
                            <div className="dropdown dropdown-end">
                              <button
                                tabIndex={0}
                                onClick={(e) => e.stopPropagation()}
                                className="btn btn-ghost btn-xs btn-circle"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                                <li>
                                  <button onClick={() => openAddPersonModal(rec.person)}>
                                    수정
                                  </button>
                                </li>
                                <li>
                                  <button
                                    onClick={() => setPersonToDelete(rec.person)}
                                    className="text-error"
                                  >
                                    삭제
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 전체 목록 */}
                <div className="space-y-2">
                  <p className="text-xs text-base-content/50 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    소중한 사람들
                  </p>
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="w-full p-4 rounded-xl bg-base-200 hover:bg-base-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleSelectPerson(person)}
                          className="flex-1 text-left"
                        >
                          <div>
                            <span className="font-medium">{person.name}</span>
                            {(person.relationships?.length > 0 || person.departments?.length > 0 || person.roles?.length > 0) && (
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {person.relationships?.length > 0 && (
                                  <span className="text-xs text-base-content/50">
                                    {person.relationships.join(', ')}
                                  </span>
                                )}
                                {person.departments?.length > 0 && (
                                  <span className="text-xs text-secondary/70">
                                    {person.departments.join(', ')}
                                  </span>
                                )}
                                {person.roles?.length > 0 && (
                                  <span className="text-xs text-primary/70">
                                    {person.roles.join(', ')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {isOverdue(person) && (
                            <span className="badge badge-warning badge-sm">오래됨</span>
                          )}
                          <div className="dropdown dropdown-end">
                            <button
                              tabIndex={0}
                              onClick={(e) => e.stopPropagation()}
                              className="btn btn-ghost btn-xs btn-circle"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                              <li>
                                <button onClick={() => openAddPersonModal(person)}>
                                  수정
                                </button>
                              </li>
                              <li>
                                <button
                                  onClick={() => setPersonToDelete(person)}
                                  className="text-error"
                                >
                                  삭제
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* 타이머 화면 */}
        {viewState === 'care-timer' && (
          <motion.div
            key="timer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
          >
            {/* 선택한 사람 표시 */}
            <div className="text-center">
              <p className="text-base-content/60 text-sm">지금 생각하는 분</p>
              <p className="text-2xl font-bold text-primary">
                {careMode.selectedPersonName}
              </p>
            </div>

            {/* 안내 메시지 */}
            <p className="text-center text-base-content/70 max-w-xs">
              소중한 사람을 떠올려보세요.<br/>
              마음을 전하거나,<br/>
              소식을 기록해보세요.
            </p>

            {/* 원형 타이머 */}
            <div className="relative w-64 h-64">
              <svg className="w-full h-full transform -rotate-90">
                {/* 배경 원 */}
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  className="stroke-base-300"
                  strokeWidth="12"
                />
                {/* 진행 원 */}
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  className="stroke-primary transition-all duration-200"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - progress)}
                />
              </svg>
              {/* 시간 표시 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-primary">
                  {formatTime(timerState.remainingTime)}
                </span>
                <span className="text-sm text-base-content/50 mt-2">
                  {timerState.status === 'paused' ? '일시정지' : '진행 중'}
                </span>
              </div>
            </div>

            {/* 타이머 컨트롤 */}
            <div className="flex items-center gap-4">
              {timerState.status === 'running' ? (
                <button
                  onClick={pauseTimer}
                  className="btn btn-circle btn-lg btn-ghost"
                >
                  <Pause className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={resumeTimer}
                  className="btn btn-circle btn-lg btn-ghost"
                >
                  <Play className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={() => handleAdjustTime(5)}
                className="btn btn-sm btn-outline"
              >
                +5분
              </button>
            </div>

            {/* 소식만 기록 버튼 */}
            <button
              onClick={() => handleQuickRecord('news')}
              className="btn btn-sm btn-soft gap-1"
            >
              <Newspaper className="w-4 h-4" />
              소식, 감사했던 점, 선물 계획만 기록할게요.
            </button>

            {/* 완료/건너뛰기 버튼 */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={handleDragComplete}
                className="btn btn-primary btn-lg rounded-full"
              >
                <Check className="w-5 h-5 mr-2" />
                마음 전했어요
              </button>
              <button
                onClick={handleStopTimer}
                className="btn btn-ghost btn-sm"
              >
                다음에 할게요
              </button>
            </div>
          </motion.div>
        )}

        {/* 소식 작성 화면 */}
        {viewState === 'write-news' && (
          <motion.div
            key="write"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 pb-24"
          >
            {/* 헤더 */}
            <div className="text-center mb-6">
              <p className="text-sm text-base-content/60">기록하기</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-xl font-bold text-primary">
                  {careMode.selectedPersonName}님과의 시간
                </p>
                <button
                  onClick={() => {
                    const selectedPerson = people.find(p => p.id === careMode.selectedPersonId);
                    if (selectedPerson) {
                      openAddPersonModal(selectedPerson);
                    }
                  }}
                  className="btn btn-ghost btn-xs btn-circle"
                  title="인물 정보 수정"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 1. 들은 소식 - 최상단 */}
            <div>
              <p className="text-sm font-medium mb-2">
                요즘 그분은 어떻게 지내고 계세요?
              </p>
              <textarea
                value={recentNews}
                onChange={(e) => setRecentNews(e.target.value)}
                placeholder="들은 소식을 적어보세요..."
                className="textarea textarea-bordered w-full h-24 resize-none"
              />
            </div>

            {/* 2. 어떻게 연락했나요? - quickRecordMode가 null일 때만 표시 */}
            {!quickRecordMode && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  마음을 전했다면, 기록으로 남겨보세요. 어떻게 마음을 전했나요?
                </p>
                {/* 소식만 기록할게요 옵션 */}
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipInteractionType}
                    onChange={(e) => {
                      setSkipInteractionType(e.target.checked);
                      if (e.target.checked) setInteractionType(null);
                    }}
                    className="checkbox checkbox-sm checkbox-primary"
                  />
                  <span className="text-sm text-base-content/70">소식만 기록할게요</span>
                </label>
                {!skipInteractionType && (
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(INTERACTION_TYPE_LABELS) as [InteractionType, { label: string; icon: string }][]).map(
                      ([type, { label, icon }]) => {
                        const IconComponent = INTERACTION_ICONS[icon];
                        return (
                          <button
                            key={type}
                            onClick={() => setInteractionType(type)}
                            className={`p-2 rounded-lg text-center transition-all ${
                              interactionType === type
                                ? 'bg-pink-500 text-white scale-105'
                                : 'bg-base-200 hover:bg-base-300'
                            }`}
                          >
                            <div className="flex justify-center">
                              {IconComponent && <IconComponent className="w-5 h-5" />}
                            </div>
                            <div className="text-xs mt-1">{label}</div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. 감사했던 점 */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                감사했던 점이 있다면?
              </p>
              <textarea
                value={gratitudeNote}
                onChange={(e) => setGratitudeNote(e.target.value)}
                placeholder="선택사항"
                className="textarea textarea-bordered w-full h-20 resize-none"
              />
            </div>

            {/* 4. 선물/도움 계획 + 할일 연동 */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                해드리고 싶은 것이 있나요?
              </p>
              <p className="text-xs text-base-content/50 mb-2">
                커피 한 잔의 마음도 좋아요
              </p>
              <textarea
                value={giftPlan}
                onChange={(e) => setGiftPlan(e.target.value)}
                placeholder="작은 선물, 도움, 함께하는 시간..."
                className="textarea textarea-bordered w-full h-20 resize-none"
              />
              {/* 할일로 추가 옵션 */}
              {giftPlan.trim() && (
                <div className="mt-3 p-3 rounded-lg bg-base-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createGiftTodo}
                      onChange={(e) => setCreateGiftTodo(e.target.checked)}
                      className="checkbox checkbox-sm checkbox-primary"
                    />
                    <span className="text-sm">할일로 추가하기</span>
                  </label>
                  {createGiftTodo && (
                    <input
                      type="date"
                      value={giftTodoDate}
                      onChange={(e) => setGiftTodoDate(e.target.value)}
                      className="input input-sm input-bordered w-full mt-2"
                      placeholder="날짜 선택 (선택사항)"
                    />
                  )}
                </div>
              )}
            </div>

            {/* 저장 버튼 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-base-100">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary w-full rounded-full btn-lg"
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* 완료 화면 */}
        {viewState === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
          >
            {/* 완료 아이콘 */}
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <Heart className="w-12 h-12 text-primary" fill="currentColor" />
            </div>

            {/* 완료 메시지 */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary mb-2">
                따뜻한 마음을 전했어요!
              </h2>
              <p className="text-base-content/70">
                {careMode.selectedPersonName}님이 기뻐하실 거예요
              </p>
            </div>

            {/* 성찰 메시지 */}
            <div className="p-4 rounded-xl bg-base-200 max-w-xs">
              <p className="text-sm text-base-content/80 text-center">
                관계에 투자한 시간은 절대 낭비가 아닙니다
              </p>
            </div>

            {/* 종료 버튼 */}
            <button
              onClick={handleFinish}
              className="btn btn-primary btn-lg rounded-full px-8"
            >
              완료
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 용량 제한 모달 */}
      {limitResult && (
        <UsageLimitModal
          isOpen={isLimitModalOpen}
          onClose={closeLimitModal}
          result={limitResult}
        />
      )}

      {/* 사람 추가/편집 모달 */}
      {showAddPersonModal && userId && (
        <AddPersonModal
          userId={userId}
          isOpen={showAddPersonModal}
          onClose={handleCloseAddPersonModal}
          editingPerson={editingPerson}
        />
      )}

      {/* 삭제 확인 모달 */}
      {personToDelete && (
        <dialog open className="modal z-[130]">
          <div className="modal-box">
            <h3 className="font-bold text-lg">삭제 확인</h3>
            <p className="py-4">
              &quot;{personToDelete.name}&quot;님을 목록에서 삭제하시겠습니까?
            </p>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setPersonToDelete(null)}
              >
                취소
              </button>
              <button
                className="btn btn-error"
                onClick={() => handleDeletePerson(personToDelete)}
              >
                삭제
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setPersonToDelete(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
