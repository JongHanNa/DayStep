/**
 * TaskQueue — 다음 태스크 큐 (dimmed), 섹션 분리
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {TAB_LABELS, TAB_COLORS, ENERGY_COLORS, FREQUENCY_LABELS, FREQUENCY_COLORS} from '@/constants/cleaning-data';
import type {CleaningTask} from '@/constants/cleaning-data';

export interface TaskQueueSection {
  title: string;
  tasks: CleaningTask[];
}

interface TaskQueueProps {
  sections: TaskQueueSection[];
  onSelectTask: (taskId: string) => void;
}

export function TaskQueue({sections, onSelectTask}: TaskQueueProps) {
  const nonEmpty = sections.filter(s => s.tasks.length > 0);
  if (nonEmpty.length === 0) return null;

  let globalIndex = 0;

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{opacity: 0.5}}>
      {nonEmpty.map(section => (
        <View key={section.title}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9CA3AF',
              marginTop: 8,
              marginBottom: 4,
              paddingHorizontal: 4,
            }}>
            {section.title}
          </Text>
          {section.tasks.map(task => {
            globalIndex++;
            const idx = globalIndex;
            return (
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
                  {idx}.
                </Text>
                <View
                  style={{
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    borderRadius: 4,
                    backgroundColor: TAB_COLORS[task.tab] + '15',
                  }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      color: TAB_COLORS[task.tab],
                    }}>
                    {TAB_LABELS[task.tab]}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    borderRadius: 4,
                    backgroundColor: FREQUENCY_COLORS[task.frequency] + '15',
                  }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      color: FREQUENCY_COLORS[task.frequency],
                    }}>
                    {FREQUENCY_LABELS[task.frequency]}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    borderRadius: 4,
                    backgroundColor: '#F3F4F6',
                  }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      color: '#6B7280',
                    }}>
                    {task.category}
                  </Text>
                </View>
                <Text style={{fontSize: 13, color: '#6B7280', flex: 1}} numberOfLines={1}>
                  {task.title}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    borderRadius: 4,
                    backgroundColor: ENERGY_COLORS[task.energyCost] + '15',
                  }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      color: ENERGY_COLORS[task.energyCost],
                    }}>
                    ⚡{task.energyCost}
                  </Text>
                </View>
                <Text style={{fontSize: 11, color: '#9CA3AF'}}>
                  {task.estimatedMinutes}분
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}
