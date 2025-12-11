'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, ListTodo, Heart, MessageCircle, BookHeart, HelpCircle } from 'lucide-react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useBalanceStore } from '@/state/stores/balanceStore';
import { JournalReminderModal } from '@/components/balance';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';

interface ADHDEntryScreenProps {
  userId?: string;
  onExecute: () => void;
  onOrganize: () => void;
  onCare: () => void;
  onRelationshipInsights: () => void;
}

/**
 * ADHD 모드 진입 화면
 *
 * "지금 뭐 할 거야?" 질문과 함께 두 가지 선택지 제공:
 * - 실행하기: 단일 할일 추천 모드로 진입
 * - 정리하기: 기존 GraphView로 진입
 */
export default function ADHDEntryScreen({ userId, onExecute, onOrganize, onCare, onRelationshipInsights }: ADHDEntryScreenProps) {
  const { awakeningSentence } = useADHDModeStore();
  const {
    checkAndShowReminder,
    loadJournals,
    loadSettings,
    showReminderModal,
    hasJournals
  } = useBalanceStore();

  const [showJournalSetup, setShowJournalSetup] = useState(false);
  const [showDescriptions, setShowDescriptions] = useState(false);

  // 앱 시작 시 저널 데이터 로드 및 상기 체크
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      // 설정 및 저널 로드
      await loadSettings(userId);
      await loadJournals(userId);

      // 상기 조건 확인 후 모달 표시
      await checkAndShowReminder(userId);
    };

    init();
  }, [userId, loadSettings, loadJournals, checkAndShowReminder]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        {/* 우선순위 상기 배너 */}
        {userId && (
          <PriorityReminderBanner
            userId={userId}
            onContactClick={onCare}
          />
        )}

        {/* 메인 질문 */}
        <h1 className="text-2xl font-bold text-base-content mb-2">
          지금 뭐 할 거야?
        </h1>

        {/* 각성 문장 (설정된 경우) */}
        {awakeningSentence && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-base-content/60 mb-8 italic"
          >
            &ldquo;{awakeningSentence}&rdquo;
          </motion.p>
        )}

        {!awakeningSentence && <div className="mb-8" />}

        {/* 설명 보기 토글 버튼 */}
        <button
          onClick={() => setShowDescriptions(!showDescriptions)}
          className="flex items-center justify-center gap-1 text-xs text-base-content/50 hover:text-base-content/70 mb-4 mx-auto"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showDescriptions ? '설명 숨기기' : '각 버튼 설명 보기'}</span>
        </button>

        {/* 선택 버튼들 */}
        <div className="flex flex-col gap-4">
          {/* 소중한 사람 챙기기 버튼 */}
          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCare}
              className="btn btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 shadow-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white border-none hover:from-pink-600 hover:to-purple-600"
            >
              <MessageCircle className="w-7 h-7" />
              <span className="text-xl font-semibold">소중한 사람 챙기기</span>
            </motion.button>
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                일에 몰입하다 보면 소중한 사람들을 놓치기 쉬워요.
                <br />
                주기적으로 안부를 챙길 수 있게 도와줘요.
              </p>
            )}
          </div>

          {/* 작은 것 하나 실행 버튼 */}
          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onExecute}
              className="btn btn-primary btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 shadow-lg"
            >
              <Target className="w-7 h-7" />
              <span className="text-xl font-semibold">작은 것 하나 실행</span>
            </motion.button>
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                할 일이 많으면 뭐부터 해야 할지 막막하죠.
                <br />
                오늘 할 일 중 하나를 추천받거나, 바로 타이머 켜고 실행할 수 있어요.
              </p>
            )}
          </div>

          {/* 할 일 정리하기 버튼 - 기능 미연결 */}
          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {}}
              className="btn btn-ghost btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 border-2 border-base-300"
            >
              <ListTodo className="w-7 h-7" />
              <span className="text-xl font-semibold">할 일 정리하기</span>
            </motion.button>
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                머릿속이 복잡할 때 우선순위 정하기 어렵죠.
                <br />
                할 일들을 한눈에 보고 정리할 수 있어요.
              </p>
            )}
          </div>

          {/* 관계 기록 보기 버튼 */}
          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRelationshipInsights}
              className="btn btn-ghost btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 border-2 border-base-300"
            >
              <BookHeart className="w-7 h-7" />
              <span className="text-xl font-semibold">관계 기록 보기</span>
            </motion.button>
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                누구에게 뭘 들었는지 기억하기 어렵죠.
                <br />
                대화 내용과 감사한 점을 기록하고 다시 볼 수 있어요.
              </p>
            )}
          </div>

          {/* 예전 시스템 보기 버튼 - 개발 환경에서만 표시 */}
          {process.env.NODE_ENV === 'development' && (
            <div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOrganize}
                className="btn btn-ghost btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 border-2 border-base-300 border-dashed opacity-60"
              >
                <ListTodo className="w-7 h-7" />
                <span className="text-xl font-semibold">예전 시스템 보기</span>
              </motion.button>
              {showDescriptions && (
                <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                  개발자용: 이전 버전의 시스템입니다.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 저널 작성 유도 버튼 (저널이 없을 때) */}
        {userId && !hasJournals() && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={() => setShowJournalSetup(true)}
            className="mt-8 flex items-center gap-2 text-xs text-primary/60 hover:text-primary"
          >
            <Heart className="w-3 h-3" />
            나의 다짐 작성하기
          </motion.button>
        )}
      </motion.div>

      {/* 저널 상기 모달 */}
      {userId && <JournalReminderModal userId={userId} />}

      {/* 저널 작성 모달 */}
      {showJournalSetup && userId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              {/* 동적 import로 처리하거나 직접 import */}
              {/* BalanceJournalSetup은 별도 페이지에서 사용하도록 유도 */}
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">나의 다짐 작성하기</h3>
                <p className="text-sm text-base-content/60 mb-6">
                  일에만 집중하다 관계를 놓쳤던 경험을 적어보세요.
                  <br />
                  작성한 내용은 주기적으로 상기됩니다.
                </p>
                <button
                  onClick={() => setShowJournalSetup(false)}
                  className="btn btn-ghost rounded-full"
                >
                  나중에 할게
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
