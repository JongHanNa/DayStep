/**
 * TaskCheckItem — 태스크 정보 표시 (읽기 전용)
 */
import React from 'react';
import {View, Text} from 'react-native';
import {FREQUENCY_LABELS, TAB_LABELS} from '@/constants/cleaning-data';
import type {CleaningTask} from '@/constants/cleaning-data';

interface TaskCheckItemProps {
  task: CleaningTask;
}

export function TaskCheckItem({task}: TaskCheckItemProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
      }}>
      {/* 태스크명 */}
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          color: '#374151',
        }}>
        {task.title}
      </Text>

      {/* 에너지 코스트 */}
      <Text style={{fontSize: 11, color: '#9CA3AF'}}>⚡{task.energyCost}</Text>

      {/* 예상시간 */}
      <Text style={{fontSize: 11, color: '#9CA3AF'}}>
        {task.estimatedMinutes}분
      </Text>

      {/* 탭 */}
      <Text style={{fontSize: 11, color: '#9CA3AF'}}>{TAB_LABELS[task.tab]}</Text>

      {/* 주기 */}
      <Text style={{fontSize: 11, color: '#9CA3AF'}}>{FREQUENCY_LABELS[task.frequency]}</Text>
    </View>
  );
}
