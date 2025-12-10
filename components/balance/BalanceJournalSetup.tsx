'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronLeft, ChevronRight, X, Check, Lightbulb } from 'lucide-react';
import { useBalanceStore } from '@/state/stores/balanceStore';
import {
  JournalType,
  JOURNAL_PROMPTS,
  BalanceJournalService
} from '@/services/balance-journal.service';

interface BalanceJournalSetupProps {
  /** 사용자 ID */
  userId: string;
  /** 모달 닫기 콜백 */
  onClose?: () => void;
  /** 완료 후 콜백 */
  onComplete?: () => void;
  /** 초기 모드 */
  mode?: 'onboarding' | 'edit';
  /** 특정 유형만 보여줄지 */
  journalType?: JournalType;
}

/** 유형별 설명 */
const TYPE_DESCRIPTIONS: Record<JournalType, { title: string; description: string }> = {
  why_relationship: {
    title: '관계의 중요성',
    description: '나에게 관계가 왜 중요한지 생각해보세요.'
  },
  regret_reflection: {
    title: '후회 성찰',
    description: '놓쳤던 순간을 되돌아보며 다짐해보세요.'
  },
  gratitude_connection: {
    title: '감사 연결',
    description: '따뜻했던 순간을 기억해보세요.'
  },
};

/**
 * WHY 저널 작성 컴포넌트
 *
 * 관계의 중요성에 대해 직접 경험을 작성하게 유도합니다.
 * 작성한 내용은 주기적으로 상기되어 각성 효과를 줍니다.
 */
export default function BalanceJournalSetup({
  userId,
  onClose,
  onComplete,
  mode = 'edit',
  journalType,
}: BalanceJournalSetupProps) {
  const { createJournal, loadJournals } = useBalanceStore();

  // 현재 선택된 유형과 질문 인덱스
  const [selectedType, setSelectedType] = useState<JournalType>(
    journalType || 'why_relationship'
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const currentPrompts = JOURNAL_PROMPTS[selectedType];
  const currentPrompt = currentPrompts[questionIndex];
  const typeInfo = TYPE_DESCRIPTIONS[selectedType];
  const isOnboarding = mode === 'onboarding';

  // 다음 질문으로
  const handleNextQuestion = () => {
    if (questionIndex < currentPrompts.length - 1) {
      setQuestionIndex(questionIndex + 1);
      setInputValue('');
    }
  };

  // 이전 질문으로
  const handlePrevQuestion = () => {
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
      setInputValue('');
    }
  };

  // 저장
  const handleSave = async () => {
    if (!inputValue.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const result = await createJournal(
        userId,
        selectedType,
        currentPrompt.key,
        inputValue.trim()
      );

      if (result) {
        setSavedCount(prev => prev + 1);
        setInputValue('');

        // 다음 질문이 있으면 이동, 없으면 완료
        if (questionIndex < currentPrompts.length - 1) {
          handleNextQuestion();
        } else {
          // 모든 질문 완료
          await loadJournals(userId);
          onComplete?.();
          onClose?.();
        }
      }
    } catch (error) {
      console.error('저널 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 유형 탭 변경
  const handleTypeChange = (type: JournalType) => {
    setSelectedType(type);
    setQuestionIndex(0);
    setInputValue('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full ${isOnboarding ? 'max-w-lg mx-auto p-6' : ''}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-base-content">
            {isOnboarding ? '나의 다짐 작성하기' : '균형 저널'}
          </h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 설명 */}
      <div className="flex items-start gap-3 mb-6 p-3 bg-base-200 rounded-lg">
        <Lightbulb className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-sm text-base-content/70">
          {isOnboarding
            ? '일에 빠져서 관계를 놓쳤던 경험을 적어보세요. 작성한 내용은 주기적으로 상기되어 균형 잡힌 삶을 도와줍니다.'
            : '직접 작성한 경험은 더 강한 각성 효과를 줍니다.'}
        </p>
      </div>

      {/* 유형 탭 (특정 유형 지정 안 됐을 때만) */}
      {!journalType && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(Object.keys(TYPE_DESCRIPTIONS) as JournalType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`btn btn-sm rounded-full whitespace-nowrap ${
                selectedType === type
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {TYPE_DESCRIPTIONS[type].title}
            </button>
          ))}
        </div>
      )}

      {/* 현재 유형 설명 */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-base-content mb-1">
          {typeInfo.title}
        </h3>
        <p className="text-sm text-base-content/60">
          {typeInfo.description}
        </p>
      </div>

      {/* 질문 네비게이션 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevQuestion}
          disabled={questionIndex === 0}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm text-base-content/60">
          질문 {questionIndex + 1} / {currentPrompts.length}
        </span>

        <button
          onClick={handleNextQuestion}
          disabled={questionIndex === currentPrompts.length - 1}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 질문 카드 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPrompt.key}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mb-4"
        >
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 mb-4">
            <p className="text-base font-medium text-base-content">
              &ldquo;{currentPrompt.question}&rdquo;
            </p>
          </div>

          {/* 입력 필드 */}
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="여기에 경험이나 생각을 적어보세요..."
              className="textarea textarea-bordered w-full h-32 text-base resize-none"
              maxLength={500}
            />
            <span className="absolute bottom-2 right-2 text-xs text-base-content/40">
              {inputValue.length}/500
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 저장된 수 표시 */}
      {savedCount > 0 && (
        <div className="mb-4 text-sm text-success flex items-center gap-1">
          <Check className="w-4 h-4" />
          {savedCount}개 저장됨
        </div>
      )}

      {/* 버튼들 */}
      <div className="flex gap-2">
        <button
          onClick={handleNextQuestion}
          disabled={questionIndex === currentPrompts.length - 1}
          className="btn btn-ghost rounded-full"
        >
          건너뛰기
        </button>

        <div className="flex-1" />

        {!isOnboarding && onClose && (
          <button
            onClick={onClose}
            className="btn btn-ghost rounded-full"
          >
            닫기
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={!inputValue.trim() || isSaving}
          className="btn btn-primary rounded-full"
        >
          {isSaving ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            '저장'
          )}
        </button>
      </div>

      {/* 온보딩 모드: 나중에 하기 */}
      {isOnboarding && (
        <button
          onClick={() => {
            onComplete?.();
            onClose?.();
          }}
          className="w-full mt-4 text-sm text-base-content/40 hover:text-base-content/60"
        >
          나중에 작성할게
        </button>
      )}
    </motion.div>
  );
}
