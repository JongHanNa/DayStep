'use client';

import { motion } from 'framer-motion';
import { Target, ListTodo } from 'lucide-react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';

interface ADHDEntryScreenProps {
  onExecute: () => void;
  onOrganize: () => void;
}

/**
 * ADHD 모드 진입 화면
 *
 * "지금 뭐 할 거야?" 질문과 함께 두 가지 선택지 제공:
 * - 실행하기: 단일 할일 추천 모드로 진입
 * - 정리하기: 기존 GraphView로 진입
 */
export default function ADHDEntryScreen({ onExecute, onOrganize }: ADHDEntryScreenProps) {
  const { awakeningSentence } = useADHDModeStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
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

        {/* 선택 버튼들 */}
        <div className="flex flex-col gap-4">
          {/* 실행하기 버튼 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExecute}
            className="btn btn-primary btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 shadow-lg"
          >
            <Target className="w-7 h-7" />
            <span className="text-xl font-semibold">실행하기</span>
          </motion.button>

          {/* 정리하기 버튼 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOrganize}
            className="btn btn-ghost btn-lg w-full rounded-2xl h-20 flex items-center justify-center gap-3 border-2 border-base-300"
          >
            <ListTodo className="w-7 h-7" />
            <span className="text-xl font-semibold">정리하기</span>
          </motion.button>
        </div>

        {/* 하단 힌트 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-xs text-base-content/40"
        >
          실행하기: 지금 할 수 있는 가장 작은 것 하나
        </motion.p>
      </motion.div>
    </div>
  );
}
