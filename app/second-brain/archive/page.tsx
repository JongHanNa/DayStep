'use client';

import { useEffect, useState } from 'react';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { Archive, Target, Folder, MapPin, BookOpen, Trash2, Copy, RefreshCw } from 'lucide-react';
import { format, getYear } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Goal, Project, Area, Resource } from '@/types/second-brain';

type ArchiveType = 'all' | 'goals' | 'projects' | 'areas' | 'resources';

interface GroupedItem {
  year: number;
  items: (Goal | Project | Area | Resource)[];
}

export default function ArchivePage() {
  const { goals, fetchGoals } = useGoalStore();
  const { projects, fetchProjects } = useProjectStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const [filterType, setFilterType] = useState<ArchiveType>('all');

  useEffect(() => {
    fetchGoals();
    fetchProjects();
    fetchAreas();
    fetchResources();
  }, [fetchGoals, fetchProjects, fetchAreas, fetchResources]);

  // 아카이브된 항목만 필터링
  const archivedGoals = goals.filter((g) => g.status === 'archived' || g.status === 'completed');
  const archivedProjects = projects.filter((p) => p.status === 'completed' || p.status === 'archived');
  const archivedAreas = areas.filter((a) => a.is_archived);
  const archivedResources = resources.filter((r) => r.is_archived);

  // 연도별로 그룹핑
  const groupByYear = (items: (Goal | Project | Area | Resource)[]): GroupedItem[] => {
    const grouped = items.reduce((acc, item) => {
      const year = getYear(new Date(item.updated_at));
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(item);
      return acc;
    }, {} as Record<number, (Goal | Project | Area | Resource)[]>);

    return Object.entries(grouped)
      .map(([year, items]) => ({ year: parseInt(year), items }))
      .sort((a, b) => b.year - a.year); // 최신 연도가 먼저
  };

  // 현재 필터에 따라 항목 선택
  const getFilteredItems = (): (Goal | Project | Area | Resource)[] => {
    switch (filterType) {
      case 'goals':
        return archivedGoals;
      case 'projects':
        return archivedProjects;
      case 'areas':
        return archivedAreas;
      case 'resources':
        return archivedResources;
      default:
        return [...archivedGoals, ...archivedProjects, ...archivedAreas, ...archivedResources];
    }
  };

  const groupedItems = groupByYear(getFilteredItems());

  // 항목 타입 판별
  const getItemType = (item: Goal | Project | Area | Resource): string => {
    if ('timeframe' in item) return 'goal';
    if ('status' in item && ('total_todos' in item)) return 'project';
    if ('standard' in item) return 'area';
    return 'resource';
  };

  // 항목 렌더링
  const renderItem = (item: Goal | Project | Area | Resource) => {
    const itemType = getItemType(item);

    return (
      <div key={item.id} className="card bg-base-200 hover:bg-base-300 transition-colors">
        <div className="card-body p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{item.icon || '📦'}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{item.title}</h3>
                {itemType === 'goal' && <span className="badge badge-xs badge-primary">목표</span>}
                {itemType === 'project' && <span className="badge badge-xs badge-secondary">프로젝트</span>}
                {itemType === 'area' && <span className="badge badge-xs badge-accent">영역</span>}
                {itemType === 'resource' && <span className="badge badge-xs badge-info">자원</span>}
              </div>
              {'description' in item && item.description && (
                <p className="text-sm text-base-content/70 mb-2">{item.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-base-content/50">
                <span>
                  {format(new Date(item.updated_at), 'yyyy년 M월 d일', { locale: ko })} 아카이브됨
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button className="btn btn-ghost btn-sm btn-square" title="복제">
                <Copy className="w-4 h-4" />
              </button>
              <button className="btn btn-ghost btn-sm btn-square" title="복원">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="btn btn-ghost btn-sm btn-square text-error" title="완전 삭제">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const totalArchived = archivedGoals.length + archivedProjects.length + archivedAreas.length + archivedResources.length;

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold">아카이브</h1>
              <p className="text-sm text-base-content/70">
                {totalArchived}개의 보관 항목
              </p>
            </div>
            <Archive className="w-6 h-6 text-base-content/50" />
          </div>

          {/* 필터 탭 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilterType('all')}
              className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            >
              전체
            </button>
            <button
              onClick={() => setFilterType('goals')}
              className={`btn btn-sm ${filterType === 'goals' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Target className="w-4 h-4" />
              목표 ({archivedGoals.length})
            </button>
            <button
              onClick={() => setFilterType('projects')}
              className={`btn btn-sm ${filterType === 'projects' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Folder className="w-4 h-4" />
              프로젝트 ({archivedProjects.length})
            </button>
            <button
              onClick={() => setFilterType('areas')}
              className={`btn btn-sm ${filterType === 'areas' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <MapPin className="w-4 h-4" />
              영역 ({archivedAreas.length})
            </button>
            <button
              onClick={() => setFilterType('resources')}
              className={`btn btn-sm ${filterType === 'resources' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <BookOpen className="w-4 h-4" />
              자원 ({archivedResources.length})
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {groupedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-base-content/50">아카이브된 항목이 없습니다</p>
            <p className="text-sm text-base-content/30 mt-2">
              완료되거나 중단된 항목이 여기에 보관됩니다
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedItems.map((group) => (
              <div key={group.year}>
                <h2 className="text-lg font-semibold text-base-content/70 mb-3 flex items-center gap-2">
                  <Archive className="w-5 h-5" />
                  {group.year}년
                  <span className="badge badge-sm badge-ghost">{group.items.length}개</span>
                </h2>
                <div className="space-y-2">
                  {group.items.map((item) => renderItem(item))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
