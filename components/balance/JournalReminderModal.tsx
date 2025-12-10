'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Pin, RefreshCw } from 'lucide-react';
import { useBalanceStore } from '@/state/stores/balanceStore';
import { BalanceJournalService } from '@/services/balance-journal.service';

interface JournalReminderModalProps {
  /** 사용자 ID */
  userId: string;
  /** 모달 열림 여부 (외부 제어) */
  isOpen?: boolean;
  /** 닫기 콜백 */
  onClose?: () => void;
}

/**
 * 저널 상기 모달
 *
 * 사용자가 작성한 WHY 저널을 주기적으로 보여줍니다.
 * - 고정된 저널 우선
 * - 표시 횟수 적은 저널 우선
 */
export default function JournalReminderModal({
  userId,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: JournalReminderModalProps) {
  const {
    reminderJournal,
    showReminderModal,
    hideReminder,
    recordReminderShown,
    togglePinJournal,
    checkAndShowReminder,
  } = useBalanceStore();

  // 외부 제어 또는 내부 상태 사용
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : showReminderModal;

  // 모달 닫기
  const handleClose = async () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      hideReminder();
    }

    // 상기 기록
    await recordReminderShown(userId);
  };

  // 고정/해제 토글
  const handleTogglePin = async () => {
    if (reminderJournal) {
      await togglePinJournal(reminderJournal.id, userId);
    }
  };

  // 다른 저널 보기
  const handleShowAnother = async () => {
    await checkAndShowReminder(userId);
  };

  // 질문 텍스트 가져오기
  const questionText = reminderJournal
    ? BalanceJournalService.getQuestionByKey(reminderJournal.prompt_key)
    : null;

  // 유형 이름 가져오기
  const typeName = reminderJournal
    ? BalanceJournalService.getJournalTypeName(reminderJournal.journal_type)
    : '';

  if (!reminderJournal) return null;

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
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-base-content">
                    나의 다짐
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
                {/* 유형 배지 */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge badge-outline badge-sm">
                    {typeName}
                  </span>
                  {reminderJournal.is_pinned && (
                    <span className="badge badge-primary badge-sm gap-1">
                      <Pin className="w-3 h-3" />
                      고정됨
                    </span>
                  )}
                </div>

                {/* 질문 */}
                {questionText && (
                  <p className="text-sm text-base-content/60 mb-3 italic">
                    &ldquo;{questionText}&rdquo;
                  </p>
                )}

                {/* 내용 */}
                <div className="p-4 bg-base-200 rounded-lg mb-6">
                  <p className="text-base text-base-content whitespace-pre-wrap leading-relaxed">
                    {reminderJournal.content}
                  </p>
                </div>

                {/* 작성일 */}
                <p className="text-xs text-base-content/40 mb-6">
                  {new Date(reminderJournal.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}에 작성
                </p>

                {/* 버튼들 */}
                <div className="flex gap-2">
                  <button
                    onClick={handleTogglePin}
                    className={`btn btn-sm rounded-full gap-1 ${
                      reminderJournal.is_pinned ? 'btn-primary' : 'btn-ghost'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                    {reminderJournal.is_pinned ? '고정됨' : '고정하기'}
                  </button>

                  <button
                    onClick={handleShowAnother}
                    className="btn btn-ghost btn-sm rounded-full gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    다른 저널
                  </button>

                  <div className="flex-1" />

                  <button
                    onClick={handleClose}
                    className="btn btn-primary btn-sm rounded-full"
                  >
                    확인
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
