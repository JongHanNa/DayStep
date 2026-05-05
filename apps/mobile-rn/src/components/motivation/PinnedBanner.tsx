/**
 * PinnedBanner — "오늘의 원동력" 배너
 * - is_banner_pinned 노트 (또는 부모가 회전시킨 단일 노트) 표시
 * - 콘텐츠가 길면 탭으로 펼침/접힘 (3줄 ↔ 전체)
 * - 노트가 회전(부모에서 prop 변경)되면 자동으로 접힘 상태로 복귀
 * - NativeMenu로 "배너 해제" 컨텍스트메뉴
 */
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Animated, {FadeIn, FadeOut, LinearTransition} from 'react-native-reanimated';
import {Sparkles, Pin, ChevronDown, ChevronUp} from 'lucide-react-native';
import {NativeMenu} from '@/components/native';
import {hexWithOpacity} from '@/lib/todoUtils';
import {springs} from '@/theme/animations';
import type {Note} from '@/stores/motivationStore';

interface PinnedBannerProps {
  note: Note;
  primaryColor: string;
  onUnpin: (noteId: string) => void;
}

export function PinnedBanner({note, primaryColor, onUnpin}: PinnedBannerProps) {
  const [expanded, setExpanded] = useState(false);

  // 노트가 회전(교체)되면 접힌 상태로 리셋
  useEffect(() => {
    setExpanded(false);
  }, [note.id]);

  return (
    <Animated.View
      style={[styles.container, {backgroundColor: hexWithOpacity(primaryColor, 0.1)}]}
      layout={LinearTransition.springify().damping(25).stiffness(247).mass(1)}>
      <View style={styles.row}>
        <Sparkles size={16} color={primaryColor} strokeWidth={2} />
        <Text style={[styles.label, {color: primaryColor}]}>오늘의 원동력</Text>
        <View style={styles.spacer} />
        <NativeMenu
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
      <Pressable onPress={() => setExpanded(prev => !prev)}>
        <Animated.View
          key={`${note.id}-${expanded ? 'open' : 'closed'}`}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}>
          {note.title ? (
            <Text style={[styles.title, {color: primaryColor}]} numberOfLines={1}>
              {note.title}
            </Text>
          ) : null}
          <Text
            style={styles.content}
            numberOfLines={expanded ? undefined : 3}>
            {note.content}
          </Text>
        </Animated.View>
        <View style={styles.toggleRow}>
          {expanded ? (
            <ChevronUp size={14} color={hexWithOpacity(primaryColor, 0.6)} strokeWidth={2} />
          ) : (
            <ChevronDown size={14} color={hexWithOpacity(primaryColor, 0.6)} strokeWidth={2} />
          )}
        </View>
      </Pressable>
    </Animated.View>
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
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
  },
});
