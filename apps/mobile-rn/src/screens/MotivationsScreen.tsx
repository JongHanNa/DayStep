/**
 * NotesScreen — 원동력 새기기 (타임라인 리디자인)
 * FlatList → ScrollView, 타임라인 레일 UI
 * iOS 26+: NativeTimelineAccordion / iOS 25-: TimelineSection
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ScrollView, RefreshControl, View, StyleSheet, Alert} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {ScreenContainer} from '@/components/core';
import {AnimatedPressable} from '@/components/core';
import {PinnedBanner} from '@/components/motivation/PinnedBanner';
import {TimelineSection, type TimelineSectionData} from '@/components/motivation/TimelineSection';
import {MotivationEmptyState} from '@/components/motivation/MotivationEmptyState';
import {
  MotivationInputBottomSheet,
  type MotivationInputBottomSheetRef,
} from '@/components/motivation/MotivationInputBottomSheet';
import {
  MotivationDetailBottomSheet,
  type MotivationDetailBottomSheetRef,
} from '@/components/motivation/MotivationDetailBottomSheet';
import {useMotivationStore} from '@/stores/motivationStore';
import {useAuthStore} from '@/stores/authStore';
import {useLimitCheck} from '@/hooks/useLimitCheck';
import {LimitReachedModal} from '@/components/subscription/LimitReachedModal';
import {isIOS26Plus, NativeTimelineAccordionNative} from '@/components/native';
import {useTheme} from '@/theme';
import {Plus} from 'lucide-react-native';
import type {Note, EmotionTag} from '@/stores/motivationStore';
import {
  isToday,
  isYesterday,
  format,
} from 'date-fns';
import {ko} from 'date-fns/locale';

/** notes를 날짜별로 그룹핑 */
function groupNotesByDate(notes: Note[]): TimelineSectionData[] {
  const groups = new Map<string, Note[]>();

  for (const note of notes) {
    const d = new Date(note.created_at);
    const dateKey = format(d, 'yyyy-MM-dd');
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(note);
  }

  const sections: TimelineSectionData[] = [];
  for (const [dateKey, dateNotes] of groups) {
    const d = new Date(dateKey + 'T00:00:00');
    let label: string;
    if (isToday(d)) label = '오늘';
    else if (isYesterday(d)) label = '어제';
    else label = format(d, 'M월 d일 (EEE)', {locale: ko});

    sections.push({key: dateKey, label, notes: dateNotes});
  }

  return sections;
}

