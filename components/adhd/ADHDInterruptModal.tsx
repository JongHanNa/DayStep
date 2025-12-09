'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Target, Clock } from 'lucide-react';

interface ADHDInterruptModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 각성 문장 */
  awakeningSentence?: string | null;
  /** "조금만 더" 선택 횟수 (1회만 허용) */
  dismissCount: number;
  /** "하나만 하고 올게" 클릭 */
  onExecute: () => void;
  /** "조금만 더 정리할게" 클릭 */
  onDismiss: () => void;
}

/**
 * ADHD 인터럽트 모달
 *
 * 정리 모드에서 과몰입을 감지했을 때 표시됩니다.
 * 사용자에게 부드럽게 실행 모드로 전환을 제안합니다.
 */
export default function ADHDInterruptModal({
  isOpen,
  awakeningSentence,
  dismissCount,
  onExecute,
  onDismiss,
}: ADHDInterruptModalProps) {
  // "조금만 더"는 1회만 허용
  const canDismiss = dismissCount < 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-[110] p-6"
          >
            <div className="bg-base-100 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
              {/* 아이콘 */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 mx-auto mb-4 bg-warning/20 rounded-full flex items-center justify-center"
              >
                <AlertCircle className="w-8 h-8 text-warning" />
              </motion.div>

              {/* 메인 메시지 */}
              <h2 className="text-xl font-bold text-base-content mb-2">
                잠깐, 지금 정리하느라
                <br />
                실행 못하고 있지 않아?
              </h2>

              {/* 각성 문장 */}
              {awakeningSentence && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-base-content/60 italic mb-6 px-4"
                >
                  &ldquo;{awakeningSentence}&rdquo;
                </motion.p>
              )}

              {!awakeningSentence && <div className="mb-6" />}

              {/* 버튼들 */}
              <div className="flex flex-col gap-3">
                {/* 실행 모드로 전환 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onExecute}
                  className="btn btn-primary btn-lg w-full rounded-full gap-2"
                >
                  <Target className="w-5 h-5" />
                  맞아, 하나만 하고 올게
                </motion.button>

                {/* 조금만 더 정리 (1회만) */}
                {canDismiss ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onDismiss}
                    className="btn btn-ghost btn-md w-full rounded-full gap-2 border border-base-300"
                  >
                    <Clock className="w-4 h-4" />
                    조금만 더 정리할게
                  </motion.button>
                ) : (
                  <p className="text-sm text-base-content/40">
                    이미 한 번 연장했어요
                  </p>
                )}
              </div>

              {/* 하단 힌트 */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 text-xs text-base-content/30"
              >
                작은 것 하나만 해도 괜찮아
              </motion.p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
