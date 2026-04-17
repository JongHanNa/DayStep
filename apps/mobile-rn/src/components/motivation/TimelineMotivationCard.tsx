/**
 * TimelineMotivationCard — 타임라인 개별 노트 카드
 * collapsed: content 2줄 + 시간
 * expanded: 전체내용 + 연결할일
 * emotion은 타임라인 도트 색상으로만 표현 (borderLeft 없음)
 * LiquidGlassMenu: "편집", "배너 고정", "삭제"
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {LiquidGlassMenu} from '@/components/native';
import {Link2, Link2Off, MoreHorizontal} from 'lucide-react-native';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Note} from '@/stores/motivationStore';

interface TimelineMotivationCardProps {
  note: Note;
  isExpanded: boolean;
  primaryColor: string;
  onToggle: (noteId: string) => void;
  onEdit: (note: Note) => void;
  onPin: (noteId: string, isPinned: boolean) => void;
  onDelete: (noteId: string) => void;
  onUnlinkTodo: (motivationId: string, todoId: string) => void;
}

export function TimelineMotivationCard({
  note,
  isExpanded,
  onToggle,
  onEdit,
  onPin,
  onDelete,
  onUnlinkTodo,
}: TimelineMotivationCardProps) {
  const timeStr = format(new Date(note.created_at), 'a h:mm', {locale: ko});
  const todoCount = note.todos?.length ?? 0;

  const handleMenuSelect = (key: string) => {
    if (key === 'edit') onEdit(note);
    else if (key === 'pin') onPin(note.id, !note.is_banner_pinned);
    else if (key === 'delete') onDelete(note.id);
  };

  return (
    <View style={styles.cardWrapper}>
      <AnimatedPressable
        onPress={() => onToggle(note.id)}
        scaleValue={0.98}
        hapticType="light"
        style={styles.card}>
        {/* 상단: 시간 + 메뉴 */}
        <View style={styles.headerRow}>
          <Text style={styles.time}>{timeStr}</Text>
          {note.title && (
            <Text style={styles.title} numberOfLines={1}>{note.title}</Text>
          )}
          <View style={styles.spacer} />
          <LiquidGlassMenu
            systemIconName="ellipsis"
            iconColor="#9CA3AF"
            size={28}
            menuItems={[
              {title: '편집', key: 'edit'},
              {title: note.is_banner_pinned ? '배너 해제' : '배너 고정', key: 'pin'},
              {title: '삭제', key: 'delete'},
            ]}
            onSelect={handleMenuSelect}
            fallbackIcon={<MoreHorizontal size={16} color="#9CA3AF" strokeWidth={2} />}
          />
        </View>

        {/* 내용 */}
        <Text style={styles.content} numberOfLines={isExpanded ? undefined : 2}>
          {note.content}
        </Text>

        {/* 확장 시: 연결된 할일 */}
        {isExpanded && todoCount > 0 && (
          <View style={styles.todosSection}>
            <View style={styles.todosHeader}>
              <Link2 size={12} color="#6B7280" strokeWidth={2} />
              <Text style={styles.todosTitle}>연결된 할일 ({todoCount})</Text>
            </View>
            {note.todos?.map(todo => (
              <View key={todo.id} style={styles.todoItemRow}>
                <Text style={styles.todoItem} numberOfLines={1}>• {todo.title}</Text>
                <AnimatedPressable
                  onPress={() => onUnlinkTodo(note.id, todo.id)}
                  hapticType="light"
                  scaleValue={0.85}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  style={styles.unlinkBtn}>
                  <Link2Off size={12} color="#9CA3AF" strokeWidth={2} />
                </AnimatedPressable>
              </View>
            ))}
          </View>
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  content: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
  },
  todosSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  todosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  todosTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  todoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  todoItem: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 2,
    flex: 1,
  },
  unlinkBtn: {
    padding: 4,
  },
});
