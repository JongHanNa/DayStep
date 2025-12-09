'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';

interface AwakeningSentenceSetupProps {
  /** 모달 형태로 사용 시 닫기 콜백 */
  onClose?: () => void;
  /** 완료 후 콜백 */
  onComplete?: () => void;
  /** 초기 모드 (온보딩 vs 설정 편집) */
  mode?: 'onboarding' | 'edit';
}

/** 예시 각성 문장들 */
const EXAMPLE_SENTENCES = [
  '정리에 과몰입 하지마, 지금 시작해',
  '완벽한 계획보다 작은 실행이 낫다',
  '지금 이 순간, 할 수 있는 가장 작은 것 하나',
  '생각은 잠시, 행동은 지금',
  '준비는 끝났어, 이제 시작하자',
];

/**
 * 각성 문장 설정 컴포넌트
 *
 * ADHD 모드에서 정리 모드 과몰입을 막기 위해
 * 사용자가 직접 작성한 각성 문장을 보여줍니다.
 */
export default function AwakeningSentenceSetup({
  onClose,
  onComplete,
  mode = 'edit',
}: AwakeningSentenceSetupProps) {
  const { awakeningSentence, setAwakeningSentence } = useADHDModeStore();
  const [inputValue, setInputValue] = useState(awakeningSentence || '');
  const [showExamples, setShowExamples] = useState(false);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    setAwakeningSentence(trimmed || null);
    onComplete?.();
    onClose?.();
  };

  const handleSelectExample = (sentence: string) => {
    setInputValue(sentence);
    setShowExamples(false);
  };

  const handleClear = () => {
    setInputValue('');
    setAwakeningSentence(null);
  };

  const isOnboarding = mode === 'onboarding';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full ${isOnboarding ? 'max-w-md mx-auto p-6' : ''}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-base-content">
            {isOnboarding ? '나만의 각성 문장' : '각성 문장 설정'}
          </h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 설명 */}
      <p className="text-sm text-base-content/60 mb-4">
        {isOnboarding
          ? '정리에 빠져있을 때 나를 깨워줄 문장을 적어보세요.'
          : '정리 모드에서 인터럽트 팝업에 표시됩니다.'}
      </p>

      {/* 입력 필드 */}
      <div className="relative mb-4">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="예: 정리하다 하루 다 가면, 그건 섬김이 아니야"
          className="textarea textarea-bordered w-full h-24 text-base resize-none"
          maxLength={100}
        />
        <span className="absolute bottom-2 right-2 text-xs text-base-content/40">
          {inputValue.length}/100
        </span>
      </div>

      {/* 예시 보기 토글 */}
      <button
        onClick={() => setShowExamples(!showExamples)}
        className="btn btn-ghost btn-sm mb-4 text-primary"
      >
        {showExamples ? '예시 숨기기' : '예시 보기'}
      </button>

      {/* 예시 문장들 */}
      {showExamples && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 space-y-2"
        >
          {EXAMPLE_SENTENCES.map((sentence, index) => (
            <button
              key={index}
              onClick={() => handleSelectExample(sentence)}
              className="w-full text-left p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors text-sm text-base-content/80"
            >
              &ldquo;{sentence}&rdquo;
            </button>
          ))}
        </motion.div>
      )}

      {/* 버튼들 */}
      <div className="flex gap-2">
        {inputValue && (
          <button
            onClick={handleClear}
            className="btn btn-ghost btn-sm rounded-full"
          >
            지우기
          </button>
        )}
        <div className="flex-1" />
        {!isOnboarding && onClose && (
          <button
            onClick={onClose}
            className="btn btn-ghost rounded-full"
          >
            취소
          </button>
        )}
        <button
          onClick={handleSave}
          className="btn btn-primary rounded-full"
        >
          {isOnboarding ? '시작하기' : '저장'}
        </button>
      </div>

      {/* 온보딩 모드: 건너뛰기 */}
      {isOnboarding && (
        <button
          onClick={() => {
            setAwakeningSentence(null);
            onComplete?.();
          }}
          className="w-full mt-4 text-sm text-base-content/40 hover:text-base-content/60"
        >
          나중에 설정할게
        </button>
      )}
    </motion.div>
  );
}
