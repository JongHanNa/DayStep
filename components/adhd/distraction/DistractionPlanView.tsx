'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Bookmark, Lightbulb, Shield } from 'lucide-react';
import {
  DistractionPreset,
  DistractionPlan,
  DistractionHistory,
  DEFAULT_DISTRACTION_EXAMPLES,
  DEFAULT_RESPONSE_EXAMPLES,
} from '@/types/distraction';

interface DistractionPlanViewProps {
  presets: DistractionPreset[];
  history: DistractionHistory | null;
  isLoading: boolean;
  onNext: (plan: DistractionPlan) => void;
  onSkip: () => void;
  onSavePreset?: (distraction: string, response: string) => Promise<void>;
}

/**
 * 방해 요소 계획 입력 화면
 * Implementation Intention: "만약 X가 생기면, Y를 할 것이다"
 */
export default function DistractionPlanView({
  presets,
  history,
  isLoading,
  onNext,
  onSkip,
  onSavePreset,
}: DistractionPlanViewProps) {
  // 입력 상태
  const [distraction, setDistraction] = useState('');
  const [response, setResponse] = useState('');
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // 제안 표시 상태
  const [showDistractionSuggestions, setShowDistractionSuggestions] = useState(false);
  const [showResponseSuggestions, setShowResponseSuggestions] = useState(false);

  // 제안 목록 생성
  const getDistractionSuggestions = useCallback((): string[] => {
    const presetItems = presets.map(p => p.distraction_text);
    const historyItems = history?.recent_distractions || [];
    const combined = [...new Set([...presetItems, ...historyItems])];

    if (combined.length === 0) {
      return [...DEFAULT_DISTRACTION_EXAMPLES];
    }

    return combined.slice(0, 5);
  }, [presets, history]);

  const getResponseSuggestions = useCallback((): string[] => {
    const presetItems = presets.map(p => p.response_text);
    const historyItems = history?.recent_responses || [];
    const combined = [...new Set([...presetItems, ...historyItems])];

    if (combined.length === 0) {
      return [...DEFAULT_RESPONSE_EXAMPLES];
    }

    return combined.slice(0, 5);
  }, [presets, history]);

  // 프리셋 선택 시
  const handlePresetSelect = (preset: DistractionPreset) => {
    setDistraction(preset.distraction_text);
    setResponse(preset.response_text);
    setSelectedPresetId(preset.id);
    setSaveAsPreset(false);
  };

  // 제안 선택 시
  const handleSuggestionSelect = (text: string, type: 'distraction' | 'response') => {
    if (type === 'distraction') {
      setDistraction(text);
      setShowDistractionSuggestions(false);

      // 프리셋에서 해당 방해요소의 대응책 찾기
      const matchingPreset = presets.find(p => p.distraction_text === text);
      if (matchingPreset) {
        setResponse(matchingPreset.response_text);
        setSelectedPresetId(matchingPreset.id);
      } else {
        setSelectedPresetId(null);
      }
    } else {
      setResponse(text);
      setShowResponseSuggestions(false);
      setSelectedPresetId(null);
    }
  };

  // 시작 버튼 핸들러
  const handleStart = async () => {
    const plan: DistractionPlan = {
      distraction: distraction.trim(),
      response: response.trim(),
      preset_id: selectedPresetId,
      review_result: null,
    };

    // 프리셋 저장 (새로운 조합인 경우)
    if (saveAsPreset && onSavePreset && !selectedPresetId) {
      try {
        await onSavePreset(plan.distraction, plan.response);
      } catch (error) {
        console.error('프리셋 저장 실패:', error);
      }
    }

    onNext(plan);
  };

  const isFormValid = distraction.trim().length > 0 && response.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full px-4 py-6"
    >
      {/* 헤더 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">집중을 방해하는 요소</h2>
        </div>
        <p className="text-sm text-base-content/60">
          미리 대비하면 집중력이 2~3배 높아져요
        </p>
      </div>

      {/* 프리셋 빠른 선택 */}
      {presets.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">자주 쓰는 조합</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.slice(0, 3).map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`btn btn-sm ${
                  selectedPresetId === preset.id ? 'btn-primary' : 'btn-ghost bg-base-200'
                }`}
              >
                {preset.distraction_text.slice(0, 15)}...
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Implementation Intention 폼 */}
      <div className="flex-1 space-y-4">
        {/* 방해 요소 입력 (If 조건) */}
        <div className="relative">
          <label className="block mb-2">
            <span className="text-sm font-medium text-primary">만약</span>
            <span className="text-sm text-base-content/60 ml-1">이런 일이 생기면...</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={distraction}
              onChange={(e) => {
                setDistraction(e.target.value);
                setSelectedPresetId(null);
              }}
              onFocus={() => setShowDistractionSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDistractionSuggestions(false), 200)}
              placeholder="예: 핸드폰 알림이 오면"
              className="input input-bordered w-full pr-10"
            />
            {distraction && (
              <button
                onClick={() => {
                  setDistraction('');
                  setSelectedPresetId(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-base-content/40" />
              </button>
            )}
          </div>

          {/* 방해요소 제안 드롭다운 */}
          <AnimatePresence>
            {showDistractionSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden"
              >
                {getDistractionSuggestions().map((text, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionSelect(text, 'distraction')}
                    className="w-full px-4 py-2 text-left hover:bg-base-200 text-sm"
                  >
                    {text}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 대응책 입력 (Then 행동) */}
        <div className="relative">
          <label className="block mb-2">
            <span className="text-sm font-medium text-secondary">그러면</span>
            <span className="text-sm text-base-content/60 ml-1">이렇게 할 거예요</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={response}
              onChange={(e) => {
                setResponse(e.target.value);
                setSelectedPresetId(null);
              }}
              onFocus={() => setShowResponseSuggestions(true)}
              onBlur={() => setTimeout(() => setShowResponseSuggestions(false), 200)}
              placeholder="예: 무음으로 바꾸고 서랍에 넣는다"
              className="input input-bordered w-full pr-10"
            />
            {response && (
              <button
                onClick={() => {
                  setResponse('');
                  setSelectedPresetId(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-base-content/40" />
              </button>
            )}
          </div>

          {/* 대응책 제안 드롭다운 */}
          <AnimatePresence>
            {showResponseSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden"
              >
                {getResponseSuggestions().map((text, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionSelect(text, 'response')}
                    className="w-full px-4 py-2 text-left hover:bg-base-200 text-sm"
                  >
                    {text}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 프리셋 저장 체크박스 (새로운 조합인 경우만 표시) */}
        {isFormValid && !selectedPresetId && onSavePreset && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsPreset}
              onChange={(e) => setSaveAsPreset(e.target.checked)}
              className="checkbox checkbox-primary checkbox-sm"
            />
            <span className="text-sm text-base-content/70">
              이 조합 저장하기
            </span>
          </label>
        )}

        {/* 미리보기 카드 */}
        {isFormValid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/20"
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm">
                  <span className="font-medium text-primary">만약</span>{' '}
                  <span className="text-base-content">{distraction}</span>
                  <span className="font-medium text-secondary ml-1">그러면</span>{' '}
                  <span className="text-base-content">{response}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onSkip}
          className="btn btn-ghost flex-1"
        >
          건너뛰기
        </button>
        <button
          onClick={handleStart}
          disabled={!isFormValid || isLoading}
          className="btn btn-primary flex-1"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              시작하기
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
