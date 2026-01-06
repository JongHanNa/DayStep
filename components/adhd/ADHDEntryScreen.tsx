'use client';

import { motion } from 'framer-motion';
import { MessageCircle, BookHeart, HelpCircle, Lightbulb, CalendarCheck, Sun, Moon, Settings, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useSubscription } from '@/hooks/useSubscription';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ADHDEntryScreenProps {
  userId?: string;
  onExecute: () => void;
  onCare: () => void;
  onRelationshipInsights: () => void;
  onTaskOrganize: () => void;
  onFuel: () => void;
}

/**
 * ADHD 모드 진입 화면
 *
 * "지금 뭐 할 거야?" 질문과 함께 두 가지 선택지 제공:
 * - 실행하기: 단일 할일 추천 모드로 진입
 * - 정리하기: 기존 GraphView로 진입
 */
export default function ADHDEntryScreen({ userId, onExecute, onCare, onRelationshipInsights, onTaskOrganize, onFuel }: ADHDEntryScreenProps) {
  const router = useRouter();
  const { awakeningSentence } = useADHDModeStore();
  const { showDescriptions, setShowDescriptions } = useSettingsStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { hasActiveSubscription } = useSubscription();

  // 버튼 설명 데이터
  const buttonDescriptions = {
    care: {
      title: '소중한 사람 챙기기',
      description: '일에 몰입하다 보면 소중한 사람들을 놓치기 쉬워요.\n주기적으로 안부를 챙길 수 있게 도와줘요.'
    },
    insights: {
      title: '관계 기록 보기',
      description: '누구에게 뭘 들었는지 기억하기 어렵죠.\n대화 내용과 감사한 점을 기록하고 다시 볼 수 있어요.'
    },
    learning: {
      title: '쉬운 정리 패턴',
      description: '머릿속 생각을 수집하고,\n단순한 패턴으로 할일을 정리해요.'
    },
    organize: {
      title: '일정/통계',
      description: '지난 기록을 확인하고, 일정을 관리하고,\n통계로 성장을 확인하세요.'
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-base-100 px-6 relative">
      {/* 구독 상태 배지, 테마 토글 및 설정 버튼 (우측 상단) */}
      <div className="absolute top-0 pt-4 right-4 flex items-center gap-2 safe-area-top">
        {/* 구독 상태 배지 */}
        <button
          onClick={() => router.push('/settings/subscription')}
          className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
            hasActiveSubscription
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
              : 'bg-base-200 text-base-content/60'
          }`}
          aria-label="구독 관리"
        >
          {hasActiveSubscription ? (
            <>
              <Crown className="w-3 h-3" />
              Pro
            </>
          ) : (
            'Free'
          )}
        </button>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="btn btn-circle btn-sm btn-ghost"
          aria-label="테마 전환"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => router.push('/settings')}
          className="btn btn-circle btn-sm btn-ghost"
          aria-label="설정"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center mt-16 safe-area-top"
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
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCare}
              className="btn btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 shadow-lg bg-pink-500 text-white border-none hover:bg-pink-600"
            >
              <MessageCircle className="w-7 h-7" />
              <span className="text-xl font-semibold">소중한 사람 챙기기</span>
            </motion.button>
            {!showDescriptions && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                    <HelpCircle className="w-4 h-4 text-white/80" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="left" className="w-[220px] p-3 text-sm bg-base-100 border border-base-300 shadow-lg whitespace-pre-line text-center">
                  {buttonDescriptions.care.description}
                </PopoverContent>
              </Popover>
            )}
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                일에 몰입하다 보면 소중한 사람들을 놓치기 쉬워요.
                <br />
                주기적으로 안부를 챙길 수 있게 도와줘요.
              </p>
            )}
          </div>

          {/* 관계 기록 보기 버튼 */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRelationshipInsights}
              className="btn btn-ghost btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 border-2 border-base-300 bg-base-200"
            >
              <BookHeart className="w-7 h-7" />
              <span className="text-xl font-semibold">관계 기록 보기</span>
            </motion.button>
            {!showDescriptions && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="absolute top-2 right-2 p-1 rounded-full bg-base-300 hover:bg-base-content/20 transition-colors">
                    <HelpCircle className="w-4 h-4 text-base-content/60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="left" className="w-[220px] p-3 text-sm bg-base-100 border border-base-300 shadow-lg whitespace-pre-line text-center">
                  {buttonDescriptions.insights.description}
                </PopoverContent>
              </Popover>
            )}
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                누구에게 뭘 들었는지 기억하기 어렵죠.
                <br />
                대화 내용과 감사한 점을 기록하고 다시 볼 수 있어요.
              </p>
            )}
          </div>

          {/* 쉬운 정리 패턴 버튼 */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onFuel}
              className="btn btn-primary btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 shadow-lg"
            >
              <Lightbulb className="w-7 h-7" />
              <span className="text-xl font-semibold">쉬운 정리 패턴</span>
            </motion.button>
            {!showDescriptions && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                    <HelpCircle className="w-4 h-4 text-white/80" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="left" className="w-[220px] p-3 text-sm bg-base-100 border border-base-300 shadow-lg whitespace-pre-line text-center">
                  {buttonDescriptions.learning.description}
                </PopoverContent>
              </Popover>
            )}
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                머릿속 생각을 수집하고,
                <br />
                단순한 패턴으로 할일을 정리해요.
              </p>
            )}
          </div>

          {/* 일정/통계 버튼 */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onTaskOrganize}
              className="btn btn-ghost btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 border-2 border-base-300 bg-base-200"
            >
              <CalendarCheck className="w-7 h-7" />
              <span className="text-xl font-semibold">일정/통계</span>
            </motion.button>
            {!showDescriptions && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="absolute top-2 right-2 p-1 rounded-full bg-base-300 hover:bg-base-content/20 transition-colors">
                    <HelpCircle className="w-4 h-4 text-base-content/60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="left" className="w-[220px] p-3 text-sm bg-base-100 border border-base-300 shadow-lg whitespace-pre-line text-center">
                  {buttonDescriptions.organize.description}
                </PopoverContent>
              </Popover>
            )}
            {showDescriptions && (
              <p className="text-xs text-base-content/50 mt-2 text-center leading-relaxed">
                지난 기록을 확인하고, 일정을 관리하고,
                <br />
                통계로 성장을 확인하세요.
              </p>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
