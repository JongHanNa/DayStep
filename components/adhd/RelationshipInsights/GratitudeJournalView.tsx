'use client';

import { useState, useEffect } from 'react';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import type { CareInteraction, CherishedPerson } from '@/types/cherished-people';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Heart, User } from 'lucide-react';

interface GratitudeJournalViewProps {
  userId: string;
}

export function GratitudeJournalView({ userId }: GratitudeJournalViewProps) {
  const [notes, setNotes] = useState<{ interaction: CareInteraction; person?: CherishedPerson }[]>([]);
  const [people, setPeople] = useState<CherishedPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId, selectedPersonId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notesData, peopleData] = await Promise.all([
        CherishedPeopleService.getGratitudeNotes(userId, selectedPersonId || undefined),
        CherishedPeopleService.getPeople(userId),
      ]);
      setNotes(notesData);
      setPeople(peopleData);
    } catch (error) {
      console.error('감사 노트 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // 사람별로 그룹화
  const groupedByPerson = notes.reduce((acc, item) => {
    const personName = item.person?.name || '알 수 없음';
    if (!acc[personName]) {
      acc[personName] = [];
    }
    acc[personName].push(item);
    return acc;
  }, {} as Record<string, typeof notes>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  // SearchableSelect용 옵션 변환
  const peopleOptions = people.map((person) => ({
    id: person.id,
    label: person.name,
  }));

  return (
    <div className="p-4">
      {/* 사람 필터 (검색 가능) */}
      <div className="mb-4">
        <SearchableSelect
          options={peopleOptions}
          value={selectedPersonId}
          onChange={setSelectedPersonId}
          allOptionLabel="모든 사람"
          className="w-full max-w-xs"
        />
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>아직 감사 기록이 없어요</p>
          <p className="text-sm mt-1">마음을 전할 때 감사한 점을 남겨보세요</p>
        </div>
      ) : selectedPersonId ? (
        // 특정 사람 선택 시 리스트로 표시
        <div className="space-y-3">
          {notes.map(({ interaction, person }) => (
            <div key={interaction.id} className="bg-pink-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base-content">{interaction.gratitude_note}</p>
                  <p className="text-xs text-base-content/60 mt-2">
                    {formatDate(interaction.interaction_date)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 모든 사람: 사람별로 그룹화하여 표시
        <div className="space-y-6">
          {Object.entries(groupedByPerson).map(([personName, personNotes]) => (
            <div key={personName}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-pink-600" />
                </div>
                <h3 className="font-semibold">{personName}님께 감사한 점들</h3>
                <span className="text-xs text-base-content/60">({personNotes.length})</span>
              </div>
              <div className="space-y-2 pl-10">
                {personNotes.slice(0, 5).map(({ interaction }) => (
                  <div key={interaction.id} className="bg-pink-50 rounded-lg p-3">
                    <p className="text-sm">{interaction.gratitude_note}</p>
                    <p className="text-xs text-base-content/60 mt-1">
                      {formatDate(interaction.interaction_date)}
                    </p>
                  </div>
                ))}
                {personNotes.length > 5 && (
                  <button
                    onClick={() => setSelectedPersonId(personNotes[0].interaction.person_id)}
                    className="text-sm text-pink-600 hover:underline"
                  >
                    +{personNotes.length - 5}개 더 보기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
