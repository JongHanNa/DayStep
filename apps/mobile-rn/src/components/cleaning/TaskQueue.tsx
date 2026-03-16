/**
 * TaskQueue — 다음 태스크 큐 (dimmed)
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import type {CleaningTask} from '@/constants/cleaning-data';

interface TaskQueueProps {
  tasks: CleaningTask[];
  onSelectTask: (taskId: string) => void;
}

export function TaskQueue({tasks, onSelectTask}: TaskQueueProps) {
  if (tasks.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{opacity: 0.5}}>
      {tasks.map((task, index) => (
        <AnimatedPressable
          key={task.id}
          hapticType="selection"
          onPress={() => onSelectTask(task.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 4,
            gap: 8,
          }}>
          <Text style={{fontSize: 12, color: '#9CA3AF', width: 20, textAlign: 'right'}}>
            {index + 1}.
          </Text>
          <Text style={{fontSize: 13, color: '#6B7280', flex: 1}} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={{fontSize: 11, color: '#9CA3AF'}}>
            {task.estimatedMinutes}분
          </Text>
        </AnimatedPressable>
      ))}
    </Animated.View>
  );
}
