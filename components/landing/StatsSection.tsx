'use client';

import { Users, CheckCircle, Star, Calendar } from 'lucide-react';
import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect } from 'react';
import { getBidirectionalViewportOptions, tiltVariants, getMagneticProps } from '@/lib/animations/scrollAnimations';
import InfiniteSlider from './InfiniteSlider';

const stats = [
  {
    icon: Users,
    value: 1000,
    suffix: '+',
    decimals: 0,
    label: '활성 사용자',
  },
  {
    icon: CheckCircle,
    value: 10000,
    suffix: '+',
    decimals: 0,
    label: '완료된 할일',
  },
  {
    icon: Star,
    value: 4.8,
    suffix: '',
    decimals: 1,
    label: '평균 평점',
  },
  {
    icon: Calendar,
    value: 50000,
    suffix: '+',
    decimals: 0,
    label: '생성된 일정',
  },
];

function CountUpNumber({ value, decimals, suffix }: { value: number; decimals: number; suffix: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(decimals) + suffix);
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
    <motion.div ref={ref} className="text-3xl font-bold text-primary mb-2">
      {rounded}
    </motion.div>
  );
}

export default function StatsSection() {
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.3);

  // 통계 카드 컴포넌트
  const StatCard = ({ stat, index }: { stat: typeof stats[0]; index: number }) => {
    const Icon = stat.icon;

    return (
      <motion.div
        {...getMagneticProps()}
        variants={tiltVariants}
        initial="rest"
        whileHover="hover"
        className="flex flex-col items-center justify-center p-8 bg-base-100 rounded-2xl shadow-md border border-base-300 min-w-[200px]"
      >
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <CountUpNumber
          value={stat.value}
          decimals={stat.decimals}
          suffix={stat.suffix}
        />
        <p className="text-sm text-base-content/70 text-center font-medium">
          {stat.label}
        </p>
      </motion.div>
    );
  };

  return (
    <section className="py-16 px-4 bg-base-200 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={bidirectionalViewportOptions}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-base-content mb-4">
            많은 사람들이 선택한 플래너
          </h2>
          <p className="text-lg text-base-content/70">
            DayStep과 함께 생산성을 높이고 있습니다
          </p>
        </motion.div>

        {/* 무한 스크롤 Stats */}
        <InfiniteSlider duration={25} direction="left" gap="gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} index={index} />
          ))}
        </InfiniteSlider>
      </div>
    </section>
  );
}
