'use client';

import { useState, useEffect } from 'react';
import { Info, Lock, Unlock } from 'lucide-react';
import type { InboxTabType } from './InboxTabs';

const STORAGE_KEY = 'daystep_inbox_guide_hover_enabled';

interface InboxGuidePopoverProps {
  activeTab: InboxTabType;
}

// GTDGuideSection에서 추출한 가이드 데이터
const GUIDE_CONTENT: Record<InboxTabType, {
  title: string;
  icon: string;
  content: React.ReactNode;
}> = {
  todos: {
    title: '할일 수집함',
    icon: '⚡',
    content: (
      <ul className="space-y-2 text-sm">
        <li>• <strong>프로젝트에 해당하는 할일</strong>이면 프로젝트 배정을 먼저 해주세요.</li>
        <li>• <strong>명료화 유형을 선택해주세요:</strong>
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
  notes: {
    title: '노트 수집함',
    icon: '📝',
    content: (
      <ul className="space-y-2 text-sm">
        <li>• <strong>영역 또는 자원</strong> 간을 채워주세요.</li>
        <li>• 영역이나 자원을 지정하면 수집함에서 사라집니다.</li>
      </ul>
    ),
  },
  projects: {
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
  goals: {
    title: '목표 수집함',
    icon: '🎯',
    content: (
      <ul className="space-y-2 text-sm">
        <li>• <strong>영역</strong>, <strong>자원</strong>, <strong>종료일</strong> 간을 채워주세요.</li>
        <li>• 조건을 만족하면 수집함에서 사라집니다.</li>
      </ul>
    ),
  },
};

// 활성 탭에 따른 가이드 버튼 라벨
const GUIDE_LABELS: Record<InboxTabType, string> = {
  todos: '할일 비우기 가이드',
  notes: '노트 비우기 가이드',
  projects: '프로젝트 비우기 가이드',
  goals: '목표 비우기 가이드',
};

export default function InboxGuidePopover({ activeTab }: InboxGuidePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [enableHoverOpen, setEnableHoverOpen] = useState(true);
  const guide = GUIDE_CONTENT[activeTab];

  // localStorage에서 호버 설정 불러오기
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setEnableHoverOpen(stored === 'true');
    }
  }, []);

  // 호버 설정 변경 시 localStorage에 저장
  const toggleHoverOpen = () => {
    const newValue = !enableHoverOpen;
    setEnableHoverOpen(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  };

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative inline-block my-3">
      <div className="flex items-center gap-2">
        {/* 가이드 버튼 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => enableHoverOpen && setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-300/50 rounded-lg transition-colors"
          aria-label="가이드 보기"
          aria-expanded={isOpen}
        >
          <Info className="w-4 h-4" />
          <span>{GUIDE_LABELS[activeTab]}</span>
        </button>

        {/* 호버 토글 버튼 */}
        <button
          onClick={toggleHoverOpen}
          className="flex items-center gap-1.5 px-2 py-2 text-xs text-base-content/60 hover:text-base-content hover:bg-base-300/50 rounded-lg transition-colors"
          aria-label={enableHoverOpen ? '호버 열림 끄기' : '호버 열림 켜기'}
          title={enableHoverOpen ? '호버 열림 끄기' : '호버 열림 켜기'}
        >
          {enableHoverOpen ? (
            <>
              <Unlock className="w-4 h-4" />
              <span>호버 열기 ON</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>호버 열기 OFF</span>
            </>
          )}
        </button>
      </div>

      {/* 팝오버 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 - 클릭 시 닫기 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* 팝오버 콘텐츠 */}
          <div
            className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-base-300 z-50 w-[90vw] max-w-[500px] max-sm:w-[90vw] md:w-[500px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
          >
            {/* 헤더 */}
            <div className="flex items-center gap-2 p-4 border-b border-base-300">
              <span className="text-2xl">{guide.icon}</span>
              <h3 id="guide-title" className="font-bold text-lg">{guide.title}</h3>
            </div>

            {/* 내용 */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                {guide.content}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
