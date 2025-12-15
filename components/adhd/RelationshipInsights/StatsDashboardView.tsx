'use client';

import { useState, useEffect } from 'react';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import { INTERACTION_TYPE_LABELS } from '@/types/cherished-people';
import type { CherishedPerson, InteractionType } from '@/types/cherished-people';
import {
  BarChart3, TrendingUp, Users, Calendar, Award,
  Phone, MessageCircle, Home, Utensils, Gift, Mail, HandHelping, Heart, Sparkles,
  type LucideIcon,
} from 'lucide-react';

// Lucide 아이콘 매핑
const INTERACTION_ICONS: Record<string, LucideIcon> = {
  Phone, MessageCircle, Home, Utensils, Gift, Mail, HandHelping, Heart, Sparkles,
};

interface StatsDashboardViewProps {
  userId: string;
}

interface DetailedStats {
  totalInteractions: number;
  thisMonthCount: number;
  interactionTypeStats: Record<string, number>;
  topContacts: { person: CherishedPerson; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

export function StatsDashboardView({ userId }: StatsDashboardViewProps) {
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await CherishedPeopleService.getDetailedStats(userId);
      setStats(data);
    } catch (error) {
      console.error('통계 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${parseInt(month)}월`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-base-content/60">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>통계를 불러올 수 없습니다</p>
      </div>
    );
  }

  // 연락 방식별 통계를 배열로 변환
  const typeStatsArray = Object.entries(stats.interactionTypeStats)
    .map(([type, count]) => {
      const typeKey = type as InteractionType;
      return {
        type,
        label: INTERACTION_TYPE_LABELS[typeKey]?.label || type,
        icon: INTERACTION_TYPE_LABELS[typeKey]?.icon || 'MessageCircle',
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  // 최대값 계산 (바 차트용)
  const maxTypeCount = Math.max(...typeStatsArray.map(t => t.count), 1);
  const maxMonthCount = Math.max(...stats.monthlyTrend.map(m => m.count), 1);

  return (
    <div className="p-4 space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-sm text-base-content/70">이번 달</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.thisMonthCount}회</p>
        </div>
        <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            <span className="text-sm text-base-content/70">총 기록</span>
          </div>
          <p className="text-2xl font-bold text-secondary">{stats.totalInteractions}회</p>
        </div>
      </div>

      {/* TOP 연락 */}
      {stats.topContacts.length > 0 && (
        <div className="bg-base-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">가장 많이 연락한 분</h3>
          </div>
          <div className="space-y-3">
            {stats.topContacts.map((item, index) => (
              <div key={item.person.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-700' :
                  index === 1 ? 'bg-gray-200 text-gray-600' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-base-300 text-base-content/60'
                }`}>
                  {index + 1}
                </div>
                <span className="flex-1 font-medium">{item.person.name}</span>
                <span className="text-sm text-base-content/60">{item.count}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 연락 방식별 통계 */}
      {typeStatsArray.length > 0 && (
        <div className="bg-base-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">연락 방식</h3>
          </div>
          <div className="space-y-3">
            {typeStatsArray.map((item) => {
              const IconComponent = INTERACTION_ICONS[item.icon];
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      {IconComponent && <IconComponent className="w-4 h-4" />}
                      {item.label}
                    </span>
                    <span className="text-base-content/60">{item.count}회</span>
                  </div>
                  <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(item.count / maxTypeCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 월별 트렌드 */}
      {stats.monthlyTrend.length > 0 && (
        <div className="bg-base-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold">월별 추이</h3>
          </div>
          <div className="flex items-end justify-around gap-2 h-32">
            {stats.monthlyTrend.map((item) => (
              <div key={item.month} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs text-base-content/60">{item.count}</span>
                <div
                  className="w-full bg-green-500 rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${Math.max((item.count / maxMonthCount) * 80, 4)}px`,
                  }}
                />
                <span className="text-xs text-base-content/60">{formatMonth(item.month)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalInteractions === 0 && (
        <div className="text-center py-8 text-base-content/60">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>아직 기록이 없어요</p>
          <p className="text-sm mt-1">마음을 전하면 통계가 쌓여요</p>
        </div>
      )}
    </div>
  );
}
