/**
 * AddPersonBottomSheet — Alert.prompt 대체
 * 새 사람 추가를 위한 네이티브 바텀시트
 */
import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useLimitCheck} from '@/hooks/useLimitCheck';
import {LimitReachedModal} from '@/components/subscription/LimitReachedModal';
import type {CherishedPerson} from '@/stores/cherishedPeopleStore';

export interface AddPersonBottomSheetRef {
  open: (prefillName?: string) => void;
  close: () => void;
}

interface AddPersonBottomSheetProps {
  onPersonAdded: (person: CherishedPerson) => void;
  addPerson: (userId: string, data: {name: string}) => Promise<CherishedPerson | null>;
  userId: string | undefined;
}

export const AddPersonBottomSheet = forwardRef<
  AddPersonBottomSheetRef,
  AddPersonBottomSheetProps
>(function AddPersonBottomSheet({onPersonAdded, addPerson, userId}, ref) {
  const {primaryColor} = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const {checkLimit, isLimitReached, limitedEntity, currentCount, maxCount, closeLimitModal} = useLimitCheck();

  const snapPoints = useMemo(() => ['35%'], []);

  useImperativeHandle(ref, () => ({
    open: (prefillName?: string) => {
      setName(prefillName?.trim() ?? '');
      setSaving(false);
      bottomSheetRef.current?.present();
    },
    close: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleConfirm = useCallback(async () => {
    if (!userId || !name.trim() || saving) return;

    const allowed = await checkLimit('cherished_people');
    if (!allowed) return;

    setSaving(true);
    const person = await addPerson(userId, {name: name.trim()});
    setSaving(false);

    if (person) {
      bottomSheetRef.current?.dismiss();
      onPersonAdded(person);
    }
  }, [userId, name, saving, checkLimit, addPerson, onPersonAdded]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0}
      />
    ),
    [],
  );

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={false}
        handleIndicatorStyle={styles.handleIndicator}>
        <View style={styles.sheet}>
          <Text style={styles.title}>새 사람 추가</Text>
          <Text style={styles.subtitle}>소중한 분의 이름을 입력하세요</Text>

          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            placeholder="이름"
            placeholderTextColor="#9CA3AF"
            autoFocus
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />

          <AnimatedPressable
            onPress={handleConfirm}
            hapticType="medium"
            scaleValue={0.96}
            style={[
              styles.confirmBtn,
              {backgroundColor: name.trim() ? primaryColor : '#D1D5DB'},
            ]}>
            <Text style={styles.confirmBtnText}>
              {saving ? '추가 중...' : '추가'}
            </Text>
          </AnimatedPressable>
        </View>
      </BottomSheetModal>

      <LimitReachedModal
        visible={isLimitReached}
        onClose={closeLimitModal}
        entityType={limitedEntity}
        currentCount={currentCount}
        maxCount={maxCount}
      />
    </>
  );
});

const styles = StyleSheet.create({
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 36,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
