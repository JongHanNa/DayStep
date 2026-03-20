/**
 * FocusCard — 현재 포커스 태스크 카드 (시작 전 상태만 표시)
 * 타이머/서브태스크는 전체화면 CleaningSessionScreen에서 처리
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Play, Check, Zap} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {shadows} from '@/theme/tokens';
import {FREQUENCY_LABELS} from '@/constants/cleaning-data';
import type {CleaningTask} from '@/constants/cleaning-data';

interface FocusCardProps {
  task: CleaningTask;
  onStart: () => void;
  onComplete: () => void;
}

export function FocusCard({
  task,
  onStart,
  onComplete,
}: FocusCardProps) {
  const {primaryColor} = useTheme();

  const subtasks = task.subtasks;
  const hasSubtasks = subtasks && subtasks.length > 0;

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
      <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: hasSubtasks ? 6 : 16}}>
        {task.title}
      </Text>

      {/* "먼저" 힌트 (서브태스크 있을 때) */}
      {hasSubtasks && (
        <Text style={{fontSize: 12, color: '#9CA3AF', marginBottom: 16}}>
          먼저: {subtasks[0]}
        </Text>
      )}

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

      {/* 버튼 영역: 시작 + 완료 */}
      <View style={{flexDirection: 'row', gap: 12}}>
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
      </View>
    </Animated.View>
  );
}
