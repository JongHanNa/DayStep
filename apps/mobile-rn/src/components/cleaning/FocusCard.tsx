/**
 * FocusCard — 현재 포커스 태스크 + TimerRing + 서브태스크 가이드
 */
import React, {useState, useEffect} from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Play, Pause, RotateCcw, Check, Zap} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {shadows} from '@/theme/tokens';
import {FREQUENCY_LABELS} from '@/constants/cleaning-data';
import type {CleaningTask} from '@/constants/cleaning-data';

interface FocusCardProps {
  task: CleaningTask;
  timerSeconds: number;
  timerTotalSeconds: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onComplete: () => void;
}

export function FocusCard({
  task,
  timerSeconds,
  timerTotalSeconds,
  isRunning,
  onStart,
  onPause,
  onResume,
  onReset,
  onComplete,
}: FocusCardProps) {
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const hasStarted = timerTotalSeconds > 0;
  const progress = timerTotalSeconds > 0
    ? 1 - timerSeconds / timerTotalSeconds
    : 0;

  // 서브태스크 체크 상태 (세션 한정, 비영속)
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  // task 변경 시 체크 상태 리셋
  useEffect(() => {
    setCheckedSteps(new Set());
  }, [task.id]);

  const toggleStep = (index: number) => {
    haptic.light();
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const subtasks = task.subtasks;
  const hasSubtasks = subtasks && subtasks.length > 0;
  const allChecked = hasSubtasks && checkedSteps.size === subtasks.length;

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
      {/* 카테고리 + 빈도 뱃지 */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4}}>
        <Text style={{fontSize: 11, fontWeight: '600', color: '#9CA3AF'}}>
          {task.category}
        </Text>
        <Text style={{fontSize: 11, color: '#9CA3AF'}}>
          {FREQUENCY_LABELS[task.frequency]}
        </Text>
      </View>

      {/* 태스크 제목 */}
      <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: hasSubtasks && !hasStarted ? 6 : 16}}>
        {task.title}
      </Text>

      {/* "먼저" 힌트 (타이머 시작 전, 서브태스크 있을 때) */}
      {!hasStarted && hasSubtasks && (
        <Text style={{fontSize: 12, color: '#9CA3AF', marginBottom: 16}}>
          먼저: {subtasks[0]}
        </Text>
      )}

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
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
          <Zap size={11} color="#9CA3AF" />
          <Text style={{fontSize: 11, color: '#9CA3AF'}}>{task.energyCost}</Text>
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
              hapticType="light"
              onPress={onComplete}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: '#10B981',
                gap: 6,
              }}>
              <Check size={16} color="#FFFFFF" strokeWidth={3} />
              <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF'}}>완료</Text>
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
              hapticType="light"
              onPress={onComplete}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#10B981',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Check size={16} color="#FFFFFF" strokeWidth={3} />
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
          </>
        )}
      </View>

      {/* 서브태스크 체크리스트 (타이머 시작 후) */}
      {hasStarted && hasSubtasks && (
        <View style={{width: '100%', marginTop: 16}}>
          {allChecked && (
            <Animated.Text
              entering={FadeInDown.duration(300)}
              style={{fontSize: 13, fontWeight: '600', color: primaryColor, textAlign: 'center', marginBottom: 8}}>
              모든 단계 완료!
            </Animated.Text>
          )}
          {subtasks.map((step, index) => {
            const isChecked = checkedSteps.has(index);
            return (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(index * 50).duration(300)}>
                <AnimatedPressable
                  hapticType="light"
                  onPress={() => toggleStep(index)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 8,
                    gap: 10,
                  }}>
                  {/* 체크 원 */}
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 1.5,
                      borderColor: isChecked ? primaryColor : '#D1D5DB',
                      backgroundColor: isChecked ? primaryColor : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {isChecked && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  {/* 스텝 텍스트 */}
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: isChecked ? '#9CA3AF' : '#374151',
                      textDecorationLine: isChecked ? 'line-through' : 'none',
                    }}>
                    {index + 1}. {step}
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}
