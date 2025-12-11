'use client';

import { useState, useEffect } from 'react';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import type { CareInteraction, CherishedPerson } from '@/types/cherished-people';
import { MessageCircle, User } from 'lucide-react';

interface NewsMemosViewProps {
  userId: string;
}

export function NewsMemosView({ userId }: NewsMemosViewProps) {
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
        CherishedPeopleService.getRecentNewsNotes(userId, selectedPersonId || undefined),
        CherishedPeopleService.getPeople(userId),
      ]);
      setNotes(notesData);
      setPeople(peopleData);
    } catch (error) {
      console.error('소식 메모 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // 사람별로 그룹화 (최신 소식 우선)
  const groupedByPerson = notes.reduce((acc, item) => {
    const personId = item.interaction.person_id;
    const personName = item.person?.name || '알 수 없음';
    if (!acc[personId]) {
      acc[personId] = {
        personName,
        person: item.person,
        notes: [],
      };
    }
    acc[personId].notes.push(item);
    return acc;
  }, {} as Record<string, { personName: string; person?: CherishedPerson; notes: typeof notes }>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 사람 필터 */}
      <div className="mb-4">
        <select
          value={selectedPersonId || ''}
          onChange={(e) => setSelectedPersonId(e.target.value || null)}
          className="select select-bordered w-full max-w-xs"
        >
          <option value="">모든 사람</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      {/* 안내 문구 */}
      <div className="bg-blue-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-700">
          다음 연락 시 대화 소재로 활용해보세요
        </p>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>아직 소식 기록이 없어요</p>
          <p className="text-sm mt-1">마음을 전할 때 들은 소식을 남겨보세요</p>
        </div>
      ) : selectedPersonId ? (
        // 특정 사람 선택 시
        <div className="space-y-3">
          {notes.map(({ interaction, person }) => (
            <div key={interaction.id} className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base-content">{interaction.recent_news}</p>
                  <p className="text-xs text-base-content/60 mt-2">
                    {formatDate(interaction.interaction_date)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 모든 사람: 사람별 최신 소식 카드
        <div className="space-y-4">
          {Object.entries(groupedByPerson).map(([personId, { personName, notes: personNotes }]) => {
            const latestNote = personNotes[0];
            return (
              <div
                key={personId}
                className="bg-base-200 rounded-xl p-4 cursor-pointer hover:bg-base-300 transition-colors"
                onClick={() => setSelectedPersonId(personId)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">{personName}</h3>
                      <span className="text-xs text-base-content/60">
                        {formatDate(latestNote.interaction.interaction_date)}
                      </span>
                    </div>
                    <p className="text-sm text-base-content/80 line-clamp-2">
                      {latestNote.interaction.recent_news}
                    </p>
                    {personNotes.length > 1 && (
                      <p className="text-xs text-blue-600 mt-2">
                        +{personNotes.length - 1}개의 소식 더 있음
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
