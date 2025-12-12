'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import type { MoodLevel } from '@/types/mind-care';
import { useMindCareStore } from '@/state/stores/mindCareStore';
import { usePomodoro } from '@/hooks/usePomodoro';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MindCareModeProps {
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
 * 나의 마음 챙기기 모드
 *
 * ExecutionMode처럼 타이머와 함께 마음 돌봄 시간을 갖습니다.
 * 타이머 진행 중에 기록을 작성하고, 완료 시 저장합니다.
 */
export default function MindCareMode({ onExit }: MindCareModeProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    mindCareMode,
    setMindCareViewState,
    setMindCareDraft,
    resetMindCareDraft,
    endMindCareMode,
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
  } = useMindCareStore();

  // 포모도로 훅 (Web Worker 기반 실제 타이머)
  const {
    timerState,
    startTimer: startPomodoroTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    adjustTime,
  } = usePomodoro();

  // 로컬 상태
  const [selectedDuration, setSelectedDuration] = useState(10); // 기본 10분
  const [moodRating, setMoodRating] = useState<MoodLevel | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { viewState, draftContent, draftSourceText, draftSourceReference, draftExperience, draftCommitment } = mindCareMode;

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      loadStats(userId);
    }
  }, [userId, loadStats]);

  // history 뷰일 때 기록 로드
  useEffect(() => {
    if (userId && viewState === 'history') {
      loadEntries(userId);
    }
  }, [userId, viewState, loadEntries]);

  // 타이머 시작 시 질문 로드 (통합 폼이므로 reflection 타입의 질문 사용)
  useEffect(() => {
    if (viewState === 'timer-running') {
      loadRandomPrompt('reflection');
    }
  }, [viewState, loadRandomPrompt]);

  // 타이머 완료 감지
  useEffect(() => {
    if (timerState.status === 'completed' && viewState === 'timer-running') {
      handleTimerComplete();
    }
  }, [timerState.status, viewState]);

  // 타이머 시작
  const handleStartTimer = () => {
    setMindCareViewState('timer-running');
    startPomodoroTimer(selectedDuration * 60 * 1000);
  };

  // 타이머 완료 처리
  const handleTimerComplete = useCallback(() => {
    stopTimer();
    setMindCareViewState('capture');
  }, [stopTimer, setMindCareViewState]);

  // 타이머 드래그로 완료
  const handleDragComplete = () => {
    stopTimer();
    setMindCareViewState('capture');
  };

  // 타이머 중지 (뒤로가기)
  const handleStopTimer = () => {
    stopTimer();
    resetMindCareDraft();
    setMindCareViewState('select-duration');
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

      resetMindCareDraft();
      setMoodRating(null);
      setSelectedTags([]);
      setMindCareViewState('completed');
      loadStats(userId); // 통계 갱신
    } catch (error) {
      console.error('기록 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 저장 건너뛰기
  const handleSkipSave = () => {
    resetMindCareDraft();
    setMoodRating(null);
    setSelectedTags([]);
    setMindCareViewState('completed');
  };

  // 뒤로가기 처리
  const handleBack = () => {
    switch (viewState) {
      case 'timer-running':
        handleStopTimer();
        break;
      case 'capture':
        setMindCareViewState('timer-running');
        break;
      case 'history':
        setMindCareViewState('select-duration');
        break;
      case 'completed':
        endMindCareMode();
        onExit();
        break;
      default:
        endMindCareMode();
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

  // 타이머 시간 선택 화면 (통합 폼 - 유형 선택 제거)
  const renderSelectDurationView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full p-4"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="btn btn-ghost btn-circle">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">나의 마음 챙기기</h1>
      </div>

      {/* 연속 기록 */}
      {stats && stats.currentStreak > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-gradient-to-r from-orange-100 to-pink-100 rounded-xl">
          <span className="text-2xl">🔥</span>
          <span className="font-medium">연속 {stats.currentStreak}일째 기록 중!</span>
        </div>
      )}

      {/* 안내 문구 */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-6">
          <Heart className="w-10 h-10 text-purple-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">마음 돌봄 시간</h2>
        <p className="text-base-content/60 mb-6">
          타이머와 함께 깨달음, 위로, 감사를<br />
          자유롭게 기록해보세요
        </p>

        {/* 타이머 시간 선택 */}
        <div className="w-full max-w-xs mb-6">
          <p className="text-sm text-base-content/60 mb-3">타이머 시간</p>
          <div className="flex gap-2">
            {TIMER_OPTIONS.map(min => (
              <button
                key={min}
                onClick={() => setSelectedDuration(min)}
                className={`btn btn-sm flex-1 ${selectedDuration === min ? 'btn-primary' : 'btn-ghost'}`}
              >
                {min}분
              </button>
            ))}
          </div>
        </div>

        {/* 시작 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStartTimer}
          className="btn btn-primary btn-lg gap-2 rounded-full px-8"
        >
          <Play className="w-5 h-5" />
          시작하기
        </motion.button>
      </div>

      {/* 과거 기록 보기 */}
      <button
        onClick={() => setMindCareViewState('history')}
        className="btn btn-ghost gap-2 mt-4"
      >
        <History className="w-5 h-5" />
        과거 기록 보기
      </button>
    </motion.div>
  );

  // 타이머 + 통합 기록 화면
  const renderTimerRunningView = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col h-full p-4 overflow-y-auto"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleStopTimer} className="btn btn-ghost btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-500">
            <Heart className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-bold">나의 마음 챙기기</h1>
        </div>

        {/* 오늘의 질문 */}
        {currentPrompt && (
          <div className="p-3 bg-base-200 rounded-xl mb-4">
            <p className="text-sm text-base-content/60 mb-1">오늘의 질문</p>
            <p className="font-medium">{currentPrompt.prompt_text}</p>
          </div>
        )}

        {/* 원형 타이머 */}
        <div className="flex justify-center mb-4">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{formatTime(timerState.remainingTime)}</span>
            </div>
          </div>
        </div>

        {/* 타이머 컨트롤 */}
        <div className="flex justify-center items-center gap-4 mb-4">
          <button onClick={() => handleAdjustTime(-1)} className="btn btn-ghost btn-sm">
            <Minus className="w-4 h-4" /> 1분
          </button>
          {timerState.isRunning ? (
            <button onClick={pauseTimer} className="btn btn-primary btn-circle btn-lg">
              <Pause className="w-6 h-6" />
            </button>
          ) : (
            <button onClick={resumeTimer} className="btn btn-primary btn-circle btn-lg">
              <Play className="w-6 h-6" />
            </button>
          )}
          <button onClick={() => handleAdjustTime(1)} className="btn btn-ghost btn-sm">
            <Plus className="w-4 h-4" /> 1분
          </button>
        </div>

        <p className="text-center text-sm text-base-content/50 mb-4">
          타이머가 끝나면 기록을 저장할 수 있어요
        </p>

        {/* 통합 기록 입력 폼 - 5개 필드 */}
        <div className="flex-1 space-y-4">
          {/* 1. 마음에 닿은 글 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              마음에 닿은 글 <span className="text-base-content/40">(선택)</span>
            </label>
            <textarea
              value={draftSourceText}
              onChange={(e) => setMindCareDraft({ sourceText: e.target.value })}
              placeholder="읽은 글, 들은 말, 영감을 준 내용..."
              className="textarea textarea-bordered w-full h-20 resize-none"
            />
          </div>

          {/* 2. 출처 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              출처 <span className="text-base-content/40">(선택)</span>
            </label>
            <input
              type="text"
              value={draftSourceReference}
              onChange={(e) => setMindCareDraft({ sourceReference: e.target.value })}
              placeholder="책, 사람, 영상 등"
              className="input input-bordered w-full"
            />
          </div>

          {/* 3. 나의 생각 (필수) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              나의 생각 <span className="text-purple-500">*</span>
            </label>
            <textarea
              value={draftContent}
              onChange={(e) => setMindCareDraft({ content: e.target.value })}
              placeholder="깨달음, 위로, 감사, 성찰 등 자유롭게..."
              className="textarea textarea-bordered w-full h-24 resize-none"
            />
          </div>

          {/* 4. 오늘의 경험 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              오늘의 경험 <span className="text-base-content/40">(선택)</span>
            </label>
            <textarea
              value={draftExperience}
              onChange={(e) => setMindCareDraft({ experience: e.target.value })}
              placeholder="오늘 마음에 와닿은 순간, 경험한 일..."
              className="textarea textarea-bordered w-full h-20 resize-none"
            />
          </div>

          {/* 5. 실천 다짐 (선택) */}
          <div>
            <label className="text-sm font-medium text-base-content/70 mb-1 block">
              실천 다짐 <span className="text-base-content/40">(선택)</span>
            </label>
            <textarea
              value={draftCommitment}
              onChange={(e) => setMindCareDraft({ commitment: e.target.value })}
              placeholder="앞으로의 계획, 적용할 점..."
              className="textarea textarea-bordered w-full h-20 resize-none"
            />
          </div>
        </div>

        {/* 완료 버튼 (타이머 실행 중에도 바로 완료 가능) */}
        <button
          onClick={handleDragComplete}
          className="btn btn-outline btn-sm mt-4"
        >
          바로 완료하기
        </button>
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
          <button onClick={() => setMindCareViewState('timer-running')} className="btn btn-ghost btn-circle">
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
  const renderCompletedView = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center h-full p-4"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">오늘도 마음을 돌봤어요!</h2>
        {stats && stats.currentStreak > 0 && (
          <p className="text-base-content/60 mb-6">
            연속 {stats.currentStreak}일째 기록 중 🔥
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              resetMindCareDraft();
              setMindCareViewState('select-duration');
            }}
            className="btn btn-ghost"
          >
            처음으로
          </button>
          <button
            onClick={() => setMindCareViewState('history')}
            className="btn btn-outline"
          >
            과거 기록 보기
          </button>
          <button
            onClick={() => {
              endMindCareMode();
              onExit();
            }}
            className="btn btn-primary"
          >
            완료
          </button>
        </div>
      </div>
    </motion.div>
  );

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
        <button onClick={() => setMindCareViewState('select-duration')} className="btn btn-ghost btn-circle">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">과거 기록</h1>
      </div>

      {/* 기록 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
    <div className="fixed inset-0 bg-base-100 z-50 flex flex-col">
      <AnimatePresence mode="wait">
        {viewState === 'select-duration' && renderSelectDurationView()}
        {viewState === 'timer-running' && renderTimerRunningView()}
        {viewState === 'capture' && renderCaptureView()}
        {viewState === 'completed' && renderCompletedView()}
        {viewState === 'history' && renderHistoryView()}
      </AnimatePresence>
    </div>
  );
}
