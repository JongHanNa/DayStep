/**
 * Reflection Panels
 * 현재 기간 + 오늘의 다짐/결단 + 오늘의 기도(admin) + 오늘의 점검/회고/교훈
 */
import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView} from 'react-native';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import {useReflectionField} from '@/hooks/useReflectionField';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {supabase} from '@/lib/supabase';

interface ReflectionPanelsProps {
  scrollViewRef?: React.RefObject<ScrollView>;
}

export function ReflectionPanels({scrollViewRef}: ReflectionPanelsProps) {
  const user = useAuthStore(s => s.user);
  const {selectedDate} = useTodoStore();
  const {primaryColor} = useTheme();

  const period = useReflectionField('current_period');
  const resolution = useReflectionField('today_resolution');
  const prayer = useReflectionField('today_prayer');
  const lesson = useReflectionField('today_lesson');

  const [isAdmin, setIsAdmin] = useState(false);

  // admin 확인
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({data}) => setIsAdmin(data?.role === 'admin'));
  }, [user?.id]);

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd({animated: true});
    }, 300);
  }, [scrollViewRef]);

  return (
    <View key={selectedDate}>
      {/* 현재 무슨 기간인지 상기해보기 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-base font-semibold text-gray-800">
            현재 무슨 기간인지 상기해보기
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.07)}} className="rounded-2xl p-4">
          <TextInput
            value={period.value}
            onChangeText={period.setValue}
            onFocus={handleInputFocus}
            onBlur={period.save}
            placeholder="지금은 어떤 기간인가요? (예: 시험기간, 프로젝트 마감 등)"
            placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
            className="text-sm text-gray-800"
            style={styles.input}
            multiline
            scrollEnabled={false}
          />
        </View>
      </View>

      {/* 오늘의 다짐/결단 (편집가능) */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-base font-semibold text-gray-800">
            오늘의 다짐/결단
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.08)}} className="rounded-2xl p-4">
          <TextInput
            value={resolution.value}
            onChangeText={resolution.setValue}
            onFocus={handleInputFocus}
            onBlur={resolution.save}
            placeholder="오늘의 다짐과 결단을 적어보세요"
            placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
            className="text-sm text-gray-800"
            style={styles.input}
            multiline
            scrollEnabled={false}
          />
        </View>
      </View>

      {/* 오늘의 기도 (admin only) */}
      {isAdmin && (
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-base font-semibold text-gray-800">
              오늘의 기도(하나님과 대화)
            </Text>
          </View>
          <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.09)}} className="rounded-2xl p-4">
            <TextInput
              value={prayer.value}
              onChangeText={prayer.setValue}
              onFocus={handleInputFocus}
              onBlur={prayer.save}
              placeholder="하나님과의 대화를 적어보세요"
              placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
              className="text-sm text-gray-800"
              style={styles.input}
              multiline
              scrollEnabled={false}
            />
          </View>
        </View>
      )}

      {/* 오늘의 점검/회고/교훈 (편집가능) */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-base font-semibold text-gray-800">
            오늘의 점검/회고/교훈
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.06)}} className="rounded-2xl p-4">
          <TextInput
            value={lesson.value}
            onChangeText={lesson.setValue}
            onFocus={handleInputFocus}
            onBlur={lesson.save}
            placeholder="오늘 하루에서 배운 교훈을 적어보세요"
            placeholderTextColor={hexWithOpacity(primaryColor, 0.35)}
            className="text-sm text-gray-800"
            style={styles.input}
            multiline
            scrollEnabled={false}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 40,
    textAlignVertical: 'top',
  },
});
