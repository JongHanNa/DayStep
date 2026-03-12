/**
 * Reflection Panels
 * 보상 + 칭찬(3개) + 감사(3개) 입력 패널
 */
import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView} from 'react-native';
import {useReflectionStore} from '@/stores/reflectionStore';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {Gift, Star, Heart} from 'lucide-react-native';
import {hexWithOpacity} from '@/lib/todoUtils';

interface ReflectionPanelsProps {
  scrollViewRef?: React.RefObject<ScrollView>;
}

export function ReflectionPanels({scrollViewRef}: ReflectionPanelsProps) {
  const user = useAuthStore(s => s.user);
  const {selectedDate} = useTodoStore();
  const {getReflection, loadReflection, upsertReflection} =
    useReflectionStore();
  const {primaryColor} = useTheme();

  const reflection = getReflection(selectedDate);

  const [reward, setReward] = useState('');
  const [praises, setPraises] = useState<string[]>(['', '', '']);
  const [gratitudes, setGratitudes] = useState<string[]>(['', '', '']);

  useEffect(() => {
    if (user?.id) {
      loadReflection(user.id, selectedDate);
    }
  }, [user?.id, selectedDate]);

  useEffect(() => {
    if (reflection) {
      setReward(reflection.reward ?? '');
      setPraises([
        reflection.praises?.[0] ?? '',
        reflection.praises?.[1] ?? '',
        reflection.praises?.[2] ?? '',
      ]);
      setGratitudes([
        reflection.gratitudes?.[0] ?? '',
        reflection.gratitudes?.[1] ?? '',
        reflection.gratitudes?.[2] ?? '',
      ]);
    }
  }, [reflection?.id]);

  const handleSave = useCallback(
    (field: string, value: any) => {
      if (!user?.id) return;
      upsertReflection(user.id, selectedDate, {[field]: value});
    },
    [user?.id, selectedDate, upsertReflection],
  );

  const updatePraise = (index: number, text: string) => {
    const updated = [...praises];
    updated[index] = text;
    setPraises(updated);
  };

  const updateGratitude = (index: number, text: string) => {
    const updated = [...gratitudes];
    updated[index] = text;
    setGratitudes(updated);
  };

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd({animated: true});
    }, 300);
  }, [scrollViewRef]);

  return (
    <View>
      {/* 보상 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Gift size={18} color={primaryColor} />
          <Text className="text-base font-semibold text-gray-800 ml-2">
            오늘의 보상
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.08)}} className="rounded-2xl p-4">
          <TextInput
            value={reward}
            onChangeText={setReward}
            onFocus={handleInputFocus}
            onBlur={() => handleSave('reward', reward)}
            placeholder="오늘 하루 수고한 나에게 줄 보상은?"
            placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
            className="text-sm text-gray-800"
            style={styles.input}
            multiline
          />
        </View>
      </View>

      {/* 칭찬 3가지 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Star size={18} color={primaryColor} />
          <Text className="text-base font-semibold text-gray-800 ml-2">
            오늘 칭찬 3가지
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.06)}} className="rounded-2xl p-4">
          {praises.map((praise, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <Text className="text-sm mr-2 w-5" style={{color: hexWithOpacity(primaryColor, 0.5)}}>
                {index + 1}.
              </Text>
              <TextInput
                value={praise}
                onChangeText={text => updatePraise(index, text)}
                onFocus={handleInputFocus}
                onBlur={() => handleSave('praises', praises.filter(p => p.trim()))}
                placeholder={`칭찬 ${index + 1}`}
                placeholderTextColor={hexWithOpacity(primaryColor, 0.35)}
                className="flex-1 text-sm text-gray-800"
                style={styles.lineInput}
              />
            </View>
          ))}
        </View>
      </View>

      {/* 감사 3가지 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Heart size={18} color={primaryColor} />
          <Text className="text-base font-semibold text-gray-800 ml-2">
            오늘 감사 3가지
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.05)}} className="rounded-2xl p-4">
          {gratitudes.map((gratitude, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <Text className="text-sm mr-2 w-5" style={{color: hexWithOpacity(primaryColor, 0.5)}}>
                {index + 1}.
              </Text>
              <TextInput
                value={gratitude}
                onChangeText={text => updateGratitude(index, text)}
                onFocus={handleInputFocus}
                onBlur={() =>
                  handleSave('gratitudes', gratitudes.filter(g => g.trim()))
                }
                placeholder={`감사 ${index + 1}`}
                placeholderTextColor={hexWithOpacity(primaryColor, 0.35)}
                className="flex-1 text-sm text-gray-800"
                style={styles.lineInput}
              />
            </View>
          ))}
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
  lineInput: {
    height: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 4,
  },
});
