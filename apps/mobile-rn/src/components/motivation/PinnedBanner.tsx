/**
 * PinnedBanner — "오늘의 원동력" 배너
 * is_banner_pinned 노트를 화면 상단에 표시
 * LiquidGlassMenu로 "배너 해제" 컨텍스트메뉴
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Sparkles} from 'lucide-react-native';
import {LiquidGlassMenu} from '@/components/native';
import {hexWithOpacity} from '@/lib/todoUtils';
import {Pin} from 'lucide-react-native';
import type {Note} from '@/stores/motivationStore';

interface PinnedBannerProps {
  note: Note;
  primaryColor: string;
  onUnpin: (noteId: string) => void;
}

export function PinnedBanner({note, primaryColor, onUnpin}: PinnedBannerProps) {
  return (
    <View style={[styles.container, {backgroundColor: hexWithOpacity(primaryColor, 0.1)}]}>
      <View style={styles.row}>
        <Sparkles size={16} color={primaryColor} strokeWidth={2} />
        <Text style={[styles.label, {color: primaryColor}]}>오늘의 원동력</Text>
        <View style={styles.spacer} />
        <LiquidGlassMenu
          systemIconName="pin.slash"
          iconColor={primaryColor}
          size={28}
          menuItems={[{title: '배너 해제', key: 'unpin'}]}
          onSelect={(key) => {
            if (key === 'unpin') onUnpin(note.id);
          }}
          fallbackIcon={<Pin size={14} color={primaryColor} strokeWidth={2} />}
        />
      </View>
      <Text style={styles.content} numberOfLines={3}>
        {note.content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
