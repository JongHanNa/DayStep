'use client';

import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface CircularProgressSliderProps {
  size: number;
  progress: number; // 0-1
  onDragProgress: (progress: number) => void;
  onDragEnd: (finalProgress: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

/**
 * 커스텀 원형 프로그레스 슬라이더
 *
 * 드래그로 진행률을 조정할 수 있는 원형 슬라이더입니다.
 * 95% 이상 드래그하면 완료로 처리됩니다.
 */
export function CircularProgressSlider({
  size,
  progress,
  onDragProgress,
  onDragEnd,
  isDragging,
  setIsDragging,
}: CircularProgressSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // SVG 설정 (280px 기준 1.4배 확대)
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2 - 4;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // 애니메이션 값 - 각도 (0-360)
  const baseAngle = progress * 360;
  const angle = useMotionValue(baseAngle);
  const springAngle = useSpring(angle, {
    stiffness: 200,
    damping: 25,
    mass: 0.5
  });

  // 드래그 상태 동기적 관리
  const isDraggingRef = useRef(false);

  // 마지막 유효한 각도 저장
  const lastValidAngle = useRef(baseAngle);

  // 타이머 진행에 따라 각도 업데이트 (드래그 중이 아닐 때만)
  useEffect(() => {
    if (!isDraggingRef.current) {
      angle.set(progress * 360);
    }
  }, [progress, angle]);

  // strokeDashoffset 계산
  const strokeDashoffset = useTransform(
    springAngle,
    [0, 360],
    [circumference, 0]
  );

  // 노브 위치 계산 (12시 방향에서 시작, 시계방향)
  const knobWidth = 56;
  const knobHeight = 28;
  const knobX = useTransform(springAngle, (a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return center + radius * Math.cos(rad) - knobWidth / 2;
  });
  const knobY = useTransform(springAngle, (a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return center + radius * Math.sin(rad) - knobHeight / 2;
  });
  const knobRotation = useTransform(springAngle, (a) => a);

  // 포인터 위치에서 각도 계산
  const getAngleFromPoint = (clientX: number, clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg;
  };

  // 포인터 이동 핸들러
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) {
      return;
    }

    const newAngle = getAngleFromPoint(e.clientX, e.clientY);
    const currentAngle = lastValidAngle.current;

    // 360° 래핑 감지: 95% 이상(342°)에서 0° 근처(30° 미만)로 이동하면 완료
    if (currentAngle > 342 && newAngle < 30) {
      isDraggingRef.current = false;
      setIsDragging(false);
      onDragEnd(1.0);
      return;
    }

    // 역방향 래핑 감지
    if (currentAngle < 30 && newAngle > 330) {
      return;
    }

    // 반시계방향 드래그 차단
    const angleDiff = newAngle - currentAngle;
    const normalizedDiff = angleDiff > 180 ? angleDiff - 360 :
      angleDiff < -180 ? angleDiff + 360 : angleDiff;

    if (normalizedDiff < -30) {
      return;
    }

    // 유효한 이동만 허용
    if (normalizedDiff >= 0 || Math.abs(normalizedDiff) < 30) {
      lastValidAngle.current = newAngle;
      angle.set(newAngle);
      onDragProgress(newAngle / 360);
    }
  };

  // 포인터 다운 핸들러
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    lastValidAngle.current = angle.get();
  };

  // 포인터 업 핸들러
  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);

    const finalAngle = angle.get();
    const finalProgress = finalAngle / 360;

    isDraggingRef.current = false;
    setIsDragging(false);
    onDragEnd(finalProgress);

    // 95% 미만이면 원래 위치로 스프링 애니메이션
    if (finalProgress < 0.95) {
      angle.set(progress * 360);
      lastValidAngle.current = progress * 360;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 배경 트랙 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e0e7ff"
          strokeWidth={strokeWidth}
        />

        {/* 프로그레스 아크 */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>

      {/* 노브 - 화살표 */}
      <motion.div
        className="absolute rounded-full bg-transparent pointer-events-none flex items-center justify-center"
        style={{
          width: knobWidth,
          height: knobHeight,
          left: 0,
          top: 0,
          x: knobX,
          y: knobY,
          rotate: knobRotation,
        }}
      >
        <ArrowRight className="w-6 h-6 text-violet-600" />
      </motion.div>

      {/* 투명 드래그 핸들 */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-full"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

export default CircularProgressSlider;
