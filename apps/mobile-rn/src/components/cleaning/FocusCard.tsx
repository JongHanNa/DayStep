/**
 * FocusCard — 현재 포커스 태스크 + TimerRing
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Play, Pause, SkipForward, RotateCcw} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {useTheme} from '@/theme';
import {shadows} from '@/theme/tokens';
import {TAB_LABELS, TAB_COLORS, ENERGY_COLORS, FREQUENCY_LABELS, FREQUENCY_COLORS} from '@/constants/cleaning-data';
import type {CleaningTask} from '@/constants/cleaning-data';

interface FocusCardProps {
  task: CleaningTask;
  timerSeconds: number;
  timerTotalSeconds: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onReset: () => void;
}

export function FocusCard({
  task,
  timerSeconds,
  timerTotalSeconds,
  isRunning,
  onStart,
  onPause,
  onResume,
  onSkip,
  onReset,
}: FocusCardProps) {
  const {primaryColor} = useTheme();
  const hasStarted = timerTotalSeconds > 0;
  const progress = timerTotalSeconds > 0
    ? 1 - timerSeconds / timerTotalSeconds
    : 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400)}
      style={[
        shadows.md,
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
        },
      ]}>
      {/* 탭 뱃지 + 카테고리 뱃지 */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginBottom: 6}}>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: TAB_COLORS[task.tab] + '15',
          }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: TAB_COLORS[task.tab],
            }}>
            {TAB_LABELS[task.tab]}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: FREQUENCY_COLORS[task.frequency] + '15',
          }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: FREQUENCY_COLORS[task.frequency],
            }}>
            {FREQUENCY_LABELS[task.frequency]}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: '#F3F4F6',
          }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: '#6B7280',
            }}>
            {task.category}
          </Text>
        </View>
      </View>

      {/* 태스크 제목 */}
      <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16}}>
        {task.title}
      </Text>

      {/* TimerRing */}
      <View style={{alignItems: 'center', justifyContent: 'center', marginBottom: 16}}>
        <TimerRing
          progress={progress}
          size={120}
          strokeWidth={8}
          color={primaryColor}
          isRunning={isRunning}
        />
        <Text
          style={{
            position: 'absolute',
            fontSize: 24,
            fontWeight: '700',
            color: '#1F2937',
            fontVariant: ['tabular-nums'],
          }}>
          {formatTime(timerSeconds)}
        </Text>
      </View>

      {/* 예상 시간 + 에너지 코스트 */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16}}>
        <Text style={{fontSize: 12, color: '#9CA3AF'}}>
          예상 {task.estimatedMinutes}분
        </Text>
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: ENERGY_COLORS[task.energyCost] + '15',
          }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: ENERGY_COLORS[task.energyCost],
            }}>
            ⚡{task.energyCost}
          </Text>
        </View>
      </View>

      {/* 버튼 영역 */}
      <View style={{flexDirection: 'row', gap: 12}}>
        {!hasStarted ? (
          // 시작 전
          <>
            <AnimatedPressable
              hapticType="light"
              onPress={onStart}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: primaryColor,
                gap: 6,
              }}>
              <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF'}}>시작</Text>
            </AnimatedPressable>
            <AnimatedPressable
              hapticType="selection"
              onPress={onSkip}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: '#F3F4F6',
                gap: 6,
              }}>
              <SkipForward size={16} color="#6B7280" />
              <Text style={{fontSize: 14, fontWeight: '500', color: '#6B7280'}}>건너뛰기</Text>
            </AnimatedPressable>
          </>
        ) : (
          // 진행 중
          <>
            <AnimatedPressable
              hapticType="light"
              onPress={isRunning ? onPause : onResume}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: isRunning ? '#FEF3C7' : primaryColor,
                gap: 6,
              }}>
              {isRunning ? (
                <>
                  <Pause size={16} color="#D97706" />
                  <Text style={{fontSize: 14, fontWeight: '600', color: '#D97706'}}>일시정지</Text>
                </>
              ) : (
                <>
                  <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF'}}>재개</Text>
                </>
              )}
            </AnimatedPressable>
            <AnimatedPressable
              hapticType="selection"
              onPress={onReset}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <RotateCcw size={16} color="#6B7280" />
            </AnimatedPressable>
            <AnimatedPressable
              hapticType="selection"
              onPress={onSkip}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <SkipForward size={16} color="#6B7280" />
            </AnimatedPressable>
          </>
        )}
      </View>
    </Animated.View>
  );
}
