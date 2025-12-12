'use client';

import {
  Briefcase, Home, ListTodo, Users,
  Clock, Timer, Heart, BookOpen, BarChart3,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUpVariants, getBidirectionalViewportOptions, staggerFadeInUpVariants, getMagneticProps } from '@/lib/animations/scrollAnimations';

// ADHD 어려움 데이터
const challenges = [
  {
    icon: Briefcase,
    area: '직장생활',
    color: 'primary',
    issues: [
      '회의 중 집중력 유지가 어려워요',
      '마감 기한을 자주 놓쳐요',
      '우선순위를 정하기 힘들어요',
      '중요한 일보다 급해 보이는 일을 먼저 해요',
    ],
  },
  {
    icon: Home,
    area: '일상생활',
    color: 'secondary',
    issues: [
      '약속 시간에 자주 늦어요',
      '열쇠, 지갑, 휴대폰을 자주 잃어버려요',
      '청구서 납부나 예약을 잊어버려요',
      '집안일을 미루다가 쌓여요',
    ],
  },
  {
    icon: ListTodo,
    area: '작업 처리',
    color: 'accent',
    issues: [
      '복잡한 일을 시작하기가 너무 어려워요',
      '시작해도 끝까지 완료하기 전에 다른 일로 넘어가요',
      '관심 있는 일에 과하게 몰입해서 다른 일을 놓쳐요',
      '세부 사항에서 실수를 자주 해요',
    ],
  },
  {
    icon: Users,
    area: '인간관계',
    color: 'info',
    issues: [
      '대화 중 상대방 말에 집중하기 어려워요',
      '약속을 잊어버려 신뢰를 잃기도 해요',
      '사소한 일에 감정이 과하게 반응해요',
      '일에 몰입하다 소중한 사람들을 놓쳐요',
    ],
  },
];

// DayStep 해결책 데이터
const solutions = [
  {
    challenge: '시작이 어려워요',
    solution: '"지금 뭐 할 거야?"',
    description: '복잡하게 생각하지 않아도 돼요. 버튼 하나로 바로 시작할 수 있어요.',
    icon: Timer,
    color: 'primary',
  },
  {
    challenge: '마감을 놓쳐요',
    solution: '실행과 집중',
    description: '타이머와 알림으로 계획한 일을 제시간에 실행할 수 있어요.',
    icon: Clock,
    color: 'secondary',
  },
  {
    challenge: '소중한 사람을 놓쳐요',
    solution: '소중한 사람 챙기기',
    description: '일에 몰입하다 잊기 쉬운 안부를 주기적으로 챙길 수 있어요.',
    icon: Heart,
    color: 'accent',
  },
  {
    challenge: '기억하기 어려워요',
    solution: '배움→과제→계획',
    description: '배운 것을 기록하고, 과제를 도출하고, 할일로 계획하세요.',
    icon: BookOpen,
    color: 'info',
  },
  {
    challenge: '과집중해요',
    solution: '기록/일정/통계',
    description: '기록과 통계로 내 시간 사용을 확인하고 균형을 찾아요.',
    icon: BarChart3,
    color: 'success',
  },
];

export default function SystemSection() {
  const fadeInVariants = fadeInUpVariants(80);
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.1);
  const staggerVariants = staggerFadeInUpVariants(60, 0.1);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
      secondary: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
      accent: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20' },
      info: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
      success: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
    };
    return colors[color] || colors.primary;
  };

  return (
    <motion.section
      id="system"
      className="py-20 px-4"
      variants={fadeInVariants}
      initial="hidden"
      whileInView="visible"
      viewport={bidirectionalViewportOptions}
    >
      <div className="max-w-6xl mx-auto">
        {/* ADHD 어려움 섹션 */}
        <div className="mb-20">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
              <AlertCircle className="w-5 h-5 text-warning" />
              <span className="text-white/90 font-medium">혹시 이런 어려움을 겪고 계신가요?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              혼자만 그런 게 아니에요
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              성인 ADHD 또는 비슷한 성향을 가진 많은 분들이
              <br className="hidden sm:block" />
              일상에서 이런 어려움을 경험합니다
            </p>
          </div>

          {/* 어려움 카드 그리드 */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={staggerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewportOptions}
          >
            {challenges.map((challenge) => {
              const colorClasses = getColorClasses(challenge.color);
              const Icon = challenge.icon;

              return (
                <motion.div
                  key={challenge.area}
                  variants={staggerVariants.item}
                  {...getMagneticProps()}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 ${colorClasses.bg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${colorClasses.text}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-base-content">
                      {challenge.area}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {challenge.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2 text-base-content/70">
                        <span className="text-base-content/40 mt-1">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </motion.div>

          {/* 공감 메시지 */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={bidirectionalViewportOptions}
            transition={{ delay: 0.3 }}
          >
            <p className="text-white/70 text-lg">
              이런 어려움들은 개인의 의지 문제가 아닙니다.
              <br className="hidden sm:block" />
              <span className="text-white font-medium">적절한 도구와 전략으로 충분히 관리할 수 있어요.</span>
            </p>
          </motion.div>
        </div>

        {/* 해결책 섹션 */}
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-4">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-white font-medium">DayStep이 도와드릴게요</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              당신의 일상을 함께 관리해요
            </h3>
            <p className="text-white/80 max-w-xl mx-auto">
              복잡하지 않아요. 필요한 기능만 담았어요.
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewportOptions}
          >
            {solutions.map((solution) => {
              const colorClasses = getColorClasses(solution.color);
              const Icon = solution.icon;

              return (
                <motion.div
                  key={solution.challenge}
                  variants={staggerVariants.item}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <div className={`w-12 h-12 ${colorClasses.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colorClasses.text}`} />
                  </div>
                  <p className="text-sm text-base-content/50 mb-1 line-through">
                    {solution.challenge}
                  </p>
                  <h4 className="text-lg font-semibold text-base-content mb-2">
                    {solution.solution}
                  </h4>
                  <p className="text-sm text-base-content/70">
                    {solution.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* 격려 메시지 */}
          <motion.div
            className="mt-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={bidirectionalViewportOptions}
            transition={{ delay: 0.3 }}
          >
            <p className="text-white text-lg font-medium">
              &quot;완벽하지 않아도 괜찮아요.
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> </span>
              오늘 하루, 한 걸음부터 시작해요.&quot;
            </p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
