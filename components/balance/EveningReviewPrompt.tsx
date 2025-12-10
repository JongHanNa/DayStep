'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, X, Heart, Sparkles } from 'lucide-react';
import { useBalanceStore } from '@/state/stores/balanceStore';
import {
  DailyReflectionService,
  CONNECTION_RATINGS,
} from '@/services/daily-reflection.service';

interface EveningReviewPromptProps {
  /** 사용자 ID */
  userId: string;
  /** 모달 열림 여부 (외부 제어) */
  isOpen?: boolean;
  /** 닫기 콜백 */
  onClose?: () => void;
  /** 완료 콜백 */
  onComplete?: () => void;
}

/**
 * 저녁 리뷰 프롬프트
 *
 * "오늘 누군가에게 따뜻한 관심을 보였나요?"
 * 하루를 마무리하며 관계에 대한 리뷰를 합니다.
 */
export default function EveningReviewPrompt({
  userId,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  onComplete,
}: EveningReviewPromptProps) {
  const {
    showEveningPrompt,
    hideEveningPrompt,
    saveEveningReview,
    todayMorningIntention,
  } = useBalanceStore();

  const [actualAction, setActualAction] = useState('');
  const [connectionRating, setConnectionRating] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [promptText, setPromptText] = useState('');

  // 외부 제어 또는 내부 상태 사용
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : showEveningPrompt;

  // 랜덤 프롬프트 선택
  useEffect(() => {
    if (isOpen) {
      setPromptText(DailyReflectionService.getRandomEveningPrompt());
    }
  }, [isOpen]);

  // 모달 닫기
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      hideEveningPrompt();
    }
  };

  // 저장
  const handleSave = async () => {
    if (connectionRating === null || isSaving) return;

    setIsSaving(true);
    try {
      const result = await saveEveningReview(
        userId,
        actualAction.trim() || null,
        connectionRating
      );

      if (result) {
        setActualAction('');
        setConnectionRating(null);
        onComplete?.();
        handleClose();
      }
    } catch (error) {
      console.error('저녁 리뷰 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 건너뛰기
  const handleSkip = () => {
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 백드롭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[109]"
            onClick={handleClose}
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[110] max-w-md mx-auto"
          >
            <div className="bg-base-100 rounded-2xl shadow-xl overflow-hidden">
              {/* 헤더 */}
              <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-base-content">
                    하루 마무리
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 콘텐츠 */}
              <div className="p-6">
                {/* 질문 */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-base-content">
                    {promptText}
                  </p>
                </div>

                {/* 아침 의도 상기 */}
                {todayMorningIntention && (
                  <div className="p-3 bg-warning/10 rounded-lg mb-4">
                    <p className="text-xs text-warning font-medium mb-1">
                      오늘 아침에 설정한 의도
                    </p>
                    <p className="text-sm text-base-content">
                      {todayMorningIntention.target_person}에게{' '}
                      {todayMorningIntention.planned_action || '관심 보이기'}
                    </p>
                  </div>
                )}

                {/* 연결감 평가 */}
                <div className="mb-4">
                  <label className="text-sm text-base-content/60 mb-2 block">
                    오늘 관계에서 느낀 따뜻함은?
                  </label>
                  <div className="flex gap-2 justify-between">
                    {CONNECTION_RATINGS.map((rating) => (
                      <button
                        key={rating.value}
                        onClick={() => setConnectionRating(rating.value)}
                        className={`flex-1 py-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                          connectionRating === rating.value
                            ? 'bg-primary text-primary-content scale-105'
                            : 'bg-base-200 hover:bg-base-300'
                        }`}
                      >
                        <span className="text-xl">{rating.emoji}</span>
                        <span className="text-xs">{rating.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 실제 행동 (선택) */}
                <div>
                  <label className="text-sm text-base-content/60 mb-1 block">
                    오늘 한 관계 활동 (선택)
                  </label>
                  <input
                    type="text"
                    value={actualAction}
                    onChange={(e) => setActualAction(e.target.value)}
                    placeholder="예: 엄마에게 전화함, 친구와 저녁 식사"
                    className="input input-bordered w-full"
                  />
                </div>

                {/* 칭찬 메시지 (높은 평가일 때) */}
                {connectionRating && connectionRating >= 4 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 mt-4 p-3 bg-success/10 rounded-lg"
                  >
                    <Sparkles className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-success">
                      오늘 관계에 시간을 쓰셨네요! 균형 잡힌 하루였어요.
                    </p>
                  </motion.div>
                )}

                {/* 격려 메시지 (낮은 평가일 때) */}
                {connectionRating && connectionRating <= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 mt-4 p-3 bg-base-200 rounded-lg"
                  >
                    <Heart className="w-4 h-4 text-base-content/40 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-base-content/60">
                      바쁜 하루였나요? 내일은 잠깐이라도 소중한 사람을 떠올려보세요.
                    </p>
                  </motion.div>
                )}

                {/* 버튼 */}
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleSkip}
                    className="btn btn-ghost rounded-full flex-1"
                  >
                    건너뛰기
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={connectionRating === null || isSaving}
                    className="btn btn-primary rounded-full flex-1"
                  >
                    {isSaving ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      '저장하기'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
