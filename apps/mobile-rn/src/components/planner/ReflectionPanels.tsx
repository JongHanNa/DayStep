/**
 * Reflection Panels
 * 보상 + 칭찬(3개) + 감사(3개) 입력 패널
 */
import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';
import {useReflectionStore} from '@/stores/reflectionStore';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {Gift, Star, Heart} from 'lucide-react-native';

export function ReflectionPanels() {
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

  return (
    <View>
      {/* 보상 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Gift size={18} color="#F59E0B" />
          <Text className="text-base font-semibold text-gray-800 ml-2">
            오늘의 보상
          </Text>
        </View>
        <View className="bg-amber-50 rounded-2xl p-4">
          <TextInput
            value={reward}
            onChangeText={setReward}
            onBlur={() => handleSave('reward', reward)}
            placeholder="오늘 하루 수고한 나에게 줄 보상은?"
            placeholderTextColor="#D1A054"
            className="text-sm text-amber-900"
            style={styles.input}
            multiline
          />
        </View>
      </View>

      {/* 칭찬 3가지 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Star size={18} color="#8B5CF6" />
          <Text className="text-base font-semibold text-gray-800 ml-2">
            오늘 칭찬 3가지
          </Text>
        </View>
        <View className="bg-violet-50 rounded-2xl p-4">
          {praises.map((praise, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <Text className="text-sm text-violet-400 mr-2 w-5">
                {index + 1}.
              </Text>
              <TextInput
                value={praise}
                onChangeText={text => updatePraise(index, text)}
                onBlur={() => handleSave('praises', praises.filter(p => p.trim()))}
                placeholder={`칭찬 ${index + 1}`}
                placeholderTextColor="#A78BFA"
                className="flex-1 text-sm text-violet-900"
                style={styles.lineInput}
              />
            </View>
          ))}
        </View>
      </View>

      {/* 감사 3가지 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Heart size={18} color="#EC4899" />
          <Text className="text-base font-semibold text-gray-800 ml-2">
            오늘 감사 3가지
          </Text>
        </View>
        <View className="bg-pink-50 rounded-2xl p-4">
          {gratitudes.map((gratitude, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <Text className="text-sm text-pink-400 mr-2 w-5">
                {index + 1}.
              </Text>
              <TextInput
                value={gratitude}
                onChangeText={text => updateGratitude(index, text)}
                onBlur={() =>
                  handleSave('gratitudes', gratitudes.filter(g => g.trim()))
                }
                placeholder={`감사 ${index + 1}`}
                placeholderTextColor="#F9A8D4"
                className="flex-1 text-sm text-pink-900"
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
