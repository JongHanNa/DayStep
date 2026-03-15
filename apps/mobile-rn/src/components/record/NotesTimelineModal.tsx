/**
 * NotesTimelineModal — 소식/감사 타임라인 바텀시트
 * BottomSheetModal + BottomSheetFlatList, ref 기반 제어
 */
import React, {useEffect, useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle} from 'react';
import {View, Text, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {MessageCircle, Heart, Trash2} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import type {CherishedPerson} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {INTERACTION_TYPE_LABELS} from '@/types/cherished-people';
import type {NoteWithPerson} from '@/types/cherished-people';
import {resolveTodoIcon} from '@/lib/iconMap';
import {useTheme} from '@/theme';
import {formatDistanceToNow} from 'date-fns';
import {ko} from 'date-fns/locale';

type TabType = 'news' | 'gratitude';

export interface NotesTimelineModalRef {
  present: (tab?: TabType) => void;
  dismiss: () => void;
}

function PersonFilterChips({
  people,
  selectedId,
  onSelect,
}: {
  people: CherishedPerson[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const {primaryColor} = useTheme();
  return (
    <View style={styles.chipContainer}>
      <AnimatedPressable
        onPress={() => onSelect(null)}
        hapticType="light"
        scaleValue={0.97}
        style={[styles.chip, !selectedId && {backgroundColor: `${primaryColor}20`}]}>
        <Text style={[styles.chipText, !selectedId && {color: primaryColor, fontWeight: '600'}]}>
          전체
        </Text>
      </AnimatedPressable>
      {people.map(p => {
        const isActive = selectedId === p.id;
        return (
          <AnimatedPressable
            key={p.id}
            onPress={() => onSelect(isActive ? null : p.id)}
            hapticType="light"
            scaleValue={0.97}
            style={[styles.chip, isActive && {backgroundColor: `${primaryColor}20`}]}>
            <Text style={[styles.chipText, isActive && {color: primaryColor, fontWeight: '600'}]}>
              {p.name}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

function NoteCard({
  note,
  tab,
  onDelete,
}: {
  note: NoteWithPerson;
  tab: TabType;
  onDelete: (id: string) => void;
}) {
  const content = tab === 'news' ? note.recent_news : note.gratitude_note;
  const typeLabel = INTERACTION_TYPE_LABELS[note.interaction_type];
  const IconComp = resolveTodoIcon(typeLabel?.icon);
  const timeAgo = formatDistanceToNow(new Date(note.created_at), {
    addSuffix: true,
    locale: ko,
  });

  const handleDelete = () => {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      {text: '취소', style: 'cancel'},
      {text: '삭제', style: 'destructive', onPress: () => onDelete(note.id)},
    ]);
  };

  return (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View style={styles.noteHeaderLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {note.person_name.charAt(0)}
            </Text>
          </View>
          <View>
            <Text style={styles.personName}>{note.person_name}</Text>
            <View style={styles.metaRow}>
              {IconComp && <IconComp size={12} color="#9CA3AF" />}
              <Text style={styles.metaText}>
                {typeLabel?.label} · {timeAgo}
              </Text>
            </View>
          </View>
        </View>
        <AnimatedPressable
          onPress={handleDelete}
          hapticType="light"
          scaleValue={0.9}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Trash2 size={16} color="#D1D5DB" />
        </AnimatedPressable>
      </View>
      <Text style={styles.noteContent}>{content}</Text>
    </View>
  );
}

export const NotesTimelineModal = forwardRef<NotesTimelineModalRef>(
  function NotesTimelineModal(_props, ref) {
    const {primaryColor} = useTheme();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const user = useAuthStore(s => s.user);
    const {people, loadPeople, getRecentNewsNotes, getGratitudeNotes, deleteInteraction} =
      useCherishedPeopleStore();

    const [tab, setTab] = useState<TabType>('news');
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [notes, setNotes] = useState<NoteWithPerson[]>([]);
    const [loading, setLoading] = useState(true);

    const snapPoints = useMemo(() => ['90%'], []);

    useImperativeHandle(ref, () => ({
      present: (initialTab?: TabType) => {
        if (initialTab) setTab(initialTab);
        setSelectedPersonId(null);
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    const fetchNotes = useCallback(async () => {
      if (!user?.id) return;
      setLoading(true);
      const fetcher = tab === 'news' ? getRecentNewsNotes : getGratitudeNotes;
      const result = await fetcher(user.id, selectedPersonId ?? undefined);
      setNotes(result);
      setLoading(false);
    }, [user?.id, tab, selectedPersonId, getRecentNewsNotes, getGratitudeNotes]);

    const handleSheetChange = useCallback((index: number) => {
      if (index === 0 && user?.id) {
        loadPeople(user.id);
        fetchNotes();
      }
    }, [user?.id, loadPeople, fetchNotes]);

    // tab이나 person filter 변경 시 재조회
    useEffect(() => {
      fetchNotes();
    }, [fetchNotes]);

    const handleDelete = useCallback(
      async (interactionId: string) => {
        if (!user?.id) return;
        const success = await deleteInteraction(interactionId, user.id);
        if (success) {
          setNotes(prev => prev.filter(n => n.id !== interactionId));
        }
      },
      [user?.id, deleteInteraction],
    );

    const renderEmpty = () => (
      <View style={styles.emptyContainer}>
        {tab === 'news' ? (
          <MessageCircle size={48} color="#D1D5DB" />
        ) : (
          <Heart size={48} color="#D1D5DB" />
        )}
        <Text style={styles.emptyText}>
          아직 {tab === 'news' ? '소식' : '감사'} 기록이 없어요
        </Text>
      </View>
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={false}
        handleIndicatorStyle={styles.handleIndicator}
        onChange={handleSheetChange}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>소식 · 감사</Text>
          </View>

          {/* 탭 토글 */}
          <View style={styles.tabRow}>
            <AnimatedPressable
              onPress={() => setTab('news')}
              hapticType="light"
              scaleValue={0.97}
              style={[styles.tabPill, tab === 'news' && {backgroundColor: primaryColor}]}>
              <MessageCircle
                size={14}
                color={tab === 'news' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  tab === 'news' && styles.tabTextActive,
                ]}>
                소식
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => setTab('gratitude')}
              hapticType="light"
              scaleValue={0.97}
              style={[
                styles.tabPill,
                tab === 'gratitude' && {backgroundColor: primaryColor},
              ]}>
              <Heart
                size={14}
                color={tab === 'gratitude' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  tab === 'gratitude' && styles.tabTextActive,
                ]}>
                감사
              </Text>
            </AnimatedPressable>
          </View>

          {/* 사람별 필터 칩 */}
          <PersonFilterChips
            people={people}
            selectedId={selectedPersonId}
            onSelect={setSelectedPersonId}
          />

          {/* 타임라인 리스트 */}
          {loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          ) : (
            <BottomSheetFlatList
              data={notes}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <NoteCard note={item} tab={tab} onDelete={handleDelete} />
              )}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={{paddingBottom: 40, flexGrow: 1}}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 36,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  chipText: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  personName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  noteContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