export default function NotesScreen() {
  const {user} = useAuthStore();
  const {
    notes,
    loading,
    fetchMotivationNotes,
    createMotivationNote,
    updateNote,
    deleteNote,
    setBannerPinned,
  } = useMotivationStore();
  const {checkLimit, isLimitReached, limitedEntity, currentCount, maxCount, closeLimitModal} = useLimitCheck();
  const {primaryColor} = useTheme();

  const inputSheetRef = useRef<MotivationInputBottomSheetRef>(null);
  const detailSheetRef = useRef<MotivationDetailBottomSheetRef>(null);

  const [expandedMotivationIds, setExpandedNoteIds] = useState<Set<string>>(new Set());
  const [nativeHeight, setNativeHeight] = useState(400);

  // 초기 로드
  useEffect(() => {
    if (user?.id) {
      fetchMotivationNotes(user.id);
    }
  }, [user?.id, fetchMotivationNotes]);

  // 파생 데이터
  const pinnedNote = useMemo(
    () => notes.find(n => n.is_banner_pinned) ?? null,
    [notes],
  );

  const timelineSections = useMemo(
    () => groupNotesByDate(notes),
    [notes],
  );

  const timelineDataJSON = useMemo(
    () => JSON.stringify(
      timelineSections.map(s => ({
        key: s.key,
        label: s.label,
        notes: s.notes.map(n => ({
          id: n.id,
          title: n.title ?? '',
          content: n.content,
          emotion_tag: n.emotion_tag ?? '',
          is_banner_pinned: n.is_banner_pinned ?? false,
          created_at: n.created_at,
          todo_count: n.todos?.length ?? 0,
        })),
      })),
    ),
    [timelineSections],
  );

  // 핸들러
  const handleRefresh = useCallback(() => {
    if (user?.id) fetchMotivationNotes(user.id);
  }, [user?.id, fetchMotivationNotes]);

  const handleSheetSubmit = useCallback(
    async (input: {content: string; title?: string; emotion_tag?: EmotionTag}) => {
      const allowed = await checkLimit('note');
      if (!allowed) return;
      createMotivationNote(input);
    },
    [createMotivationNote, checkLimit],
  );

  const handleNoteToggle = useCallback((noteId: string) => {
    setExpandedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

  const handleNoteEdit = useCallback(
    (note: Note) => {
      detailSheetRef.current?.open(note);
    },
    [],
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'emotion_tag'>>) => {
      updateNote(id, updates);
    },
    [updateNote],
  );

  const handlePin = useCallback(
    (noteId: string, isPinned: boolean) => {
      setBannerPinned(noteId, isPinned);
    },
    [setBannerPinned],
  );

  const handleDelete = useCallback(
    (noteId: string) => {
      Alert.alert('삭제 확인', '이 원동력을 삭제할까요?', [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => deleteNote(noteId),
        },
      ]);
    },
    [deleteNote],
  );

  // 네이티브 이벤트 핸들러
  const handleNativeNoteToggle = useCallback(
    (e: {nativeEvent: {noteId: string}}) => handleNoteToggle(e.nativeEvent.motivationId),
    [handleNoteToggle],
  );

  const handleNativeNoteEdit = useCallback(
    (e: {nativeEvent: {noteId: string}}) => {
      const note = notes.find(n => n.id === e.nativeEvent.motivationId);
      if (note) handleNoteEdit(note);
    },
    [notes, handleNoteEdit],
  );

  const handleNativeNoteLongPress = useCallback(
    (e: {nativeEvent: {noteId: string; action: string}}) => {
      const {noteId, action} = e.nativeEvent;
      if (action === 'pin') {
        const note = notes.find(n => n.id === noteId);
        if (note) handlePin(noteId, !note.is_banner_pinned);
      } else if (action === 'delete') {
        handleDelete(noteId);
      }
    },
    [notes, handlePin, handleDelete],
  );

  const handleNativeHeightChange = useCallback(
    (e: {nativeEvent: {height: number}}) => {
      setNativeHeight(e.nativeEvent.height);
    },
    [],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}>

        {/* 고정 배너 */}
        {pinnedNote && (
          <Animated.View entering={FadeIn.duration(300)}>
            <PinnedBanner
              note={pinnedNote}
              primaryColor={primaryColor}
              onUnpin={(noteId) => handlePin(noteId, false)}
            />
          </Animated.View>
        )}

        {/* 타임라인 */}
        {notes.length === 0 ? (
          <MotivationEmptyState />
        ) : isIOS26Plus && NativeTimelineAccordionNative != null ? (
          <NativeTimelineAccordionNative
            timelineData={timelineDataJSON}
            primaryColor={primaryColor}
            expandedMotivationIds={Array.from(expandedMotivationIds)}
            onMotivationToggle={handleNativeNoteToggle}
            onMotivationEdit={handleNativeNoteEdit}
            onMotivationLongPress={handleNativeNoteLongPress}
            onHeightChange={handleNativeHeightChange}
            style={{height: nativeHeight}}
          />
        ) : (
          <TimelineSection
            sections={timelineSections}
            expandedMotivationIds={expandedMotivationIds}
            primaryColor={primaryColor}
            onMotivationToggle={handleNoteToggle}
            onMotivationEdit={handleNoteEdit}
            onNotePin={handlePin}
            onNoteDelete={handleDelete}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <AnimatedPressable
        onPress={() => inputSheetRef.current?.open()}
        hapticType="medium"
        scaleValue={0.9}
        style={[styles.fab, {backgroundColor: primaryColor}]}>
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </AnimatedPressable>

      <MotivationInputBottomSheet ref={inputSheetRef} onSubmit={handleSheetSubmit} />
      <MotivationDetailBottomSheet
        ref={detailSheetRef}
        onUpdate={handleUpdate}
        onPin={handlePin}
        onDelete={handleDelete}
      />
      <LimitReachedModal
        visible={isLimitReached}
        onClose={closeLimitModal}
        entityType={limitedEntity}
        currentCount={currentCount}
        maxCount={maxCount}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
});
