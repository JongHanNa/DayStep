'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function GTDGuideSection() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: 'todo',
      title: '할일 수집함',
      icon: '⚡',
      content: (
        <ul className="space-y-2 text-sm">
          <li>• <strong>프로젝트에 해당하는 할일</strong>이면 프로젝트 배정을 먼저 해주세요.</li>
          <li>• <strong>명료화 간을 채워주세요:</strong>
            <ul className="ml-6 mt-1 space-y-1">
              <li>- <strong>다시알림:</strong> 특정 시간에 알림</li>
              <li>- <strong>언젠가:</strong> 당장은 실행할 수 없음</li>
              <li>- <strong>대기중:</strong> 위임, 즉시 수집함에서 사라짐</li>
              <li>- <strong>다음행동:</strong> 최대한 빨리 할 일 + 다음행동상황 1개 이상 선택 필수</li>
              <li>- <strong>일정:</strong> 특정 날짜가 있는 할일 + 날짜 설정 필수</li>
            </ul>
          </li>
          <li>• <strong>다음행동</strong>을 선택했다면 <strong>다음행동상황</strong>(창의성, 단순노동, Low battery, 스마트폰, 컴퓨터, 집에서, 밖에서, 어디서나, 사무실, 나중에 보기) 중 1개 이상 선택해야 수집함에서 사라집니다.</li>
        </ul>
      ),
    },
    {
      id: 'note',
      title: '노트 수집함',
      icon: '📝',
      content: (
        <ul className="space-y-2 text-sm">
          <li>• <strong>영역 또는 자원</strong> 간을 채워주세요.</li>
          <li>• 영역이나 자원을 지정하면 수집함에서 사라집니다.</li>
        </ul>
      ),
    },
    {
      id: 'project',
      title: '프로젝트 수집함',
      icon: '📂',
      content: (
        <ul className="space-y-2 text-sm">
          <li>• <strong>종료일</strong>, <strong>영역 또는 자원</strong>, <strong>할일 1개 이상</strong>을 설정해주세요.</li>
          <li>• 세 가지 조건을 모두 만족하면 수집함에서 사라지고 진행중인 프로젝트로 이동합니다.</li>
          <li>• 상태(진행중, 중단 등)는 수집함 제거 조건과 무관합니다.</li>
        </ul>
      ),
    },
    {
      id: 'goal',
      title: '목표 수집함',
      icon: '🎯',
      content: (
        <ul className="space-y-2 text-sm">
          <li>• <strong>영역</strong>, <strong>자원</strong>, <strong>종료일</strong> 간을 채워주세요.</li>
          <li>• 조건을 만족하면 수집함에서 사라집니다.</li>
        </ul>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-warning" />
        <h2 className="text-xl font-bold">GTD 알고리즘</h2>
      </div>

      <div className="card bg-warning/10 border border-warning/30">
        <div className="card-body py-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            수집함이 비워지는 조건
          </h3>
          <p className="text-sm text-base-content/70">
            각 수집함 탭에 있는 항목들을 아래 조건에 따라 처리하면 자동으로 수집함에서 제거됩니다.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id;
          return (
            <div key={section.id} className="card bg-base-200">
              <div className="card-body p-4">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{section.icon}</span>
                    <h3 className="font-semibold">{section.title}</h3>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-base-content/50" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-base-content/50" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-base-300">
                    {section.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
