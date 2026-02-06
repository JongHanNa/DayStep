'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * 스크롤 기반 배경색 전환 컴포넌트
 * Structured.app 스타일의 부드러운 색상 전환 효과
 *
 * 색상 구성:
 * - 섹션 1: 소프트 블루 (#93C5FD) - 밝고 친근함
 * - 섹션 2: 틸/청록 (#14B8A6) - 활기차고 상쾌함
 * - 섹션 3: 딥 블루 (#3B82F6) - 신뢰감 있는 깊은 파랑
 * - 섹션 4: 라이트 슬레이트 (#94A3B8) - 밝고 부드러운 블루 그레이
 */
export default function ScrollColorTransition() {
  const [isMounted, setIsMounted] = useState(false);

  // 컴포넌트 마운트 확인 (hydration 이슈 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 페이지 전체 스크롤 진행률 추적
  const { scrollYProgress } = useScroll();

  // 부드러운 스프링 애니메이션 적용
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // 4개 색상의 RGB 값 정의
  const colors = [
    { r: 147, g: 197, b: 253 }, // #93C5FD - 소프트 블루
    { r: 20, g: 184, b: 166 },  // #14B8A6 - 틸/청록
    { r: 59, g: 130, b: 246 },  // #3B82F6 - 딥 블루
    { r: 148, g: 163, b: 184 }  // #94A3B8 - 라이트 슬레이트
  ];

  // 스크롤 진행률에 따라 RGB 각 채널 보간
  const r = useTransform(
    smoothProgress,
    [0, 0.33, 0.66, 1],
    [colors[0].r, colors[1].r, colors[2].r, colors[3].r]
  );

  const g = useTransform(
    smoothProgress,
    [0, 0.33, 0.66, 1],
    [colors[0].g, colors[1].g, colors[2].g, colors[3].g]
  );

  const b = useTransform(
    smoothProgress,
    [0, 0.33, 0.66, 1],
    [colors[0].b, colors[1].b, colors[2].b, colors[3].b]
  );

  // RGB 값을 결합하여 최종 배경색 생성
  const backgroundColor = useTransform(
    [r, g, b],
    ([rValue, gValue, bValue]: number[]) => {
      return `rgb(${Math.round(rValue)}, ${Math.round(gValue)}, ${Math.round(bValue)})`;
    }
  );

  // prefers-reduced-motion 감지
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 마운트 전에는 렌더링하지 않음 (hydration 이슈 방지)
  if (!isMounted) {
    return null;
  }

  // reduced motion이 활성화된 경우 정적 배경색
  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b})` }}
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 -z-10"
      style={{
        backgroundColor,
        willChange: 'background-color'
      }}
    />
  );
}
