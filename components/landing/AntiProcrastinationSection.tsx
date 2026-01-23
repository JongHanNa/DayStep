'use client';

import { Shield, Brain, Zap, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUpVariants, getBidirectionalViewportOptions, staggerFadeInUpVariants, getMagneticProps } from '@/lib/animations/scrollAnimations';

// 미룸방지 기능 카드 데이터
const features = [
  {
    icon: Brain,
    title: '막연함이 미룸의 원인',
    description: '"해야 하는데..." 생각만 하고 시작을 못 하는 이유는 막연해서입니다. 뭘 어디서부터 해야 할지 모르면 뇌가 회피합니다.',
    color: 'primary',
  },
  {
    icon: Zap,
    title: '뇌에 친절한 단위로 분해',
    description: 'AI가 "보고서 완성" 같은 막막한 목표를 "폴더 열기 → 파일 1개 만들기 → ..." 처럼 바로 실행 가능한 단위로 쪼개줍니다.',
    color: 'secondary',
  },
  {
    icon: Rocket,
    title: '시작이 90%',
    description: '첫 번째 작은 행동만 시작하면 나머지는 관성으로 따라옵니다. 미루던 일을 드디어 시작할 수 있어요.',
    color: 'accent',
  },
];

export default function AntiProcrastinationSection() {
  const fadeInVariants = fadeInUpVariants(80);
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.2);
  const staggerVariants = staggerFadeInUpVariants(60, 0.15);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      primary: { bg: 'bg-primary/10', text: 'text-primary' },
      secondary: { bg: 'bg-secondary/10', text: 'text-secondary' },
      accent: { bg: 'bg-accent/10', text: 'text-accent' },
    };
    return colors[color] || colors.primary;
  };

  return (
    <motion.section
      className="py-20 px-4"
      variants={fadeInVariants}
      initial="hidden"
      whileInView="visible"
      viewport={bidirectionalViewportOptions}
    >
      <div className="max-w-6xl mx-auto">
        {/* 섹션 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
            <Shield className="w-5 h-5 text-warning" />
            <span className="text-white/90 font-medium">Pro 기능</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            미루지 않게 도와주는 AI 플래닝
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            중요한 일도 자꾸 미루게 되나요?
            <br className="hidden sm:block" />
            AI가 바로 실행 가능한 작은 단위로 쪼개드립니다.
          </p>
        </div>

        {/* 기능 카드 그리드 */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewportOptions}
        >
          {features.map((feature) => {
            const colorClasses = getColorClasses(feature.color);
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                variants={staggerVariants.item}
                {...getMagneticProps()}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className={`w-14 h-14 ${colorClasses.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-7 h-7 ${colorClasses.text}`} />
                </div>
                <h3 className="text-xl font-semibold text-base-content mb-2">
                  {feature.title}
                </h3>
                <p className="text-base-content/70 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
