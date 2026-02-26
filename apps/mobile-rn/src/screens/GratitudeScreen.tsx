/**
 * Gratitude Screen — 감사 기록하기
 * 사람별 필터 + 감사 기록 목록
 */
import React, {useEffect, useState, useCallback} from 'react';
import {Text, View, ScrollView, FlatList, TouchableOpacity, Alert} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {Heart, Trash2} from 'lucide-react-native';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {INTERACTION_TYPE_LABELS} from '@/types/cherished-people';
import type {NoteWithPerson} from '@/types/cherished-people';
import {formatDistanceToNow} from 'date-fns';
import {ko} from 'date-fns/locale';
import {resolveTodoIcon} from '@/lib/iconMap';

function PersonFilterChips({
  people,
  selectedId,
  onSelect,
}: {
  people: {id: string; name: string}[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 8}}>
      <TouchableOpacity
        onPress={() => onSelect(null)}
        className={`mr-2 px-4 py-2 rounded-full ${
          !selectedId ? 'bg-emerald-500' : 'bg-gray-100'
        }`}>
        <Text
          className={`text-sm font-medium ${
            !selectedId ? 'text-white' : 'text-gray-600'
          }`}>
          전체
        </Text>
      </TouchableOpacity>
      {people.map(p => (
        <TouchableOpacity
          key={p.id}
          onPress={() => onSelect(p.id)}
          className={`mr-2 px-4 py-2 rounded-full ${
            selectedId === p.id ? 'bg-emerald-500' : 'bg-gray-100'
          }`}>
          <Text
            className={`text-sm font-medium ${
              selectedId === p.id ? 'text-white' : 'text-gray-600'
            }`}>
            {p.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function GratitudeScreen() {
  const user = useAuthStore(s => s.user);
  const {people, getGratitudeNotes, deleteInteraction, loadPeople} =
    useCherishedPeopleStore();
  const [notes, setNotes] = useState<NoteWithPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await getGratitudeNotes(user.id, selectedPersonId ?? undefined);
    setNotes(data);
    setLoading(false);
  }, [user?.id, selectedPersonId]);

  useEffect(() => {
    if (user?.id) {
      loadPeople(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleDelete = useCallback(
    (noteId: string) => {
      Alert.alert('삭제', '이 감사 기록을 삭제할까요?', [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            if (user?.id) {
              await deleteInteraction(noteId, user.id);
              loadNotes();
            }
          },
        },
      ]);
    },
    [user?.id, deleteInteraction, loadNotes],
  );

  const renderNote = ({item, index}: {item: NoteWithPerson; index: number}) => {
    const typeLabel = INTERACTION_TYPE_LABELS[item.interaction_type];
    const timeAgo = formatDistanceToNow(new Date(item.interaction_date), {
      addSuffix: true,
      locale: ko,
    });

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
        <View className="mx-4 mb-3">
          <AnimatedCard enterDelay={0}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                {(() => {
                  const IconComp = resolveTodoIcon(typeLabel?.icon ?? 'heart');
                  return IconComp ? <IconComp size={16} color="#22C55E" /> : null;
                })()}
                <Text className="text-sm font-semibold text-gray-800 ml-2">
                  {item.person_name}
                </Text>
                <Text className="text-xs text-gray-400 ml-2">{timeAgo}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Trash2 size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {item.gratitude_note && (
              <Text className="text-sm text-gray-700 leading-5">
                {item.gratitude_note}
              </Text>
            )}
          </AnimatedCard>
        </View>
      </Animated.View>
    );
  };

  return (
    <ScreenContainer gradient="warmBackground">
      {/* 사람별 필터 */}
      <PersonFilterChips
        people={people.map(p => ({id: p.id, name: p.name}))}
        selectedId={selectedPersonId}
        onSelect={setSelectedPersonId}
      />

      {/* 감사 기록 목록 */}
      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        renderItem={renderNote}
        contentContainerStyle={{paddingBottom: 100, paddingTop: 8}}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Heart size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-center">
              {loading ? '로딩 중...' : '아직 감사 기록이 없어요\n관계 기록에서 감사한 점을 남겨보세요'}
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
