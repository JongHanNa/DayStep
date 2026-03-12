/**
 * NotesTimelineModal — 소식/감사 타임라인 통합 모달
 * pageSheet 스타일, RecordScreen ··· 메뉴에서 진입
 */
import React, {useEffect, useState, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {X, MessageCircle, Heart, Trash2} from 'lucide-react-native';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import type {CherishedPerson} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {INTERACTION_TYPE_LABELS} from '@/types/cherished-people';
import type {NoteWithPerson} from '@/types/cherished-people';
import {resolveTodoIcon} from '@/lib/iconMap';
import {formatDistanceToNow} from 'date-fns';
import {ko} from 'date-fns/locale';

type TabType = 'news' | 'gratitude';

interface NotesTimelineModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab: TabType;
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
  return (
    <View style={styles.chipContainer}>
      <TouchableOpacity
        onPress={() => onSelect(null)}
        style={[styles.chip, !selectedId && styles.chipActive]}>
        <Text style={[styles.chipText, !selectedId && styles.chipTextActive]}>
          전체
        </Text>
      </TouchableOpacity>
      {people.map(p => {
        const isActive = selectedId === p.id;
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => onSelect(isActive ? null : p.id)}
            style={[styles.chip, isActive && styles.chipActive]}>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {p.name}
            </Text>
          </TouchableOpacity>
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
        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Trash2 size={16} color="#D1D5DB" />
        </TouchableOpacity>
      </View>
      <Text style={styles.noteContent}>{content}</Text>
    </View>
  );
}

export function NotesTimelineModal({
  visible,
  onClose,
  initialTab,
}: NotesTimelineModalProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const {people, loadPeople, getRecentNewsNotes, getGratitudeNotes, deleteInteraction} =
    useCherishedPeopleStore();

  const [tab, setTab] = useState<TabType>(initialTab);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteWithPerson[]>([]);
  const [loading, setLoading] = useState(true);

  // initialTab이 바뀌면 탭 동기화
  useEffect(() => {
    if (visible) {
      setTab(initialTab);
      setSelectedPersonId(null);
    }
  }, [visible, initialTab]);

  const fetchNotes = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const fetcher = tab === 'news' ? getRecentNewsNotes : getGratitudeNotes;
    const result = await fetcher(user.id, selectedPersonId ?? undefined);
    setNotes(result);
    setLoading(false);
  }, [user?.id, tab, selectedPersonId, getRecentNewsNotes, getGratitudeNotes]);

  useEffect(() => {
    if (visible && user?.id) {
      loadPeople(user.id);
      fetchNotes();
    }
  }, [visible, user?.id, fetchNotes]);

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, {paddingTop: insets.top || 16}]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>소식 · 감사</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* 탭 토글 */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setTab('news')}
            style={[styles.tabPill, tab === 'news' && styles.tabPillActive]}>
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
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('gratitude')}
            style={[
              styles.tabPill,
              tab === 'gratitude' && styles.tabPillActive,
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
          </TouchableOpacity>
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
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : (
          <FlatList
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  tabPillActive: {
    backgroundColor: '#8B5CF6',
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
  chipActive: {
    backgroundColor: '#EDE9FE',
  },
  chipText: {
    fontSize: 12,
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
    backgroundColor: '#F3F4F6',
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
