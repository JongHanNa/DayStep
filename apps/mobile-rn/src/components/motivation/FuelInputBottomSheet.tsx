/**
 * FuelInputBottomSheet — 상세 작성 바텀시트
 * 제목, 내용(multiline), 감정태그, 저장
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View, Text, StyleSheet, Keyboard} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput} from '@gorhom/bottom-sheet';
import {Sparkles} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {EMOTION_CONFIG, EMOTION_TAGS} from '@/lib/motivationUtils';
import type {EmotionTag} from '@/stores/noteStore';

export interface FuelInputBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface FuelInputBottomSheetProps {
  onSubmit: (input: {content: string; title?: string; emotion_tag?: EmotionTag}) => void;
}

export const FuelInputBottomSheet = forwardRef<FuelInputBottomSheetRef, FuelInputBottomSheetProps>(
  ({onSubmit}, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['65%'], []);
    const {primaryColor} = useTheme();
    const haptic = useHaptic();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [emotionTag, setEmotionTag] = useState<EmotionTag | undefined>(undefined);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => {
        Keyboard.dismiss();
        sheetRef.current?.close();
      },
    }));

    const handleSave = useCallback(() => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;
      haptic.medium();
      onSubmit({
        content: trimmedContent,
        title: title.trim() || undefined,
        emotion_tag: emotionTag,
      });
      // 초기화
      setTitle('');
      setContent('');
      setEmotionTag(undefined);
      sheetRef.current?.close();
    }, [content, title, emotionTag, onSubmit, haptic]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0} />
      ),
      [],
    );

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={{backgroundColor: '#D1D5DB'}}>
        <BottomSheetView style={styles.container}>
          <View style={styles.sheetTitleRow}>
            <Sparkles size={18} color="#1F2937" />
            <Text style={styles.sheetTitle}>원동력 새기기</Text>
          </View>

          {/* 감정 태그 */}
          <View style={styles.emotionRow}>
            {EMOTION_TAGS.map(tag => {
              const config = EMOTION_CONFIG[tag];
              const isSelected = emotionTag === tag;
              return (
                <AnimatedPressable
                  key={tag}
                  onPress={() => {
                    haptic.selection();
                    setEmotionTag(isSelected ? undefined : tag);
                  }}
                  scaleValue={0.9}
                  haptic={false}
                  style={[
                    styles.emotionChip,
                    isSelected && {backgroundColor: config.bgColor, borderColor: config.borderColor},
                  ]}>
                  <config.icon size={16} color={isSelected ? config.color : '#6B7280'} strokeWidth={2} />
                  <Text
                    style={[
                      styles.emotionLabel,
                      {color: isSelected ? config.color : '#6B7280'},
                    ]}>
                    {config.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* 제목 (선택) */}
          <BottomSheetTextInput
            style={styles.titleInput}
            placeholder="제목 (선택)"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          {/* 내용 */}
          <BottomSheetTextInput
            style={styles.contentInput}
            placeholder="무엇이 나를 움직이게 하나요?"
            placeholderTextColor="#9CA3AF"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />

          {/* 저장 버튼 */}
          <AnimatedPressable
            onPress={handleSave}
            haptic={false}
            scaleValue={0.95}
            style={[
              styles.saveBtn,
              {backgroundColor: content.trim() ? primaryColor : '#E5E7EB'},
            ]}>
            <Text
              style={[
                styles.saveBtnText,
                {color: content.trim() ? '#FFFFFF' : '#9CA3AF'},
              ]}>
              저장하기
            </Text>
          </AnimatedPressable>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emotionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    gap: 4,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    marginBottom: 12,
  },
  contentInput: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    paddingVertical: 0,
    minHeight: 120,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
