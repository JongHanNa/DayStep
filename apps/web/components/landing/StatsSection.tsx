'use client';

import { Users, Brain, TrendingUp, Award } from 'lucide-react';
import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect } from 'react';
import { getBidirectionalViewportOptions, tiltVariants, getMagneticProps } from '@/lib/animations/scrollAnimations';
import InfiniteSlider from './InfiniteSlider';

// ADHD 관련 실제 통계 데이터
const stats = [
  {
    icon: Users,
    value: 4,
    prefix: '약 ',
    suffix: '%',
    decimals: 0,
    label: '전 세계 성인 ADHD 유병률',
    description: '생각보다 많은 분들이 겪고 있어요',
    iconBgColor: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Brain,
    value: 50,
    prefix: '',
    suffix: '%+',
    decimals: 0,
    label: '불안/우울 동반 비율',
    description: '혼자 힘들어하지 않아도 돼요',
    iconBgColor: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: TrendingUp,
    value: 80,
    prefix: '',
    suffix: '%',
    decimals: 0,
    label: '관리로 개선 가능',
    description: '적절한 도구와 전략이 도움이 돼요',
    iconBgColor: 'bg-green-500/20',
    iconColor: 'text-green-400',
  },
  {
    icon: Award,
    value: 1,
    prefix: '#',
    suffix: '',
    decimals: 0,
    label: '업무 효율 저하 원인',
    description: 'WHO 선정, 관리가 중요해요',
    iconBgColor: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
  },
];

function CountUpNumber({ value, decimals, prefix = '', suffix }: { value: number; decimals: number; prefix?: string; suffix: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => prefix + latest.toFixed(decimals) + suffix);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, {
        duration: 2,
        ease: 'easeOut',
      });

      return () => {
        controls.stop();
      };
    }
    return undefined;
  }, [isInView, count, value]);

  return (
    <motion.div ref={ref} className="text-3xl font-bold text-white mb-1">
      {rounded}
    </motion.div>
  );
}

export default function StatsSection() {
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.3);

  // 통계 카드 컴포넌트
  const StatCard = ({ stat }: { stat: typeof stats[0] }) => {
    const Icon = stat.icon;

    return (
      <motion.div
        {...getMagneticProps()}
        variants={tiltVariants}
        initial="rest"
        whileHover="hover"
        className="flex flex-col items-center justify-center p-8 bg-transparent rounded-2xl min-w-[220px] flex-shrink-0"
      >
        <div className={`w-20 h-20 ${stat.iconBgColor} rounded-full flex items-center justify-center mb-4`}>
          <Icon className={`w-10 h-10 ${stat.iconColor}`} />
        </div>
        <CountUpNumber
          value={stat.value}
          decimals={stat.decimals}
          prefix={stat.prefix}
          suffix={stat.suffix}
        />
        <p className="text-lg text-white/90 text-center font-medium mb-1">
          {stat.label}
        </p>
        <p className="text-sm text-white/60 text-center">
          {stat.description}
        </p>
      </motion.div>
    );
  };

  return (
    <section className="py-16 overflow-hidden">
      <div className="w-full">
        {/* 헤더 */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={bidirectionalViewportOptions}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            성인 ADHD, 생각보다 흔합니다
          </h2>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto px-4">
            많은 분들이 비슷한 어려움을 겪고 있고,
            <br className="hidden sm:block" />
            적절한 관리로 충분히 나아질 수 있습니다
          </p>
        </motion.div>

        {/* 무한 스크롤 Stats */}
        <InfiniteSlider duration={30} direction="left" gap="gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </InfiniteSlider>

        {/* 출처 표기 */}
        <motion.p
          className="text-center text-white/40 text-xs mt-8 px-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={bidirectionalViewportOptions}
          transition={{ delay: 0.5 }}
        >
          * 통계 출처: WHO, 국제 ADHD 연구 자료 종합
        </motion.p>
      </div>
    </section>
  );
}
