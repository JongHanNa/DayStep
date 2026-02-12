/**
 * Reluctant Tasks Panel
 * 하기 싫어도 해야 할 일 — is_reluctant_must_do 필터
 * 빈 상태 플레이스홀더 + "+" 추가 + 롱프레스 해제
 */
import React, {useMemo, useCallback} from 'react';
import {View, Text, Alert} from 'react-native';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {Shield, CheckCircle2, Plus} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {DroppableZone} from './DroppableZone';

interface ReluctantTasksPanelProps {
  onAddPress?: () => void;
}

export function ReluctantTasksPanel({onAddPress}: ReluctantTasksPanelProps) {
  const {todos, toggleTodoCompletion, updateTodo} = useTodoStore();
  const {primaryColor} = useTheme();

  const reluctantTodos = useMemo(() => {
    return todos.filter((t: any) => t.is_reluctant_must_do === true);
  }, [todos]);

  const handleRemove = useCallback(
    (id: string, title: string) => {
      Alert.alert(
        '해제',
        `"${title}"을(를) 하기 싫어도 해야 할 일에서 해제할까요?`,
        [
          {text: '취소', style: 'cancel'},
          {
            text: '해제',
            style: 'destructive',
            onPress: () => updateTodo(id, {is_reluctant_must_do: false} as any),
          },
        ],
      );
    },
    [updateTodo],
  );

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Shield size={18} color="#DC2626" />
          <Text className="text-base font-semibold text-gray-800 ml-2">
            하기 싫어도 해야 할 일
          </Text>
        </View>
        {onAddPress && (
          <AnimatedPressable
            onPress={onAddPress}
            hapticType="light"
            scaleValue={0.9}
            className="p-1">
            <Plus size={20} color={primaryColor} />
          </AnimatedPressable>
        )}
      </View>
      <DroppableZone
        id="reluctant"
        type="reluctant"
        highlightColor="rgba(239, 68, 68, 0.08)"
        style={{borderRadius: 16}}>
        <View className="bg-red-50 rounded-2xl p-4">
          {reluctantTodos.length === 0 ? (
            <View className="items-center py-3">
              <Text className="text-sm text-gray-400">
                할일을 여기에 추가해보세요
              </Text>
            </View>
          ) : (
            reluctantTodos.map(todo => (
              <AnimatedPressable
                key={todo.id}
                onPress={() => toggleTodoCompletion(todo.id)}
                onLongPress={() => handleRemove(todo.id, todo.title)}
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
            ))
          )}
          <Text className="text-xs text-red-400 mt-2">
            작은 용기가 큰 성장을 만들어요
          </Text>
        </View>
      </DroppableZone>
    </View>
  );
}
