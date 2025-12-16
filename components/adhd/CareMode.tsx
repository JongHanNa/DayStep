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
  Square,
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
  Frown,
  Meh,
  Smile,
  SmilePlus,
  HeartHandshake,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { useBalanceStore } from '@/state/stores/balanceStore';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTheme } from '@/hooks/useTheme';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import type { CherishedPerson, InteractionType, CareInteractionInput } from '@/types/cherished-people';
import { INTERACTION_TYPE_LABELS, FEELING_RATINGS } from '@/types/cherished-people';

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

const FEELING_ICONS: Record<string, LucideIcon> = {
  Frown,
  Meh,
  Smile,
  SmilePlus,
  HeartHandshake,
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
  } = useCherishedPeopleStore();

  const { settings } = useBalanceStore();

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
  const [interactionType, setInteractionType] = useState<InteractionType>('message');
  const [recentNews, setRecentNews] = useState('');
  const [gratitudeNote, setGratitudeNote] = useState('');
  const [giftPlan, setGiftPlan] = useState('');
  const [feelingRating, setFeelingRating] = useState<number | null>(null);
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

  // 사람 선택
  const handleSelectPerson = (person: CherishedPerson) => {
    setCareModePerson(person.id, person.name);
    setViewState('care-timer');
    // 5분 기본 타이머 시작
    startPomodoroTimer(5 * 60 * 1000);
  };

  // 검색어로 새 사람 추가
  const handleAddNewPersonFromSearch = async () => {
    if (!searchQuery.trim() || !userId) return;

    const person = await addPerson(userId, { name: searchQuery.trim() });
    if (person) {
      handleSelectPerson(person);
      setSearchQuery('');
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
      interaction_type: interactionType,
      interaction_date: CherishedPeopleService.getTodayDateString(),
      description: giftPlan.trim() || undefined,
      gratitude_note: gratitudeNote.trim() || undefined,
      recent_news: recentNews.trim() || undefined,
      feeling_rating: feelingRating ?? undefined,
    };

    // todos 제목 생성
    const todoTitle = `${careMode.selectedPersonName}님께 마음 전하기`;

    // 용량 체크 후 저장
    await checkAndProceed('care_interaction', async () => {
      setIsSaving(true);
      try {
        // addInteractionWithTodo로 저장 (todos + care_interactions 연결)
        const result = await addInteractionWithTodo(userId, input, todoTitle);

        if (result) {
          onCreateSuccess('care_interaction');
          setCareModeLinkedTodo(result.todoId);
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

  // 뒤로가기
  const handleBack = () => {
    if (viewState === 'write-news') {
      setViewState('care-timer');
      // 타이머 재시작
      startPomodoroTimer(5 * 60 * 1000);
    } else if (viewState === 'care-timer') {
      handleStopTimer();
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-base-100 p-4 safe-area-top">
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
        <h1 className="text-xl font-bold text-pink-700 flex items-center gap-2">
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
            {/* 성찰 메시지 */}
            {reminderMessage && (
              <div className="p-4 rounded-xl bg-pink-100 border border-pink-200">
                <p className="text-sm text-pink-700 text-center italic">
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
                className="w-full h-12 pl-10 pr-10 rounded-xl bg-base-200 border-0 text-base placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-pink-300"
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
                className="w-full p-4 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-700 text-left transition-colors flex items-center gap-2"
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
                      <button
                        key={rec.person.id}
                        onClick={() => handleSelectPerson(rec.person)}
                        className="w-full p-4 rounded-xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-lg">{rec.person.name}</span>
                          <span className="text-sm text-amber-600">
                            {CherishedPeopleService.formatDaysSince(rec.daysSinceLastContact)}
                          </span>
                        </div>
                      </button>
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
              <p className="text-2xl font-bold text-pink-700">
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
                  stroke="#f3f4f6"
                  strokeWidth="12"
                />
                {/* 진행 원 */}
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - progress)}
                  className="transition-all duration-200"
                />
              </svg>
              {/* 시간 표시 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-pink-600">
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
              <p className="text-xl font-bold text-pink-700">
                {careMode.selectedPersonName}님과의 시간
              </p>
            </div>

            {/* 어떻게 연락했나요? - quickRecordMode가 null일 때만 표시 */}
            {!quickRecordMode && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  어떻게 마음을 전했나요?
                </p>
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
              </div>
            )}

            {/* 들은 소식 */}
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

            {/* 감사했던 점 */}
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

            {/* 선물/도움 계획 */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                해드리고 싶은 것이 있나요?
              </p>
              <p className="text-xs text-base-content/50 mb-2">
                {settings?.gift_hint_message || '커피 한 잔의 마음도 좋아요'}
              </p>
              <textarea
                value={giftPlan}
                onChange={(e) => setGiftPlan(e.target.value)}
                placeholder="작은 선물, 도움, 함께하는 시간..."
                className="textarea textarea-bordered w-full h-20 resize-none"
              />
            </div>

            {/* 느낌 */}
            <div>
              <p className="text-sm font-medium mb-2">오늘 기분은 어때요?</p>
              <div className="flex justify-between">
                {FEELING_RATINGS.map(({ value, icon, label }) => {
                  const IconComponent = FEELING_ICONS[icon];
                  return (
                    <button
                      key={value}
                      onClick={() => setFeelingRating(value)}
                      className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                        feelingRating === value
                          ? 'bg-pink-100 scale-110'
                          : 'hover:bg-base-200'
                      }`}
                    >
                      {IconComponent && <IconComponent className="w-6 h-6" />}
                      <span className="text-xs mt-1 text-base-content/60">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-base-100 to-transparent">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary w-full rounded-full btn-lg"
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  '마음 전하기 완료'
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
            <div className="w-24 h-24 rounded-full bg-pink-100 flex items-center justify-center">
              <Heart className="w-12 h-12 text-pink-500" fill="currentColor" />
            </div>

            {/* 완료 메시지 */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-pink-700 mb-2">
                따뜻한 마음을 전했어요!
              </h2>
              <p className="text-base-content/70">
                {careMode.selectedPersonName}님이 기뻐하실 거예요
              </p>
            </div>

            {/* 성찰 메시지 */}
            <div className="p-4 rounded-xl bg-pink-50 border border-pink-200 max-w-xs">
              <p className="text-sm text-pink-700 text-center">
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
    </div>
  );
}
