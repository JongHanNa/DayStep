'use client';

import { Users, CheckCircle, Star, Calendar } from 'lucide-react';
import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect } from 'react';
import { staggerFadeInUpVariants, getBidirectionalViewportOptions } from '@/lib/animations/scrollAnimations';

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
  const containerVariants = staggerFadeInUpVariants(60, 0.1);
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.3);

  return (
    <section className="py-16 px-4 bg-base-200">
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

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewportOptions}
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                variants={containerVariants.item}
                className="flex flex-col items-center justify-center p-6 bg-base-100 rounded-2xl hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <CountUpNumber
                  value={stat.value}
                  decimals={stat.decimals}
                  suffix={stat.suffix}
                />
                <p className="text-sm text-base-content/70 text-center">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
