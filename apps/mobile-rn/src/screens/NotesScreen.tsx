/**
 * NotesScreen — 원동력 새기기
 * 감정 기반 동기부여 노트 CRUD + 필터링 + 스트릭/XP
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {ScreenContainer} from '@/components/core';
import {MotivationHeader} from '@/components/motivation/MotivationHeader';
import {MotivationInlineInput} from '@/components/motivation/MotivationInlineInput';
import {MotivationFilterBar} from '@/components/motivation/MotivationFilterBar';
import {FuelNoteCard} from '@/components/motivation/FuelNoteCard';
import {
  FuelInputBottomSheet,
  type FuelInputBottomSheetRef,
} from '@/components/motivation/FuelInputBottomSheet';
import {
  FuelDetailBottomSheet,
  type FuelDetailBottomSheetRef,
} from '@/components/motivation/FuelDetailBottomSheet';
import {MotivationEmptyState} from '@/components/motivation/MotivationEmptyState';
import {useNoteStore} from '@/stores/noteStore';
import {useAuthStore} from '@/stores/authStore';
import {
  calculateStreak,
  calculateXP,
  getFilterCounts,
  isNoteProcessed,
} from '@/lib/motivationUtils';
import type {StatusFilter} from '@/lib/motivationUtils';
import type {Note, EmotionTag} from '@/stores/noteStore';

export default function NotesScreen() {
  const {user} = useAuthStore();
  const {
    notes,
    loading,
    fetchFuelNotes,
    createFuelNote,
    updateNote,
    deleteNote,
    setBannerPinned,
  } = useNoteStore();

  const inputSheetRef = useRef<FuelInputBottomSheetRef>(null);
  const detailSheetRef = useRef<FuelDetailBottomSheetRef>(null);

  // 로컬 필터 상태
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emotionFilter, setEmotionFilter] = useState<EmotionTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 초기 로드
  useEffect(() => {
    if (user?.id) {
      fetchFuelNotes(user.id);
    }
  }, [user?.id, fetchFuelNotes]);

  // 파생 데이터
  const streak = useMemo(() => calculateStreak(notes), [notes]);
  const xp = useMemo(() => calculateXP(notes), [notes]);
  const filterCounts = useMemo(() => getFilterCounts(notes), [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes;

    // 상태 필터
    if (statusFilter === 'pending') {
      result = result.filter(n => !isNoteProcessed(n));
    } else if (statusFilter === 'processed') {
      result = result.filter(n => isNoteProcessed(n));
    }

    // 감정 필터
    if (emotionFilter) {
      result = result.filter(n => n.emotion_tag === emotionFilter);
    }

    // 검색
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        n =>
          n.content.toLowerCase().includes(q) ||
          (n.title ?? '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [notes, statusFilter, emotionFilter, searchQuery]);

  // 핸들러
  const handleRefresh = useCallback(() => {
    if (user?.id) fetchFuelNotes(user.id);
  }, [user?.id, fetchFuelNotes]);

  const handleInlineSubmit = useCallback(
    (content: string, emotionTag?: EmotionTag) => {
      createFuelNote({content, emotion_tag: emotionTag});
    },
    [createFuelNote],
  );

  const handleSheetSubmit = useCallback(
    (input: {content: string; title?: string; emotion_tag?: EmotionTag}) => {
      createFuelNote(input);
    },
    [createFuelNote],
  );

  const handleNotePress = useCallback(
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
      deleteNote(noteId);
    },
    [deleteNote],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      <FlatList
        data={filteredNotes}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <Animated.View entering={FadeIn.duration(400)}>
            <MotivationHeader
              streak={streak}
              xp={xp}
              totalNotes={notes.length}
            />
            <MotivationInlineInput onSubmit={handleInlineSubmit} />
            <MotivationFilterBar
              statusFilter={statusFilter}
              emotionFilter={emotionFilter}
              searchQuery={searchQuery}
              filterCounts={filterCounts}
              onStatusChange={setStatusFilter}
              onEmotionChange={setEmotionFilter}
              onSearchChange={setSearchQuery}
            />
          </Animated.View>
        }
        renderItem={({item, index}) => (
          <FuelNoteCard
            note={item}
            index={index}
            onPress={handleNotePress}
            onPin={handlePin}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={<MotivationEmptyState />}
        contentContainerStyle={{paddingBottom: 120, paddingTop: 12}}
      />

      <FuelInputBottomSheet ref={inputSheetRef} onSubmit={handleSheetSubmit} />
      <FuelDetailBottomSheet
        ref={detailSheetRef}
        onUpdate={handleUpdate}
        onPin={handlePin}
        onDelete={handleDelete}
      />
    </ScreenContainer>
  );
}
