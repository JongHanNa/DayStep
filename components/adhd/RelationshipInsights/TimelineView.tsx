'use client';

import { useState, useEffect } from 'react';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { INTERACTION_TYPE_LABELS, FEELING_RATINGS } from '@/types/cherished-people';
import type { CareInteraction, CherishedPerson } from '@/types/cherished-people';
import { Clock, User } from 'lucide-react';

interface TimelineViewProps {
  userId: string;
}

export function TimelineView({ userId }: TimelineViewProps) {
  const [interactions, setInteractions] = useState<(CareInteraction & { person?: CherishedPerson })[]>([]);
  const [people, setPeople] = useState<CherishedPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId, selectedPersonId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [interactionsData, peopleData] = await Promise.all([
        CherishedPeopleService.getAllInteractionsWithPerson(userId, selectedPersonId || undefined, 50),
        CherishedPeopleService.getPeople(userId),
      ]);
      setInteractions(interactionsData);
      setPeople(peopleData);
    } catch (error) {
      console.error('타임라인 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

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

      {/* 타임라인 */}
      {interactions.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>아직 기록이 없어요</p>
          <p className="text-sm mt-1">마음을 전하면 여기에 기록됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => {
            const typeInfo = INTERACTION_TYPE_LABELS[interaction.interaction_type];
            const feelingInfo = interaction.feeling_rating ? FEELING_RATINGS[interaction.feeling_rating] : null;

            return (
              <div
                key={interaction.id}
                className="bg-base-200 rounded-xl p-4 space-y-2"
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm">{typeInfo?.emoji || '💬'}</span>
                    </div>
                    <div>
                      <span className="font-medium">{interaction.person?.name || '알 수 없음'}</span>
                      <span className="text-xs text-base-content/60 ml-2">
                        {typeInfo?.label || interaction.interaction_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {feelingInfo && (
                      <span title={feelingInfo.label}>{feelingInfo.emoji}</span>
                    )}
                    <span className="text-xs text-base-content/60">
                      {formatDate(interaction.interaction_date)}
                    </span>
                  </div>
                </div>

                {/* 내용 */}
                {interaction.gratitude_note && (
                  <div className="text-sm">
                    <span className="text-pink-500 font-medium">감사: </span>
                    {interaction.gratitude_note}
                  </div>
                )}
                {interaction.recent_news && (
                  <div className="text-sm">
                    <span className="text-blue-500 font-medium">소식: </span>
                    {interaction.recent_news}
                  </div>
                )}
                {interaction.description && (
                  <div className="text-sm">
                    <span className="text-green-500 font-medium">해드리고 싶은 것: </span>
                    {interaction.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
