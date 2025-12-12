'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, ListTodo, MessageCircle, BookHeart, HelpCircle, Lightbulb, CalendarCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';

interface ADHDEntryScreenProps {
  userId?: string;
  onExecute: () => void;
  onOrganize: () => void;
  onCare: () => void;
  onRelationshipInsights: () => void;
  onTaskOrganize: () => void;
  onMindCare: () => void;
}

/**
 * ADHD 모드 진입 화면
 *
 * "지금 뭐 할 거야?" 질문과 함께 두 가지 선택지 제공:
 * - 실행하기: 단일 할일 추천 모드로 진입
 * - 정리하기: 기존 GraphView로 진입
 */
export default function ADHDEntryScreen({ userId, onExecute, onOrganize, onCare, onRelationshipInsights, onTaskOrganize, onMindCare }: ADHDEntryScreenProps) {
  const { awakeningSentence } = useADHDModeStore();
  const [showDescriptions, setShowDescriptions] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 px-6 relative">
      {/* 테마 토글 버튼 (우측 상단) */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setTheme('light')}
          className={`btn btn-circle btn-sm ${resolvedTheme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
          aria-label="라이트 테마"
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`btn btn-circle btn-sm ${resolvedTheme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
          aria-label="다크 테마"
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>

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
          {/* 배움→과제→계획 버튼 */}
          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onMindCare}
              className="btn btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 shadow-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white border-none hover:from-amber-500 hover:to-orange-600"
            >
              <Lightbulb className="w-7 h-7" />
              <span className="text-xl font-semibold">배움→과제→계획</span>
            </motion.button>
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                오늘 배운 것을 기록하고, 과제를 도출하고,
                <br />
                할일을 계획하세요.
              </p>
            )}
          </div>

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
              <span className="text-xl font-semibold">계획된 일 또는 떠오른 일 실행</span>
            </motion.button>
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                할 일이 많으면 뭐부터 해야 할지 막막하죠.
                <br />
                오늘 할 일 중 하나를 추천받거나, 바로 타이머 켜고 실행할 수 있어요.
              </p>
            )}
          </div>

          {/* 기록/일정/통계 버튼 */}
          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onTaskOrganize}
              className="btn btn-ghost btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 border-2 border-base-300"
            >
              <CalendarCheck className="w-7 h-7" />
              <span className="text-xl font-semibold">기록/일정/통계</span>
            </motion.button>
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                지난 기록을 확인하고, 일정을 관리하고,
                <br />
                통계로 성장을 확인하세요.
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
      </motion.div>
    </div>
  );
}
