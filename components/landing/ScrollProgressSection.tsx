'use client';

import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Timer, Heart, BookOpen, BarChart3, MessageCircle, LucideIcon } from 'lucide-react';
import { getBidirectionalViewportOptions } from '@/lib/animations/scrollAnimations';
import { useRef } from 'react';
import { useWindowSize } from '@/hooks/useWindowSize';

// 이미지 태그 타입 정의
interface FeatureTag {
  icon: LucideIcon;
  label: string;
  color: string;
}

// FeatureTag 컴포넌트 Props 타입
interface FeatureTagProps {
  tag: FeatureTag;
  index: number;
  scrollYProgress: MotionValue<number>;
  totalTags: number;
  windowWidth: number;
}

// 반응형 그리드 위치 계산 (각 태그의 최종 위치)
const getGridPosition = (index: number, windowWidth: number) => {
  // 화면 크기에 따른 그리드 설정
  let cols: number;
  let gapX: number;
  let gapY: number;

  if (windowWidth < 640) {
    // 모바일: 2열 그리드
    cols = 2;
    gapX = 200;
    gapY = 80;
  } else if (windowWidth < 1024) {
    // 태블릿: 3열 그리드 (축소)
    cols = 3;
    gapX = 180;
    gapY = 90;
  } else {
    // 데스크톱: 3열 그리드 (원본)
    cols = 3;
    gapX = 280;
    gapY = 100;
  }

  const row = Math.floor(index / cols);
  const col = index % cols;

  // 중앙 정렬을 위한 오프셋
  const offsetX = -((cols - 1) * gapX) / 2;
  const offsetY = windowWidth < 640 ? -gapY : -gapY / 2; // 모바일은 3행이므로 조정

  return {
    x: col * gapX + offsetX,
    y: row * gapY + offsetY,
  };
};

// 반응형 원형 경로 출발 위치 계산
const getCircularStartPosition = (index: number, total: number, windowWidth: number) => {
  const angle = (360 / total) * index;

  // 화면 크기에 따른 반경 조정
  let radius: number;
  if (windowWidth < 640) {
    radius = 150; // 모바일: 작은 반경
  } else if (windowWidth < 1024) {
    radius = 220; // 태블릿: 중간 반경
  } else {
    radius = 300; // 데스크톱: 큰 반경
  }

  return {
    x: Math.cos((angle * Math.PI) / 180) * radius,
    y: Math.sin((angle * Math.PI) / 180) * radius,
    rotate: angle,
  };
};

/**
 * 개별 Feature 태그 컴포넌트
 * React Hooks 규칙 준수를 위해 컴포넌트 최상위에서 useTransform 호출
 */
function FeatureTagItem({ tag, index, scrollYProgress, totalTags, windowWidth }: FeatureTagProps) {
  const Icon = tag.icon;
  const startPos = getCircularStartPosition(index, totalTags, windowWidth);
  const endPos = getGridPosition(index, windowWidth);

  // ✅ 컴포넌트 최상위 레벨에서 Hook 호출
  // 스크롤 진행률 0~1을 각 애니메이션 값으로 변환
  // 0.2~0.6: 원형 → 그리드 (하단 스크롤)
  // 0.6~0.2: 그리드 → 원형 (상단 스크롤, 자동 역재생)
  const x = useTransform(scrollYProgress, [0.2, 0.6], [startPos.x, endPos.x]);
  const y = useTransform(scrollYProgress, [0.2, 0.6], [startPos.y, endPos.y]);
  const opacity = useTransform(scrollYProgress, [0.15, 0.3, 0.7, 0.85], [0, 1, 1, 0]);
  const rotate = useTransform(scrollYProgress, [0.2, 0.6], [startPos.rotate, 0]);
  const scale = useTransform(scrollYProgress, [0.2, 0.6], [0.5, 1]);

  return (
    <motion.div
      className="absolute"
      style={{
        x,
        y,
        opacity,
        rotate,
        scale,
      }}
    >
      <div className={`${tag.color} text-white rounded-2xl px-4 py-2.5 sm:px-6 sm:py-4 shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-2.5 sm:gap-3 hover:scale-110 transition-transform cursor-pointer whitespace-nowrap`}>
        <Icon className="w-5.5 h-5.5 sm:w-6 sm:h-6" />
        <span className="font-semibold text-[15px] sm:text-lg">{tag.label}</span>
      </div>
    </motion.div>
  );
}

/**
 * 스크롤 진행률 기반 이미지 태그 애니메이션 섹션
 * 스크롤 위치에 따라 원형에서 그리드로, 그리드에서 원형으로 자동 변환
 */
export default function ScrollProgressSection() {
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.3);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { width: windowWidth } = useWindowSize();

  // 섹션 기준 스크롤 진행률 추적 (0~1)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"] // 섹션 시작~끝
  });

  // 이미지 태그 데이터 - ADHD 친화적 기능
  const featureTags: FeatureTag[] = [
    { icon: Timer, label: '실행과 집중', color: 'bg-primary' },
    { icon: Heart, label: '소중한 사람 챙기기', color: 'bg-accent' },
    { icon: BookOpen, label: '배움→과제→계획', color: 'bg-secondary' },
    { icon: BarChart3, label: '기록/일정/통계', color: 'bg-info' },
    { icon: MessageCircle, label: '관계 기록', color: 'bg-success' },
  ];

  return (
    <section ref={sectionRef} className="relative py-32 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* 중앙 제목 */}
        <motion.div
          className="relative z-10 text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={bidirectionalViewportOptions}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            일상의 어려움, 함께 해결해요
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            집중이 어려운 날에도 괜찮아요.<br className="hidden sm:block" />
            DayStep이 옆에서 함께할게요.
          </p>
        </motion.div>

        {/* 이미지 태그 애니메이션 - 스크롤 진행률 기반 */}
        <div className="relative min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
          {featureTags.map((tag, index) => (
            <FeatureTagItem
              key={index}
              tag={tag}
              index={index}
              scrollYProgress={scrollYProgress}
              totalTags={featureTags.length}
              windowWidth={windowWidth}
            />
          ))}

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
          <p className="text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
            <strong className="text-primary">즉시 실행</strong>으로 시작의 어려움을 덜고,{' '}
            <strong className="text-accent">관계 챙기기</strong>로 소중한 사람을 놓치지 않으며,{' '}
            <strong className="text-secondary">기록과 통계</strong>로 나를 이해해가요.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {['간단하게', '바로 실행', '함께 관리'].map((keyword, index) => (
              <motion.span
                key={index}
                className="px-6 py-2 bg-white/80 backdrop-blur-sm rounded-full text-base-content font-medium border border-base-300"
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
