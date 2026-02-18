/**
 * FontSettingsView — 폰트 패밀리 선택 + 크기 조절 + 미리보기
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useSettingsStore} from '@/stores/settingsStore';
import {useTheme} from '@/theme';
import {ArrowLeft, Check, Minus, Plus} from 'lucide-react-native';

interface FontSettingsViewProps {
  onBack: () => void;
}

const FONT_OPTIONS: {key: 'system' | 'opendyslexic'; label: string; description: string}[] = [
  {key: 'system', label: '시스템 기본', description: 'San Francisco / Roboto'},
  {key: 'opendyslexic', label: 'OpenDyslexic', description: '난독증 지원 폰트'},
];

export function FontSettingsView({onBack}: FontSettingsViewProps) {
  const {primaryColor} = useTheme();
  const fontFamily = useSettingsStore(s => s.fontFamily);
  const fontSize = useSettingsStore(s => s.fontSize);
  const setFontFamily = useSettingsStore(s => s.setFontFamily);
  const setFontSize = useSettingsStore(s => s.setFontSize);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
          <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
        </AnimatedPressable>
        <Text style={styles.title}>폰트 설정</Text>
        <View style={{width: 24}} />
      </View>

      {/* 폰트 선택 */}
      <Text style={styles.sectionTitle}>폰트 종류</Text>
      {FONT_OPTIONS.map(opt => {
        const isSelected = fontFamily === opt.key;
        return (
          <AnimatedPressable
            key={opt.key}
            onPress={() => setFontFamily(opt.key)}
            hapticType="medium"
            scaleValue={0.98}
            style={[
              styles.fontOption,
              isSelected && {borderColor: primaryColor, borderWidth: 2},
            ]}>
            <View style={styles.fontOptionText}>
              <Text style={styles.fontOptionLabel}>{opt.label}</Text>
              <Text style={styles.fontOptionDesc}>{opt.description}</Text>
            </View>
            {isSelected && <Check size={20} color={primaryColor} strokeWidth={2.5} />}
          </AnimatedPressable>
        );
      })}

      {/* 폰트 크기 */}
      <Text style={[styles.sectionTitle, {marginTop: 24}]}>폰트 크기</Text>
      <View style={styles.sizeRow}>
        <Text style={styles.sizeLabel}>가</Text>
        <AnimatedPressable
          onPress={() => setFontSize(fontSize - 1)}
          hapticType="light"
          scaleValue={0.9}
          style={styles.sizeBtn}>
          <Minus size={18} color="#4B5563" strokeWidth={2} />
        </AnimatedPressable>
        <View style={[styles.sizeDisplay, {borderColor: primaryColor}]}>
          <Text style={[styles.sizeDisplayText, {color: primaryColor}]}>{fontSize}pt</Text>
        </View>
        <AnimatedPressable
          onPress={() => setFontSize(fontSize + 1)}
          hapticType="light"
          scaleValue={0.9}
          style={styles.sizeBtn}>
          <Plus size={18} color="#4B5563" strokeWidth={2} />
        </AnimatedPressable>
        <Text style={[styles.sizeLabel, {fontSize: 22}]}>가</Text>
      </View>

      {/* 미리보기 */}
      <View style={styles.preview}>
        <Text style={styles.previewTitle}>미리보기</Text>
        <Text style={[styles.previewText, {fontSize}]}>
          오늘 할 일을 정리하고{'\n'}하나씩 해결해 나가요 ✨
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 10,
    marginLeft: 4,
  },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fontOptionText: {
    flex: 1,
  },
  fontOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  fontOptionDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  sizeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  sizeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  sizeDisplayText: {
    fontSize: 16,
    fontWeight: '700',
  },
  preview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  previewText: {
    color: '#1F2937',
    lineHeight: 28,
  },
});
