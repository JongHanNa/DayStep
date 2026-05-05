/**
 * MotivationCard — 개별 원동력 노트 카드
 * 감정뱃지, 제목/내용, 핀, 날짜. 롱프레스 → 액션시트
 */
import React, {useCallback} from 'react';
import {View, Text, Alert, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {EMOTION_CONFIG} from '@/lib/motivationUtils';
import type {Note} from '@/stores/motivationStore';
import {Pin, Link2} from 'lucide-react-native';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import {useTheme} from '@/theme';

interface MotivationCardProps {
  note: Note;
  index: number;
  onPress: (note: Note) => void;
  onPin: (noteId: string, isPinned: boolean) => void;
  onDelete: (noteId: string) => void;
}

export function MotivationCard({note, index, onPress, onPin, onDelete}: MotivationCardProps) {
  const {primaryColor} = useTheme();
  const emotionConfig = note.emotion_tag ? EMOTION_CONFIG[note.emotion_tag] : null;
  const todoCount = note.todos?.length ?? 0;
  const dateStr = format(new Date(note.created_at), 'M/d (EEE)', {locale: ko});

  const handleLongPress = useCallback(() => {
    Alert.alert(
      '원동력 노트',
      undefined,
      [
        {
          text: note.is_banner_pinned ? '배너 해제' : '배너 고정',
          onPress: () => onPin(note.id, !note.is_banner_pinned),
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Alert.alert('삭제 확인', '이 원동력을 삭제할까요?', [
              {text: '취소', style: 'cancel'},
              {
                text: '삭제',
                style: 'destructive',
                onPress: () => onDelete(note.id),
              },
            ]);
          },
        },
        {text: '취소', style: 'cancel'},
      ],
    );
  }, [note, onPin, onDelete]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(250)}>
      <AnimatedPressable
        onPress={() => onPress(note)}
        onLongPress={handleLongPress}
        hapticType="light"
        scaleValue={0.98}
        style={[
          styles.card,
          emotionConfig && {borderLeftColor: emotionConfig.color, borderLeftWidth: 3},
        ]}>
        {/* 상단: 감정 뱃지 + 핀 + 날짜 */}
        <View style={styles.topRow}>
          {emotionConfig && (
            <View style={[styles.emotionBadge, {backgroundColor: emotionConfig.bgColor}]}>
              <emotionConfig.icon size={13} color={emotionConfig.color} strokeWidth={2} />
              <Text style={[styles.emotionLabel, {color: emotionConfig.color}]}>
                {emotionConfig.label}
              </Text>
            </View>
          )}
          <View style={styles.topRight}>
            {note.is_banner_pinned && (
              <Pin size={14} color={primaryColor} strokeWidth={2} />
            )}
            {todoCount > 0 && (
              <View style={styles.todoCountBadge}>
                <Link2 size={12} color="#6B7280" strokeWidth={2} />
                <Text style={styles.todoCountText}>{todoCount}</Text>
              </View>
            )}
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
        </View>

        {/* 제목 */}
        {note.title && (
          <Text style={styles.title} numberOfLines={1}>
            {note.title}
          </Text>
        )}

        {/* 내용 */}
        <Text style={styles.content} numberOfLines={3}>
          {note.content}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  emotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  emotionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  todoCountText: {
    fontSize: 11,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});
