'use client';

import { useState, useEffect } from 'react';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { FEELING_RATINGS } from '@/types/cherished-people';
import type { CherishedPerson } from '@/types/cherished-people';
import { Smile, User, Sparkles } from 'lucide-react';

interface MoodPatternsViewProps {
  userId: string;
}

interface MoodPattern {
  person: CherishedPerson;
  avgMood: number;
  totalCount: number;
  moodHistory: number[];
}

export function MoodPatternsView({ userId }: MoodPatternsViewProps) {
  const [patterns, setPatterns] = useState<MoodPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
  }, [userId]);

  const loadPatterns = async () => {
    setIsLoading(true);
    try {
      const data = await CherishedPeopleService.getMoodPatterns(userId);
      setPatterns(data);
    } catch (error) {
      console.error('기분 패턴 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMoodEmoji = (rating: number) => {
    const rounded = Math.round(rating);
    return FEELING_RATINGS[rounded]?.emoji || '😐';
  };

  const getMoodLabel = (rating: number) => {
    if (rating >= 4.5) return '항상 기분이 좋아져요';
    if (rating >= 3.5) return '기분이 좋아져요';
    if (rating >= 2.5) return '무난해요';
    if (rating >= 1.5) return '조금 힘들어요';
    return '힘들어요';
  };

  const getMoodColor = (rating: number) => {
    if (rating >= 4) return 'text-rose-500';
    if (rating >= 3) return 'text-amber-500';
    return 'text-blue-500';
  };

  const getMoodBgColor = (rating: number) => {
    if (rating >= 4) return 'bg-rose-50';
    if (rating >= 3) return 'bg-amber-50';
    return 'bg-blue-50';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-12 text-base-content/60">
          <Smile className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>아직 기분 기록이 없어요</p>
          <p className="text-sm mt-1">마음을 전할 때 기분을 남겨보세요</p>
        </div>
      </div>
    );
  }

  // 전체 평균 계산
  const overallAvg = patterns.reduce((sum, p) => sum + p.avgMood * p.totalCount, 0) /
    patterns.reduce((sum, p) => sum + p.totalCount, 0);

  return (
    <div className="p-4 space-y-6">
      {/* 전체 요약 */}
      <div className="bg-gradient-to-br from-rose-100 to-amber-50 rounded-xl p-5 text-center">
        <div className="text-4xl mb-2">{getMoodEmoji(overallAvg)}</div>
        <p className="text-lg font-semibold text-base-content">
          전체 평균: {overallAvg.toFixed(1)}점
        </p>
        <p className="text-sm text-base-content/70 mt-1">
          소중한 사람들과 연락하면 {getMoodLabel(overallAvg)}
        </p>
      </div>

      {/* 인사이트 */}
      {patterns.length > 0 && patterns[0].avgMood >= 4 && (
        <div className="bg-rose-50 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-rose-500 mt-0.5" />
          <div>
            <p className="font-medium text-rose-700">
              {patterns[0].person.name}님과 연락하면 기분이 좋아져요!
            </p>
            <p className="text-sm text-rose-600/70 mt-1">
              평균 {patterns[0].avgMood}점으로 가장 높아요
            </p>
          </div>
        </div>
      )}

      {/* 사람별 기분 패턴 */}
      <div className="space-y-3">
        <h3 className="font-semibold text-base-content/80">사람별 기분 패턴</h3>
        {patterns.map((pattern) => (
          <div
            key={pattern.person.id}
            className={`${getMoodBgColor(pattern.avgMood)} rounded-xl p-4`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
                <span className="text-2xl">{getMoodEmoji(pattern.avgMood)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{pattern.person.name}</span>
                  <span className={`font-bold ${getMoodColor(pattern.avgMood)}`}>
                    {pattern.avgMood.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-base-content/60 mt-0.5">
                  {getMoodLabel(pattern.avgMood)} ({pattern.totalCount}회 기록)
                </p>
              </div>
            </div>

            {/* 최근 기분 히스토리 */}
            {pattern.moodHistory.length > 1 && (
              <div className="flex items-center gap-1 mt-3 pl-15">
                <span className="text-xs text-base-content/50 mr-2">최근:</span>
                {pattern.moodHistory.slice(0, 7).map((mood, idx) => (
                  <span key={idx} className="text-sm">
                    {FEELING_RATINGS[mood]?.emoji || '😐'}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 기분 점수 설명 */}
      <div className="bg-base-200 rounded-xl p-4">
        <h4 className="text-sm font-medium text-base-content/70 mb-3">기분 점수 안내</h4>
        <div className="grid grid-cols-5 gap-2 text-center">
          {Object.entries(FEELING_RATINGS).map(([score, info]) => (
            <div key={score} className="space-y-1">
              <span className="text-xl">{info.emoji}</span>
              <p className="text-xs text-base-content/60">{score}점</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
