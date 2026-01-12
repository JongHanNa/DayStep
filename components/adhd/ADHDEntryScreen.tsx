'use client';

import { motion } from 'framer-motion';
import { MessageCircle, BookHeart, HelpCircle, Lightbulb, Sun, Moon, Settings, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useSubscription } from '@/hooks/useSubscription';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';
import FuelReminderBanner from '@/components/adhd/FuelReminderBanner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ADHDEntryScreenProps {
  userId?: string;
  onExecute: () => void;
  onCare: () => void;
  onRelationshipInsights: () => void;
  onFuel: (noteId?: string) => void;
}

/**
 * ADHD 모드 진입 화면
 *
 * "지금 뭐 할 거야?" 질문과 함께 두 가지 선택지 제공:
 * - 실행하기: 단일 할일 추천 모드로 진입
 * - 정리하기: 기존 GraphView로 진입
 */
export default function ADHDEntryScreen({ userId, onExecute, onCare, onRelationshipInsights, onFuel }: ADHDEntryScreenProps) {
  const router = useRouter();
  const { awakeningSentence } = useADHDModeStore();
  const { showDescriptions, setShowDescriptions } = useSettingsStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { hasActiveSubscription } = useSubscription();

  // 버튼 설명 데이터 (ADHD 어려움 → 해결책 구조)
  const buttonDescriptions = {
    care: {
      title: '소중한 사람, 놓치지 않게',
      description: '성인 ADHD의 어려움: 연락 깜빡함 → 오해 → 관계 악화\n해결책: 연락할 때가 되면 알려줘요'
    },
    insights: {
      title: '대화 내용, 다시 찾을 수 있게',
      description: '성인 ADHD의 어려움: 뭘 들었는지 기억 안 남 → 같은 질문 반복\n해결책: 기록해두면 언제든 찾을 수 있어요'
    },
    learning: {
      title: '복잡한 머릿속, 정리해줄게',
      description: '성인 ADHD의 어려움: 뭐부터 할지 모름 → 시작 못함 → 자책\n해결책: 하나씩 같이 정리해줄게요'
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
        {/* 원동력 상기 배너 (고정된 원동력이 있을 때) */}
        {userId && (
          <FuelReminderBanner
            userId={userId}
            onFuelClick={(noteId) => onFuel(noteId)}
          />
        )}

        {/* 우선순위 상기 배너 */}
        {userId && (
          <PriorityReminderBanner
            userId={userId}
            onContactClick={onCare}
          />
        )}

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
          {/* 소중한 사람, 놓치지 않게 버튼 */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCare}
              className="btn btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 shadow-lg bg-pink-500 text-white border-none hover:bg-pink-600"
            >
              <MessageCircle className="w-7 h-7" />
              <span className="text-xl font-semibold">소중한 사람, 놓치지 않게</span>
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
                <span className="text-base-content/40">성인 ADHD의 어려움:</span> 연락 깜빡함 → 오해 → 관계 악화
                <br />
                <span className="text-base-content/70">해결책:</span> 연락할 때가 되면 알려줘요
              </p>
            )}
          </div>

          {/* 대화 내용, 다시 찾을 수 있게 버튼 */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRelationshipInsights}
              className="btn btn-ghost btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 border-2 border-base-300 bg-base-200"
            >
              <BookHeart className="w-7 h-7" />
              <span className="text-xl font-semibold">대화 내용, 다시 찾을 수 있게</span>
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
                <span className="text-base-content/40">성인 ADHD의 어려움:</span> 뭘 들었는지 기억 안 남 → 같은 질문 반복
                <br />
                <span className="text-base-content/70">해결책:</span> 기록해두면 언제든 찾을 수 있어요
              </p>
            )}
          </div>

          {/* 복잡한 머릿속, 정리해줄게 버튼 */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onFuel()}
              className="btn btn-primary btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 shadow-lg"
            >
              <Lightbulb className="w-7 h-7" />
              <span className="text-xl font-semibold">복잡한 머릿속, 정리해줄게</span>
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
                <span className="text-base-content/40">성인 ADHD의 어려움:</span> 뭐부터 할지 모름 → 시작 못함 → 자책
                <br />
                <span className="text-base-content/70">해결책:</span> 하나씩 같이 정리해줄게요
              </p>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
