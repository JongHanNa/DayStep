/**
 * IconPickerSheet
 * 아이콘 선택 서브시트 — 카테고리 + 그리드
 */
import React, {useCallback, useMemo, useState, forwardRef, useImperativeHandle, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import BottomSheet, {BottomSheetBackdrop} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {Sparkles} from 'lucide-react-native';
import {ICON_CATEGORIES} from '@/lib/iconMap';

export interface IconPickerSheetRef {
  open: () => void;
  close: () => void;
}

interface IconPickerSheetProps {
  selectedIcon: string;
  onIconChange: (icon: string) => void;
}

export const IconPickerSheet = forwardRef<IconPickerSheetRef, IconPickerSheetProps>(
  function IconPickerSheet({selectedIcon, onIconChange}, ref) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const {primaryColor} = useTheme();
    const haptic = useHaptic();
    const snapPoints = useMemo(() => ['55%'], []);
    const [categoryIndex, setCategoryIndex] = useState(0);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.snapToIndex(0),
      close: () => bottomSheetRef.current?.close(),
    }));

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
        />
      ),
      [],
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Sparkles size={18} color={primaryColor} />
            <Text style={styles.headerTitle}>아이콘 선택</Text>
          </View>

          {/* 카테고리 가로 스크롤 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}>
            {ICON_CATEGORIES.map((cat, idx) => (
              <AnimatedPressable
                key={cat.label}
                onPress={() => {
                  haptic.selection();
                  setCategoryIndex(idx);
                }}
                haptic={false}
                style={[
                  styles.categoryChip,
                  categoryIndex === idx && {backgroundColor: primaryColor},
                ]}>
                <Text
                  style={[
                    styles.categoryText,
                    categoryIndex === idx && {color: '#FFFFFF'},
                  ]}>
                  {cat.label}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>

          {/* 아이콘 그리드 */}
          <View style={styles.grid}>
            {ICON_CATEGORIES[categoryIndex]?.icons.map(({key, Icon}) => (
              <AnimatedPressable
                key={key}
                onPress={() => {
                  haptic.selection();
                  onIconChange(key === selectedIcon ? '' : key);
                }}
                haptic={false}
                style={[
                  styles.iconOption,
                  key === selectedIcon && {
                    backgroundColor: primaryColor + '20',
                    borderColor: primaryColor,
                  },
                ]}>
                <Icon
                  size={22}
                  color={key === selectedIcon ? primaryColor : '#6B7280'}
                />
              </AnimatedPressable>
            ))}
          </View>
        </View>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {backgroundColor: '#D1D5DB', width: 36},
  container: {paddingHorizontal: 20, paddingBottom: 20, flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {fontSize: 17, fontWeight: '600', color: '#1F2937'},
  categoryScroll: {marginBottom: 12},
  categoryContent: {gap: 6, paddingRight: 8},
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  categoryText: {fontSize: 12, fontWeight: '600', color: '#6B7280'},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
