/**
 * InlineIconPicker
 * 키보드 위에 표시되는 인라인 아이콘 선택 패널
 * 카테고리 가로 스크롤 + 아이콘 그리드 (120px 높이)
 */
import React, {useState} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {ICON_CATEGORIES} from '@/lib/iconMap';

interface InlineIconPickerProps {
  selectedIcon: string;
  onIconChange: (icon: string) => void;
  /** true면 팝오버 모드 (flexWrap 그리드 + 세로 스크롤) */
  popover?: boolean;
}

export function InlineIconPicker({selectedIcon, onIconChange, popover}: InlineIconPickerProps) {
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const [categoryIndex, setCategoryIndex] = useState(0);

  const iconItems = ICON_CATEGORIES[categoryIndex]?.icons.map(({key, Icon}) => (
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
        size={20}
        color={key === selectedIcon ? primaryColor : '#6B7280'}
      />
    </AnimatedPressable>
  ));

  return (
    <View style={[styles.container, popover && styles.containerPopover]}>
      {/* 카테고리 가로 스크롤 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
      {popover ? (
        // 팝오버 모드: flexWrap 그리드 + 세로 스크롤
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.popoverGrid}
          contentContainerStyle={styles.popoverGridContent}>
          {iconItems}
        </ScrollView>
      ) : (
        // 인라인 모드: 가로 스크롤
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}>
          {iconItems}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
  },
  containerPopover: {
    borderTopWidth: 0,
  },
  categoryContent: {
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  gridContent: {
    gap: 6,
    paddingHorizontal: 16,
  },
  popoverGrid: {
    maxHeight: 200,
  },
  popoverGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
