/**
 * Progress Ring (Skia 렌더링)
 * 오늘 진행률을 시각적으로 표현 — ADHD 성취감 강화
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Canvas, Path, Skia, DashPathEffect} from '@shopify/react-native-skia';
import {useTheme} from '@/theme';

interface ProgressRingProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  completed: number;
  total: number;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  completed,
  total,
}: ProgressRingProps) {
  const {primaryColor} = useTheme();
  const center = size / 2;
  const radius = center - strokeWidth;

  // 배경 원 path
  const bgPath = Skia.Path.Make();
  bgPath.addCircle(center, center, radius);

  // 진행률 arc path
  const startAngle = -90;
  const sweepAngle = 360 * Math.min(progress, 1);
  const progressPath = Skia.Path.Make();
  progressPath.addArc(
    {
      x: strokeWidth,
      y: strokeWidth,
      width: size - strokeWidth * 2,
      height: size - strokeWidth * 2,
    },
    startAngle,
    sweepAngle,
  );

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Canvas style={{width: size, height: size}}>
        {/* 배경 링 */}
        <Path
          path={bgPath}
          style="stroke"
          strokeWidth={strokeWidth}
          color="#F1F5F9"
          strokeCap="round"
        />
        {/* 진행 링 */}
        {progress > 0 && (
          <Path
            path={progressPath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={primaryColor}
            strokeCap="round"
          />
        )}
      </Canvas>
      {/* 중앙 텍스트 */}
      <View style={styles.centerText}>
        <Text style={[styles.progressNumber, {color: primaryColor}]}>
          {completed}
        </Text>
        <Text style={styles.progressLabel}>/ {total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: -2,
  },
});
