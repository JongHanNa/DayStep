/**
 * TimerRing — Skia 원형 프로그레스 + 글로우
 * PomodoroScreen + FocusTimerBottomSheet 공유 컴포넌트
 */
import React from 'react';
import {Canvas, Path, Skia, BlurMask} from '@shopify/react-native-skia';

export interface TimerRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  isRunning: boolean;
}

export function TimerRing({progress, size, strokeWidth, color}: TimerRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth - 8;

  const bgPath = Skia.Path.Make();
  bgPath.addCircle(center, center, radius);

  const sweepAngle = 360 * Math.min(Math.max(progress, 0), 1);
  const progressPath = Skia.Path.Make();
  if (sweepAngle > 0) {
    progressPath.addArc(
      {
        x: center - radius,
        y: center - radius,
        width: radius * 2,
        height: radius * 2,
      },
      -90,
      sweepAngle,
    );
  }

  return (
    <Canvas style={{width: size, height: size}}>
      <Path
        path={bgPath}
        style="stroke"
        strokeWidth={strokeWidth}
        color="#E5E7EB"
        strokeCap="round"
      />
      {sweepAngle > 0 && (
        <>
          <Path
            path={progressPath}
            style="stroke"
            strokeWidth={strokeWidth + 6}
            color={color}
            strokeCap="round"
            opacity={0.3}>
            <BlurMask blur={8} style="normal" />
          </Path>
          <Path
            path={progressPath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={color}
            strokeCap="round"
          />
        </>
      )}
    </Canvas>
  );
}

/** MM:SS 포맷 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
