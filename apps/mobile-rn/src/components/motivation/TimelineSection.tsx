/**
 * TimelineSection — iOS 25- Reanimated 폴백
 * 타임라인 레일(세로선 w:2 #E5E7EB) + 도트(10x10 emotion color) + 노트카드
 * 날짜헤더 + withSpring(springs.nativeGlass) 확장 애니메이션
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import {springs} from '@/theme/animations';
import {EMOTION_CONFIG} from '@/lib/motivationUtils';
import {TimelineNoteCard} from './TimelineNoteCard';
import type {Note} from '@/stores/noteStore';

export interface TimelineSectionData {
  key: string;
  label: string;
  notes: Note[];
}

interface TimelineSectionProps {
  sections: TimelineSectionData[];
  expandedMotivationIds: Set<string>;
  primaryColor: string;
  onMotivationToggle: (noteId: string) => void;
  onMotivationEdit: (note: Note) => void;
  onNotePin: (noteId: string, isPinned: boolean) => void;
  onNoteDelete: (noteId: string) => void;
}

export function TimelineSection({
  sections,
  expandedMotivationIds,
  primaryColor,
  onMotivationToggle,
  onMotivationEdit,
  onNotePin,
  onNoteDelete,
}: TimelineSectionProps) {
  return (
    <View style={styles.container}>
      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          {/* 날짜 헤더 */}
          <Text style={styles.dateHeader}>{section.label}</Text>

          {/* 타임라인 레일 + 노트들 */}
          <View style={styles.railContainer}>
            {/* 세로 레일 */}
            <View style={styles.rail}>
              {section.motivations.map((note, index) => {
                const emotionColor = note.emotion_tag
                  ? EMOTION_CONFIG[note.emotion_tag]?.color
                  : '#D1D5DB';
                return (
                  <View key={note.id} style={styles.dotRow}>
                    {/* 도트 */}
                    <View
                      style={[styles.dot, {backgroundColor: emotionColor}]}
                    />
                    {/* 레일 연결선 (마지막 아이템 제외) */}
                    {index < section.motivations.length - 1 && (
                      <View style={styles.railLine} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* 카드들 */}
            <View style={styles.cardsColumn}>
              {section.motivations.map((note, index) => (
                <Animated.View
                  key={note.id}
                  entering={FadeIn.delay(index * 30).duration(300)}
                  style={styles.cardRow}>
                  <TimelineNoteCard
                    note={note}
                    isExpanded={expandedMotivationIds.has(note.id)}
                    primaryColor={primaryColor}
                    onToggle={onMotivationToggle}
                    onEdit={onMotivationEdit}
                    onPin={onNotePin}
                    onDelete={onNoteDelete}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    marginLeft: 4,
  },
  railContainer: {
    flexDirection: 'row',
  },
  rail: {
    width: 20,
    alignItems: 'center',
    paddingTop: 14,
  },
  dotRow: {
    alignItems: 'center',
    flex: 1,
    minHeight: 60,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  railLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  cardsColumn: {
    flex: 1,
    gap: 8,
  },
  cardRow: {
    flex: 1,
  },
});
