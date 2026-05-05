/**
 * MotivationFilterBar — 상태 필터칩 + 감정 필터칩 + 검색
 */
import React from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {EMOTION_CONFIG, EMOTION_TAGS} from '@/lib/motivationUtils';
import type {StatusFilter} from '@/lib/motivationUtils';
import type {EmotionTag} from '@/stores/motivationStore';
import {Search} from 'lucide-react-native';

interface MotivationFilterBarProps {
  statusFilter: StatusFilter;
  emotionFilter: EmotionTag | null;
  searchQuery: string;
  filterCounts: {all: number; pending: number; processed: number};
  onStatusChange: (filter: StatusFilter) => void;
  onEmotionChange: (tag: EmotionTag | null) => void;
  onSearchChange: (query: string) => void;
}

const STATUS_FILTERS: {key: StatusFilter; label: string}[] = [
  {key: 'all', label: '전체'},
  {key: 'pending', label: '미처리'},
  {key: 'processed', label: '처리됨'},
];

export function MotivationFilterBar({
  statusFilter,
  emotionFilter,
  searchQuery,
  filterCounts,
  onStatusChange,
  onEmotionChange,
  onSearchChange,
}: MotivationFilterBarProps) {
  const {primaryColor} = useTheme();

  return (
    <View style={styles.container}>
      {/* 검색 */}
      <View style={styles.searchRow}>
        <Search size={16} color="#9CA3AF" strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="검색..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
      </View>

      {/* 상태 필터 */}
      <View style={styles.chipRow}>
        {STATUS_FILTERS.map(f => {
          const isActive = statusFilter === f.key;
          const count = filterCounts[f.key];
          return (
            <AnimatedPressable
              key={f.key}
              onPress={() => onStatusChange(f.key)}
              hapticType="selection"
              scaleValue={0.95}
              style={[
                styles.chip,
                isActive && {backgroundColor: primaryColor, borderColor: primaryColor},
              ]}>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {f.label} {count}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* 감정 필터 */}
      <View style={styles.chipRow}>
        {EMOTION_TAGS.map(tag => {
          const config = EMOTION_CONFIG[tag];
          const isActive = emotionFilter === tag;
          return (
            <AnimatedPressable
              key={tag}
              onPress={() => onEmotionChange(isActive ? null : tag)}
              hapticType="selection"
              scaleValue={0.95}
              style={[
                styles.emotionChip,
                isActive && {backgroundColor: config.bgColor, borderColor: config.borderColor},
              ]}>
              <config.icon size={16} color={isActive ? config.color : '#9CA3AF'} strokeWidth={2} />
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  emotionChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
