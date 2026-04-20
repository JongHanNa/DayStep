/**
 * MotivationInputBottomSheet — 원동력 새기기 (신규 작성)
 * iOS 네이티브: SwiftUI NavigationStack + Form + TextEditor (저널 스타일)
 * 폴백(JS): @gorhom/bottom-sheet + BottomSheetTextInput
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View, Text, StyleSheet, Keyboard, Modal} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput} from '@gorhom/bottom-sheet';
import {Sparkles} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {NativeMotivationJournalNative} from '@/components/native';
import type {EmotionTag} from '@/stores/motivationStore';

export interface MotivationInputBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface MotivationInputBottomSheetProps {
  onSubmit: (input: {content: string; title?: string; emotion_tag?: EmotionTag}) => void;
}

export const MotivationInputBottomSheet = forwardRef<
  MotivationInputBottomSheetRef,
  MotivationInputBottomSheetProps
>(({onSubmit}, ref) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%'], []);
  const {primaryColor} = useTheme();
  const haptic = useHaptic();

  // Native path uses Modal visibility state
  const [visible, setVisible] = useState(false);

  // Fallback (JS) path state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const hasNative = NativeMotivationJournalNative != null;

  const reset = useCallback(() => {
    setTitle('');
    setContent('');
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      if (hasNative) {
        setVisible(true);
      } else {
        sheetRef.current?.expand();
      }
    },
    close: () => {
      Keyboard.dismiss();
      if (hasNative) {
        setVisible(false);
      } else {
        sheetRef.current?.close();
      }
    },
  }));

  // ── Native path handlers ─────────────────────────
  const handleNativeSave = useCallback(
    (e: {nativeEvent: {title: string; content: string; isPinned: boolean}}) => {
      const trimmedContent = e.nativeEvent.content.trim();
      if (!trimmedContent) return;
      haptic.medium();
      onSubmit({
        content: trimmedContent,
        title: e.nativeEvent.title.trim() || undefined,
      });
      setVisible(false);
    },
    [onSubmit, haptic],
  );

  const handleNativeClose = useCallback(() => {
    Keyboard.dismiss();
    setVisible(false);
  }, []);

  const noteDataJSON = useMemo(
    () =>
      JSON.stringify({
        title: '',
        content: '',
        is_banner_pinned: false,
      }),
    [],
  );
  const noop = useCallback(() => {}, []);

  // ── JS Fallback handlers ─────────────────────────
  const handleSaveFallback = useCallback(() => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    haptic.medium();
    onSubmit({
      content: trimmedContent,
      title: title.trim() || undefined,
    });
    reset();
    sheetRef.current?.close();
  }, [content, title, onSubmit, haptic, reset]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0} />
    ),
    [],
  );

  // ── Native render (iOS with module registered) ──
  if (hasNative && NativeMotivationJournalNative) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleNativeClose}>
        <NativeMotivationJournalNative
          mode="create"
          primaryColor={primaryColor}
          prompt="🌱 오늘 당신을 움직인 것은 무엇인가요?"
          noteData={noteDataJSON}
          linkedTodosData="[]"
          onSave={handleNativeSave}
          onPinToggle={noop}
          onDelete={noop}
          onUnlinkTodo={noop}
          onLinkTodoRequest={noop}
          onClose={handleNativeClose}
          style={styles.flex1}
        />
      </Modal>
    );
  }

  // ── JS Fallback (Android / 네이티브 미등록 iOS) ──
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

        <BottomSheetTextInput
          style={styles.titleInput}
          placeholder="제목 (선택)"
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <BottomSheetTextInput
          style={styles.contentInput}
          placeholder="무엇이 나를 움직이게 하나요?"
          placeholderTextColor="#9CA3AF"
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          scrollEnabled
        />

        <AnimatedPressable
          onPress={handleSaveFallback}
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
});

const styles = StyleSheet.create({
  flex1: {flex: 1},
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
    maxHeight: 200,
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
