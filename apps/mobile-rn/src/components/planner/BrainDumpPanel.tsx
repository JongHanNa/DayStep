/**
 * Brain Dump Panel
 * 머릿속 생각을 자유롭게 쏟아내는 공간
 * daily_reflections.thought_archive 필드 사용
 */
import React, {useCallback} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView} from 'react-native';
import {useTodoStore} from '@/stores/todoStore';
import {useReflectionField} from '@/hooks/useReflectionField';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

interface BrainDumpPanelProps {
  scrollViewRef?: React.RefObject<ScrollView>;
}

export function BrainDumpPanel({scrollViewRef}: BrainDumpPanelProps) {
  const {selectedDate} = useTodoStore();
  const {value, setValue, save} = useReflectionField('thought_archive');
  const {primaryColor} = useTheme();

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
          key={selectedDate}
          value={value}
          onChangeText={setValue}
          onFocus={handleFocus}
          onBlur={save}
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
