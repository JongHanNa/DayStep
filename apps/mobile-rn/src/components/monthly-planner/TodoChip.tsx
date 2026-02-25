import React from 'react';
import {Text, View} from 'react-native';
import type {MonthTodoSummary} from '@/stores/todoStore';

interface TodoChipProps {
  todo: MonthTodoSummary;
}

export function TodoChip({todo}: TodoChipProps) {
  const color = todo.color || '#3B82F6';
  const bg = `${color}20`;

  return (
    <View
      className="rounded px-1 mb-0.5 overflow-hidden"
      style={{backgroundColor: bg}}>
      <Text
        numberOfLines={1}
        style={{fontSize: 9, color, fontWeight: '500'}}>
        {todo.title}
      </Text>
    </View>
  );
}
