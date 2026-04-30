/**
 * CreateFeedbackSheet — 버그 신고/기능 요청 작성 시트
 *
 * iOS: NativeFeedbackEditor (SwiftUI Form + Picker + TextEditor) — 한글 IME 자모 분리 해결
 * Fallback (Android · 네이티브 미등록): @gorhom/bottom-sheet BottomSheetModal
 *
 * 호출처 API (forwardRef + open/close)는 유지되어 FeedbackBoardScreen 변경 불필요.
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Alert, Modal, StyleSheet, Text, View} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
// @ts-ignore - 라이브러리 설치 후 타입 해결
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {useFeedbackStore, type FeedbackType} from '@/stores/feedbackStore';
import {NativeFeedbackEditorNative} from '@/components/native/NativeFeedbackEditor';

export interface CreateFeedbackSheetRef {
  open: () => void;
  close: () => void;
}

const TYPE_LABELS = ['버그 신고', '기능 요청'] as const;
const TYPE_VALUES: FeedbackType[] = ['bug', 'feature'];

export const CreateFeedbackSheet = forwardRef<CreateFeedbackSheetRef>(
  function CreateFeedbackSheet(_props, ref) {
    const {primaryColor} = useTheme();
    const createFeedback = useFeedbackStore(s => s.createFeedback);

    // ── 네이티브 모달 visibility ─────────────────────────
    const [nativeVisible, setNativeVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ── 폴백(BottomSheet) 상태 ─────────────────────────
    const sheetRef = useRef<BottomSheetModal>(null);
    const [typeIndex, setTypeIndex] = useState(0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const snapPoints = useMemo(() => ['90%'], []);

    const reset = useCallback(() => {
      setTypeIndex(0);
      setTitle('');
      setContent('');
      setSubmitting(false);
    }, []);

    useImperativeHandle(ref, () => ({
      open: () => {
        reset();
        if (NativeFeedbackEditorNative) {
          setNativeVisible(true);
        } else {
          sheetRef.current?.present();
        }
      },
      close: () => {
        if (NativeFeedbackEditorNative) {
          setNativeVisible(false);
        } else {
          sheetRef.current?.dismiss();
        }
      },
    }));

    // ── 공통 제출 로직 ─────────────────────────
    const submit = useCallback(
      async (type: FeedbackType, rawTitle: string, rawContent: string) => {
        const t = rawTitle.trim();
        const c = rawContent.trim();
        if (!t) {
          Alert.alert('제목을 입력해주세요');
          return false;
        }
        if (!c) {
          Alert.alert('내용을 입력해주세요');
          return false;
        }
        setSubmitting(true);
        const result = await createFeedback({type, title: t, content: c});
        setSubmitting(false);
        if (!result) {
          Alert.alert('제출 실패', '잠시 후 다시 시도해주세요.');
          return false;
        }
        return true;
      },
      [createFeedback],
    );

    // ── 네이티브 콜백 ─────────────────────────
    const handleNativeSubmit = useCallback(
      async (e: {nativeEvent: {type: FeedbackType; title: string; content: string}}) => {
        const ok = await submit(
          e.nativeEvent.type,
          e.nativeEvent.title,
          e.nativeEvent.content,
        );
        if (ok) setNativeVisible(false);
      },
      [submit],
    );

    const handleNativeClose = useCallback(() => {
      setNativeVisible(false);
    }, []);

    // ── 폴백 콜백 ─────────────────────────
    const handleFallbackSubmit = useCallback(async () => {
      const ok = await submit(TYPE_VALUES[typeIndex]!, title, content);
      if (ok) sheetRef.current?.dismiss();
    }, [submit, typeIndex, title, content]);

    // ============================================
    // iOS 네이티브 시트
    // ============================================
    if (NativeFeedbackEditorNative) {
      const editorData = JSON.stringify({type: 'bug', title: '', content: ''});
      return (
        <Modal
          visible={nativeVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleNativeClose}>
          <NativeFeedbackEditorNative
            primaryColor={primaryColor}
            editorData={editorData}
            submitting={submitting}
            onSubmit={handleNativeSubmit}
            onClose={handleNativeClose}
            style={{flex: 1}}
          />
        </Modal>
      );
    }

    // ============================================
    // 폴백: BottomSheetModal (Android · 네이티브 미등록 iOS)
    // ============================================
    const canSubmit =
      title.trim().length > 0 && content.trim().length > 0 && !submitting;

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        enableDynamicSizing={false}
        handleIndicatorStyle={styles.handleIndicator}
        backdropComponent={props => (
          <BottomSheetBackdrop
            {...props}
            opacity={0}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
          />
        )}>
        <BottomSheetView style={styles.root}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable onPress={() => sheetRef.current?.dismiss()}>
              <Text style={styles.cancelButton}>취소</Text>
            </AnimatedPressable>
            <Text style={styles.title}>새 제보</Text>
            <AnimatedPressable disabled={!canSubmit} onPress={handleFallbackSubmit}>
              <Text
                style={[
                  styles.submitButton,
                  {color: primaryColor},
                  !canSubmit && styles.submitButtonDisabled,
                ]}>
                {submitting ? '보내는 중…' : '보내기'}
              </Text>
            </AnimatedPressable>
          </View>

          {/* Segmented Control */}
          <View style={styles.segmentedWrapper}>
            <SegmentedControl
              values={[...TYPE_LABELS]}
              selectedIndex={typeIndex}
              onChange={(event: {nativeEvent: {selectedSegmentIndex: number}}) =>
                setTypeIndex(event.nativeEvent.selectedSegmentIndex)
              }
              appearance="light"
              tintColor="#FFFFFF"
              fontStyle={{fontSize: 14, fontWeight: '500'}}
              activeFontStyle={{fontSize: 14, fontWeight: '600'}}
            />
          </View>

          {/* Title input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>제목</Text>
            <BottomSheetTextInput
              value={title}
              onChangeText={setTitle}
              placeholder={
                typeIndex === 0
                  ? '어떤 버그인지 한 줄로'
                  : '어떤 기능을 원하시나요?'
              }
              placeholderTextColor="#AEAEB2"
              style={[styles.titleInput, {borderColor: hexWithOpacity(primaryColor, 0.15)}]}
              maxLength={120}
              returnKeyType="next"
            />
          </View>

          {/* Content input */}
          <View style={[styles.fieldBlock, styles.contentBlock]}>
            <Text style={styles.fieldLabel}>
              {typeIndex === 0 ? '재현 방법 & 상황' : '자세한 설명'}
            </Text>
            <BottomSheetTextInput
              value={content}
              onChangeText={setContent}
              placeholder={
                typeIndex === 0
                  ? '어떤 상황에서, 어떤 동작을 했을 때, 어떤 결과가 나왔는지 적어주세요.'
                  : '어떤 상황에서 이 기능이 필요한지, 어떻게 동작하면 좋을지 적어주세요.'
              }
              placeholderTextColor="#AEAEB2"
              multiline
              textAlignVertical="top"
              style={[
                styles.contentInput,
                {borderColor: hexWithOpacity(primaryColor, 0.15)},
              ]}
              maxLength={4000}
            />
            <Text style={styles.helpText}>
              작성자와 개발팀(관리자)만 내용을 열람할 수 있어요.
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingBottom: 40,
  },
  handleIndicator: {backgroundColor: '#C7C7CC'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60,60,67,0.08)',
  },
  cancelButton: {
    fontSize: 16,
    color: '#8E8E93',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  submitButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  segmentedWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  fieldBlock: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 17,
    color: '#0A0A0A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#F9F9FB',
  },
  contentBlock: {
    flex: 1,
  },
  contentInput: {
    flex: 1,
    fontSize: 15,
    color: '#0A0A0A',
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#F9F9FB',
    minHeight: 200,
  },
  helpText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    lineHeight: 16,
  },
});
