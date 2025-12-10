'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, X, Users, Sparkles } from 'lucide-react';
import { useBalanceStore } from '@/state/stores/balanceStore';
import { DailyReflectionService } from '@/services/daily-reflection.service';

interface MorningIntentionPromptProps {
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
 * 아침 의도 설정 프롬프트
 *
 * "오늘 누구에게 따뜻한 관심을 보낼까요?"
 * 하루를 시작하며 관계에 대한 의도를 설정합니다.
 */
export default function MorningIntentionPrompt({
  userId,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  onComplete,
}: MorningIntentionPromptProps) {
  const {
    showMorningPrompt,
    hideMorningPrompt,
    saveMorningIntention,
  } = useBalanceStore();

  const [targetPerson, setTargetPerson] = useState('');
  const [plannedAction, setPlannedAction] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [promptText, setPromptText] = useState('');

  // 외부 제어 또는 내부 상태 사용
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : showMorningPrompt;

  // 랜덤 프롬프트 선택
  useEffect(() => {
    if (isOpen) {
      setPromptText(DailyReflectionService.getRandomMorningPrompt());
    }
  }, [isOpen]);

  // 모달 닫기
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      hideMorningPrompt();
    }
  };

  // 저장
  const handleSave = async () => {
    if (!targetPerson.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const result = await saveMorningIntention(
        userId,
        targetPerson.trim(),
        plannedAction.trim() || undefined
      );

      if (result) {
        setTargetPerson('');
        setPlannedAction('');
        onComplete?.();
        handleClose();
      }
    } catch (error) {
      console.error('아침 의도 저장 실패:', error);
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
              <div className="bg-warning/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium text-base-content">
                    하루 시작
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
                  <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-warning" />
                  </div>
                  <p className="text-lg font-medium text-base-content">
                    {promptText}
                  </p>
                </div>

                {/* 입력 필드 */}
                <div className="space-y-4">
                  {/* 대상 */}
                  <div>
                    <label className="text-sm text-base-content/60 mb-1 block">
                      누구에게
                    </label>
                    <input
                      type="text"
                      value={targetPerson}
                      onChange={(e) => setTargetPerson(e.target.value)}
                      placeholder="예: 엄마, 친구 ○○, 동료 ○○"
                      className="input input-bordered w-full"
                      autoFocus
                    />
                  </div>

                  {/* 계획 (선택) */}
                  <div>
                    <label className="text-sm text-base-content/60 mb-1 block">
                      어떻게 (선택)
                    </label>
                    <input
                      type="text"
                      value={plannedAction}
                      onChange={(e) => setPlannedAction(e.target.value)}
                      placeholder="예: 안부 전화, 커피 한잔, 감사 문자"
                      className="input input-bordered w-full"
                    />
                  </div>
                </div>

                {/* 힌트 */}
                <div className="flex items-start gap-2 mt-4 p-3 bg-base-200 rounded-lg">
                  <Sparkles className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-base-content/60">
                    오늘 하루 중 잠깐이라도 관계에 시간을 내보세요.
                    작은 관심이 큰 따뜻함이 됩니다.
                  </p>
                </div>

                {/* 버튼 */}
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleSkip}
                    className="btn btn-ghost rounded-full flex-1"
                  >
                    오늘은 건너뛰기
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!targetPerson.trim() || isSaving}
                    className="btn btn-warning rounded-full flex-1"
                  >
                    {isSaving ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      '설정하기'
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
