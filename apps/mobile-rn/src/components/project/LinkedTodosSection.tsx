/**
 * LinkedTodosSection — 연결된 할일 Reanimated 아코디언
 * onLayout 기반 높이 측정 + withSpring 확장/축소
 */
import React, {useState, useCallback} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {ListTodo, ChevronDown, CheckCircle2, Link2Off} from 'lucide-react-native';
import {springs} from '@/theme/animations';
import {formatTodoDate} from './constants';
import type {Todo} from '@daystep/shared-core';

interface LinkedTodosSectionProps {
  todos: Todo[];
  loading: boolean;
  onUnlink: (todoId: string) => void;
}

export function LinkedTodosSection({
  todos,
  loading,
  onUnlink,
}: LinkedTodosSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const contentHeight = useSharedValue(0);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: contentHeight.value,
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${contentHeight.value > 0 ? 180 : 0}deg`}],
  }));

  const toggleExpand = useCallback(() => {
    setExpanded(prev => {
      const next = !prev;
      contentHeight.value = withSpring(
        next ? measuredHeight : 0,
        springs.nativeGlass,
      );
      return next;
    });
  }, [measuredHeight]);

  const handleLayout = useCallback(
    (e: {nativeEvent: {layout: {height: number}}}) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== measuredHeight) {
        setMeasuredHeight(h);
        if (expanded) {
          contentHeight.value = h;
        }
      }
    },
    [expanded, measuredHeight],
  );

  return (
    <View className="border-t border-gray-200 pt-4 mb-4">
      <TouchableOpacity
        onPress={toggleExpand}
        className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <ListTodo size={18} color="#6B7280" />
          <Text className="font-medium text-gray-700 ml-2">연결된 할일</Text>
          <View className="bg-gray-100 rounded-full px-2 py-0.5 ml-2">
            <Text className="text-xs text-gray-500">{todos.length}개</Text>
          </View>
        </View>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={18} color="#9CA3AF" />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={animatedContainerStyle}>
        <View onLayout={handleLayout} style={{position: 'absolute', width: '100%'}}>
          <View className="mt-3">
            {loading ? (
              <Text className="text-sm text-gray-400 text-center py-4">
                로딩 중...
              </Text>
            ) : todos.length === 0 ? (
              <Text className="text-sm text-gray-400 text-center py-2">
                연결된 할일이 없습니다
              </Text>
            ) : (
              todos.map(todo => (
                <View
                  key={todo.id}
                  className="flex-row items-center justify-between bg-gray-50 rounded-lg p-3 mb-2">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      className="w-4 h-4 rounded-full border-2 mr-2 items-center justify-center"
                      style={{
                        backgroundColor: todo.completed
                          ? '#22C55E'
                          : 'transparent',
                        borderColor: todo.completed ? '#22C55E' : '#D1D5DB',
                      }}>
                      {todo.completed && (
                        <CheckCircle2 size={10} color="#FFFFFF" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm ${
                          todo.completed
                            ? 'line-through text-gray-400'
                            : 'text-gray-700'
                        }`}
                        numberOfLines={1}>
                        {todo.title}
                      </Text>
                      {formatTodoDate(todo) ? (
                        <Text className="text-xs text-gray-400 mt-0.5">
                          {formatTodoDate(todo)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => onUnlink(todo.id)}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Link2Off size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
