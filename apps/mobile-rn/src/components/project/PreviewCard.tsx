/**
 * PreviewCard — 프로젝트 실시간 미리보기 카드
 * 색상 도트 + 아이콘 + 제목/설명을 보여줌
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {hexWithOpacity} from '@/lib/todoUtils';
import {resolveTodoIcon} from '@/lib/iconMap';

interface PreviewCardProps {
  title: string;
  description: string;
  color: string;
  icon: string;
}

export function PreviewCard({title, description, color, icon}: PreviewCardProps) {
  const IconComp = resolveTodoIcon(icon);
  const hasTitle = title.trim().length > 0;

  return (
    <View style={[styles.card, {backgroundColor: hexWithOpacity(color, 0.15)}]}>
      <View style={styles.header}>
        <View style={[styles.dot, {backgroundColor: color}]} />
        {IconComp && <IconComp size={18} color="#6B7280" style={styles.icon} />}
        <Text
          style={[styles.title, !hasTitle && styles.placeholder]}
          numberOfLines={1}>
          {hasTitle ? title : '프로젝트 제목'}
        </Text>
      </View>
      {description.trim().length > 0 && (
        <Text style={styles.description} numberOfLines={1}>
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    color: '#9CA3AF',
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    marginLeft: 16,
  },
});
