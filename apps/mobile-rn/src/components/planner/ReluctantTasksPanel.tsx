/**
 * Reluctant Tasks Panel
 * 하기 싫어도 해야 할 일 — is_reluctant_must_do 필터
 */
import React, {useMemo} from 'react';
import {View, Text} from 'react-native';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {Shield, CheckCircle2} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';

export function ReluctantTasksPanel() {
  const {todos, toggleTodoCompletion} = useTodoStore();
  const {primaryColor} = useTheme();

  const reluctantTodos = useMemo(() => {
    return todos.filter((t: any) => t.is_reluctant_must_do === true);
  }, [todos]);

  if (reluctantTodos.length === 0) return null;

  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-3">
        <Shield size={18} color="#DC2626" />
        <Text className="text-base font-semibold text-gray-800 ml-2">
          하기 싫어도 해야 할 일
        </Text>
      </View>
      <View className="bg-red-50 rounded-2xl p-4">
        {reluctantTodos.map(todo => (
          <AnimatedPressable
            key={todo.id}
            onPress={() => toggleTodoCompletion(todo.id)}
            hapticType="light"
            className="flex-row items-center py-2">
            <CheckCircle2
              size={20}
              color={todo.completed ? '#22C55E' : '#D1D5DB'}
              fill={todo.completed ? '#22C55E' : 'transparent'}
            />
            <Text
              className={`flex-1 text-sm ml-3 ${
                todo.completed
                  ? 'text-gray-400 line-through'
                  : 'text-gray-700'
              }`}>
              {todo.title}
            </Text>
          </AnimatedPressable>
        ))}
        <Text className="text-xs text-red-400 mt-2">
          작은 용기가 큰 성장을 만들어요
        </Text>
      </View>
    </View>
  );
}
