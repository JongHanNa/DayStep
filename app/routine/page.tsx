'use client';

import { useState } from 'react';
import { ChevronDown, Target, Layers, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { AuthGuard } from '@/components/auth/AuthGuard';

// 탭 타입
type TabType = 'responsibility' | 'resource' | 'goal';

// 반복 주기 타입
type RepeatCycle = '매일' | '매주' | '매월';

// 반복 할일 아이템
interface RoutineItem {
  id: string;
  title: string;
  repeatCycle: RepeatCycle;
}

// 그룹 데이터
interface RoutineGroup {
  id: string;
  name: string;
  color: string;
  items: RoutineItem[];
}

// 목데이터
const mockData: Record<TabType, RoutineGroup[]> = {
  responsibility: [
    {
      id: 'team-leader',
      name: '팀 리더',
      color: '#8b5cf6',
      items: [
        { id: '1', title: '주간 회의', repeatCycle: '매주' },
        { id: '2', title: '성과 리뷰', repeatCycle: '매월' },
        { id: '3', title: '팀원 1:1 미팅', repeatCycle: '매주' },
      ],
    },
    {
      id: 'mentor',
      name: '멘토',
      color: '#ec4899',
      items: [
        { id: '4', title: '1:1 미팅', repeatCycle: '매주' },
        { id: '5', title: '피드백 작성', repeatCycle: '매주' },
      ],
    },
    {
      id: 'parent',
      name: '부모',
      color: '#f59e0b',
      items: [
        { id: '6', title: '아이 숙제 확인', repeatCycle: '매일' },
        { id: '7', title: '주말 나들이 계획', repeatCycle: '매주' },
      ],
    },
  ],
  resource: [
    {
      id: 'office',
      name: '사무실',
      color: '#3b82f6',
      items: [
        { id: '8', title: '청소', repeatCycle: '매주' },
        { id: '9', title: '비품 점검', repeatCycle: '매월' },
      ],
    },
    {
      id: 'car',
      name: '차량',
      color: '#10b981',
      items: [
        { id: '10', title: '세차', repeatCycle: '매주' },
        { id: '11', title: '정비', repeatCycle: '매월' },
        { id: '12', title: '주유', repeatCycle: '매주' },
      ],
    },
    {
      id: 'home',
      name: '집',
      color: '#f97316',
      items: [
        { id: '13', title: '청소', repeatCycle: '매주' },
        { id: '14', title: '장보기', repeatCycle: '매주' },
      ],
    },
  ],
  goal: [
    {
      id: 'health',
      name: '건강',
      color: '#22c55e',
      items: [
        { id: '15', title: '운동', repeatCycle: '매일' },
        { id: '16', title: '식단 기록', repeatCycle: '매일' },
        { id: '17', title: '건강검진', repeatCycle: '매월' },
      ],
    },
    {
      id: 'study',
      name: '학습',
      color: '#6366f1',
      items: [
        { id: '18', title: '영어 공부', repeatCycle: '매일' },
        { id: '19', title: '독서', repeatCycle: '매일' },
        { id: '20', title: '온라인 강의', repeatCycle: '매주' },
      ],
    },
    {
      id: 'finance',
      name: '재정',
      color: '#eab308',
      items: [
        { id: '21', title: '가계부 작성', repeatCycle: '매주' },
        { id: '22', title: '투자 포트폴리오 점검', repeatCycle: '매월' },
      ],
    },
  ],
};

// 아코디언 그룹 컴포넌트
function RoutineAccordionGroup({ group }: { group: RoutineGroup }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-b border-base-300 last:border-b-0">
      {/* 헤더 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          {/* 색상 인디케이터 */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.color }}
          />
          {/* 그룹명 */}
          <span className="font-semibold text-base">{group.name}</span>
          {/* 개수 뱃지 */}
          <span className="badge badge-sm">{group.items.length}</span>
        </div>
        {/* 펼치기 아이콘 */}
        <ChevronDown
          className={cn(
            'w-5 h-5 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* 할일 목록 */}
      {isOpen && (
        <div className="px-4 pb-3 space-y-2">
          {group.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-base-200"
            >
              {/* 제목 */}
              <span className="text-sm">{item.title}</span>
              {/* 반복 주기 뱃지 */}
              <span className="badge badge-ghost badge-sm">{item.repeatCycle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoutinePage() {
  const [selectedTab, setSelectedTab] = useState<TabType>('responsibility');

  const tabs: { id: TabType; label: string; icon: typeof Target; color: string }[] = [
    { id: 'responsibility', label: '책임', icon: Target, color: '#8b5cf6' },
    { id: 'resource', label: '자원', icon: Layers, color: '#3b82f6' },
    { id: 'goal', label: '목표', icon: Compass, color: '#22c55e' },
  ];

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-100 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
            <h1 className="text-2xl font-bold">루틴</h1>
            <p className="text-sm text-base-content/70 mt-1">
              일상적으로 반복하는 할일 관리
            </p>
          </div>

          {/* 탭 */}
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full transition-all',
                      isActive
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-200 hover:opacity-80'
                    )}
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? undefined : tab.color }} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="max-w-3xl mx-auto">
          {/* 아코디언 리스트 */}
          <div className="bg-base-100">
            {mockData[selectedTab].map((group) => (
              <RoutineAccordionGroup key={group.id} group={group} />
            ))}
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <SecondBrainBottomNav />
      </div>
    </AuthGuard>
  );
}
