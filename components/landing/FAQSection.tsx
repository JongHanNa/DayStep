'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { fadeInUpVariants, getViewportOptions } from '@/lib/animations/scrollAnimations';

const faqs = [
  {
    question: 'DayStep은 무료인가요?',
    answer: 'DayStep은 기본 기능을 무료로 제공합니다. 타임라인 관리, 할일 목록, Second Brain 기본 기능을 무료로 사용할 수 있으며, 추가 기능이 필요한 경우 프리미엄 플랜을 선택할 수 있습니다.',
  },
  {
    question: '다른 플래너 앱과 어떻게 다른가요?',
    answer: 'DayStep은 단순한 할일 관리를 넘어 Second Brain 시스템을 통합한 생산성 앱입니다. 타임라인 뷰로 하루를 시각화하고, AI 추천으로 스마트한 일정 관리가 가능하며, 생각을 체계적으로 정리할 수 있습니다.',
  },
  {
    question: '모바일과 웹에서 모두 사용할 수 있나요?',
    answer: '네! DayStep은 웹 브라우저에서 사용할 수 있으며, iOS와 Android 앱도 제공합니다. 모든 기기에서 실시간으로 동기화되어 어디서든 일정을 관리할 수 있습니다.',
  },
  {
    question: '데이터는 안전하게 보호되나요?',
    answer: '사용자 데이터 보안을 최우선으로 생각합니다. 모든 데이터는 암호화되어 저장되며, Supabase의 안전한 인프라를 통해 관리됩니다. 개인정보 보호 정책을 철저히 준수하고 있습니다.',
  },
  {
    question: '어떤 기능들이 포함되어 있나요?',
    answer: 'DayStep은 타임라인 뷰, Second Brain 시스템, 목표 관리, 할일 관리, AI 추천, 반복 일정, 집중 타이머 등 다양한 생산성 도구를 제공합니다. 각 기능은 직관적으로 설계되어 쉽게 사용할 수 있습니다.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const fadeInVariants = fadeInUpVariants(80);
  const viewportOptions = getViewportOptions(true, 0.3);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <motion.section
      id="faq"
      className="py-20 px-4 bg-base-200"
      variants={fadeInVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-base-content mb-4">
            자주 묻는 질문
          </h2>
          <p className="text-lg text-base-content/70">
            DayStep에 대해 궁금한 점이 있으신가요?
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-base-100 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-base-200 transition-colors"
              >
                <span className="font-semibold text-base-content pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-base-content/70 flex-shrink-0 transition-transform duration-200',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>

              <div
                className={cn(
                  'grid transition-all duration-200',
                  openIndex === index
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-base-content/70 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
