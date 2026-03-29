/**
 * Brain Dump Panel
 * 머릿속 생각을 자유롭게 쏟아내는 공간
 * daily_reflections.thought_archive 필드 사용
 */
import React, {useEffect, useState, useCallback, useRef} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView} from 'react-native';
import {useReflectionStore} from '@/stores/reflectionStore';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

interface BrainDumpPanelProps {
  scrollViewRef?: React.RefObject<ScrollView>;
}

export function BrainDumpPanel({scrollViewRef}: BrainDumpPanelProps) {
  const user = useAuthStore(s => s.user);
  const {selectedDate} = useTodoStore();
  const {getReflection, loadReflection, upsertReflection} =
    useReflectionStore();
  const {primaryColor} = useTheme();

  const reflection = getReflection(selectedDate);
  const [text, setText] = useState('');
  const prevDateRef = useRef(selectedDate);

  useEffect(() => {
    if (user?.id) {
      loadReflection(user.id, selectedDate);
    }
  }, [user?.id, selectedDate]);

  useEffect(() => {
    // 날짜 변경 시 이전 날짜 auto-save
    if (prevDateRef.current !== selectedDate && user?.id) {
      const prevDate = prevDateRef.current;
      const prevReflection = getReflection(prevDate);
      const changed = text !== (prevReflection?.thought_archive ?? '');
      if (changed) {
        upsertReflection(user.id, prevDate, {thought_archive: text});
      }
      prevDateRef.current = selectedDate;
    }

    setText(reflection?.thought_archive ?? '');
  }, [selectedDate, reflection?.id]);

  const handleSave = useCallback(() => {
    if (!user?.id) return;
    upsertReflection(user.id, selectedDate, {thought_archive: text});
  }, [user?.id, selectedDate, text, upsertReflection]);

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd({animated: true});
    }, 300);
  }, [scrollViewRef]);

  return (
    <View key={selectedDate} className="mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-gray-800">
          브레인 덤프
        </Text>
      </View>
      <View
        style={{backgroundColor: hexWithOpacity(primaryColor, 0.08)}}
        className="rounded-2xl p-4">
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={handleFocus}
          onBlur={handleSave}
          placeholder="머릿속을 비워보세요. 떠오르는 무엇이든 적어보세요"
          placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
          className="text-sm text-gray-800"
          style={styles.input}
          multiline
          scrollEnabled={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
