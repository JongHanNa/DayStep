'use client';

import { motion } from 'framer-motion';
import { Calendar, Brain, Target, CheckCircle2, Sparkles, Clock } from 'lucide-react';
import { getBidirectionalViewportOptions } from '@/lib/animations/scrollAnimations';

/**
 * 스크롤 진행률 기반 이미지 태그 애니메이션 섹션
 * Structured.app 스타일의 이미지 태그가 모여서 섹션을 완성하는 효과
 */
export default function ScrollProgressSection() {
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.3);

  // 이미지 태그 데이터
  const featureTags = [
    { icon: Calendar, label: '타임라인', color: 'bg-primary' },
    { icon: Brain, label: 'Second Brain', color: 'bg-accent' },
    { icon: Target, label: '목표', color: 'bg-secondary' },
    { icon: CheckCircle2, label: '할일', color: 'bg-info' },
    { icon: Sparkles, label: 'AI', color: 'bg-success' },
    { icon: Clock, label: '루틴', color: 'bg-warning' },
  ];

  // 2행 3열 그리드 위치 계산 (각 태그의 최종 위치)
  const getGridPosition = (index: number) => {
    const cols = 3;
    const row = Math.floor(index / cols);
    const col = index % cols;

    // 그리드 간격
    const gapX = 280; // 카드 너비 + 간격
    const gapY = 100; // 행 간격

    // 중앙 정렬을 위한 오프셋
    const offsetX = -((cols - 1) * gapX) / 2;
    const offsetY = -gapY / 2;

    return {
      x: col * gapX + offsetX,
      y: row * gapY + offsetY,
    };
  };

  // 원형 경로에서 출발 위치 계산
  const getCircularStartPosition = (index: number, total: number) => {
    const angle = (360 / total) * index;
    const radius = 300;

    return {
      x: Math.cos((angle * Math.PI) / 180) * radius,
      y: Math.sin((angle * Math.PI) / 180) * radius,
      rotate: angle,
    };
  };

  return (
    <section className="relative py-32 px-4 bg-gradient-to-b from-base-100 via-base-200 to-base-100 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* 중앙 제목 */}
        <motion.div
          className="relative z-10 text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={bidirectionalViewportOptions}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-base-content mb-6">
            모든 기능이 하나로
          </h2>
          <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
            DayStep은 생산성 향상에 필요한 모든 도구를 하나의 앱에 담았습니다
          </p>
        </motion.div>

        {/* 이미지 태그 애니메이션 - 원형 경로에서 그리드로 모임 */}
        <div className="relative min-h-[400px] flex items-center justify-center">
          {featureTags.map((tag, index) => {
            const Icon = tag.icon;
            const startPos = getCircularStartPosition(index, featureTags.length);
            const endPos = getGridPosition(index);
            const delay = (index / featureTags.length) * 0.3;

            return (
              <motion.div
                key={index}
                className="absolute"
                initial={{
                  opacity: 0,
                  x: startPos.x,
                  y: startPos.y,
                  rotate: startPos.rotate,
                  scale: 0.5,
                }}
                whileInView={{
                  opacity: 1,
                  x: endPos.x,
                  y: endPos.y,
                  rotate: 0,
                  scale: 1,
                  transition: {
                    duration: 1,
                    delay,
                    ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
                  },
                }}
                viewport={{
                  once: false,
                  amount: 0.3,
                }}
              >
                <div className={`${tag.color} text-white rounded-2xl px-6 py-4 shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-3 hover:scale-110 transition-transform cursor-pointer whitespace-nowrap`}>
                  <Icon className="w-6 h-6" />
                  <span className="font-semibold text-lg">{tag.label}</span>
                </div>
              </motion.div>
            );
          })}

          {/* 중앙 원형 배경 */}
          <motion.div
            className="absolute w-64 h-64 rounded-full bg-primary/5 blur-3xl"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={bidirectionalViewportOptions}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>

        {/* 하단 설명 */}
        <motion.div
          className="text-center mt-16 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={bidirectionalViewportOptions}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p className="text-lg text-base-content/80 max-w-3xl mx-auto leading-relaxed">
            <strong className="text-primary">타임라인 뷰</strong>로 하루를 시각화하고,{' '}
            <strong className="text-accent">Second Brain</strong>으로 생각을 정리하며,{' '}
            <strong className="text-secondary">목표 관리</strong>로 꿈을 실현하세요.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {['직관적', '체계적', '효율적'].map((keyword, index) => (
              <motion.span
                key={index}
                className="px-6 py-2 bg-base-100 rounded-full text-base-content font-medium border border-base-300"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={bidirectionalViewportOptions}
                transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
              >
                {keyword}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
