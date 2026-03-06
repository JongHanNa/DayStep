/**
 * MotivationInlineInput — 빠른 입력: TextInput + 감정태그 + 전송
 */
import React, {useState, useCallback} from 'react';
import {View, TextInput, Text, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {EMOTION_CONFIG, EMOTION_TAGS} from '@/lib/motivationUtils';
import type {EmotionTag} from '@/stores/noteStore';
import {Send} from 'lucide-react-native';

interface MotivationInlineInputProps {
  onSubmit: (content: string, emotionTag?: EmotionTag) => void;
  onExpandPress?: () => void;
}

export function MotivationInlineInput({onSubmit, onExpandPress}: MotivationInlineInputProps) {
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const [text, setText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | undefined>(undefined);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    haptic.medium();
    onSubmit(trimmed, selectedEmotion);
    setText('');
    setSelectedEmotion(undefined);
  }, [text, selectedEmotion, onSubmit, haptic]);

  return (
    <View style={styles.container}>
      {/* 감정 태그 선택 */}
      <View style={styles.emotionRow}>
        {EMOTION_TAGS.map(tag => {
          const config = EMOTION_CONFIG[tag];
          const isSelected = selectedEmotion === tag;
          return (
            <AnimatedPressable
              key={tag}
              onPress={() => {
                haptic.selection();
                setSelectedEmotion(isSelected ? undefined : tag);
              }}
              scaleValue={0.9}
              haptic={false}
              style={[
                styles.emotionChip,
                isSelected && {backgroundColor: config.bgColor, borderColor: config.borderColor},
              ]}>
              <config.icon size={16} color={isSelected ? config.color : '#9CA3AF'} strokeWidth={2} />
              {isSelected && (
                <Text style={[styles.emotionLabel, {color: config.color}]}>{config.label}</Text>
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      {/* 입력 행 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="오늘의 원동력을 적어보세요..."
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <AnimatedPressable
          onPress={handleSubmit}
          haptic={false}
          scaleValue={0.85}
          style={[
            styles.sendBtn,
            {backgroundColor: text.trim() ? primaryColor : '#E5E7EB'},
          ]}>
          <Send size={18} color={text.trim() ? '#FFFFFF' : '#9CA3AF'} strokeWidth={2} />
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emotionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    maxHeight: 80,
    lineHeight: 20,
    paddingVertical: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
