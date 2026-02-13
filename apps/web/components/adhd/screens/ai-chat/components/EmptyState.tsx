'use client';

import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, Target, Calendar } from 'lucide-react';

interface EmptyStateProps {
  onExampleClick: (text: string) => void;
}

/**
 * AI 채팅 빈 상태 화면
 */
export default function EmptyState({ onExampleClick }: EmptyStateProps) {
  const examples = [
    {
      icon: Target,
      text: '이사 계획 세워줘',
      description: '목표를 구체적인 행동으로 분해',
    },
    {
      icon: Calendar,
      text: 'TOEIC 900점 공부 계획',
      description: '학습 목표를 달성 가능한 단위로',
    },
    {
      icon: Lightbulb,
      text: '집 정리하기',
      description: '막연한 일을 시작하기 쉽게',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      {/* 소개 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold mb-2">AI로 계획 세우기</h2>
        <p className="text-sm text-base-content/60 max-w-xs mx-auto">
          ADHD 친화적인 방식으로 막연한 일을
          <br />
          구체적인 행동으로 쪼개드립니다
        </p>
      </motion.div>

      {/* CAPS 메서드 간단 소개 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm mb-6 px-4"
      >
        <div className="bg-base-200 rounded-xl p-4 text-sm">
          <h3 className="font-semibold mb-2 text-primary">🧠 CAPS 메서드</h3>
          <ul className="space-y-1 text-base-content/70 text-xs">
            <li>
              <span className="font-medium">C</span>hunk - 5-15분 단위로 쪼개기
            </li>
            <li>
              <span className="font-medium">A</span>nchor - 첫 행동 명시하기
            </li>
            <li>
              <span className="font-medium">P</span>ressure - 마감 설정하기
            </li>
            <li>
              <span className="font-medium">S</span>tart Ritual - 시작 의식 만들기
            </li>
          </ul>
        </div>
      </motion.div>

      {/* 예시 질문 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-3 px-4"
      >
        <p className="text-xs text-base-content/50 text-center mb-2">
          예시를 눌러 시작해보세요
        </p>
        {examples.map((example, index) => (
          <button
            key={index}
            onClick={() => onExampleClick(example.text)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <example.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{example.text}</p>
              <p className="text-xs text-base-content/50 truncate">
                {example.description}
              </p>
            </div>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
