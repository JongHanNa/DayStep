'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import type { InboxTabType } from './InboxTabs';

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
      <div className="space-y-3">
        {/* 1단계: 프로젝트 배정 */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">1️⃣</span>
            <strong className="text-sm">프로젝트 배정</strong>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 ml-7">
            프로젝트에 해당하는 할일이면 프로젝트 배정을 먼저 해주세요
          </p>
          {/* 사용 방법 */}
          <div className="ml-7 mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded border border-dashed border-blue-300 dark:border-blue-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-blue-600 dark:text-blue-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                <strong>사용 방법:</strong> 할일 카드 클릭 → &quot;프로젝트&quot; 드롭다운에서 선택
              </div>
            </div>
          </div>
        </div>

        {/* 2단계: 명료화 유형 선택 */}
        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">2️⃣</span>
            <strong className="text-sm">명료화 유형 선택</strong>
          </div>
          <div className="ml-7 space-y-2">
            {/* 임시 숨김: 다시알림 가이드
            <div className="flex items-start gap-2">
              <span className="text-xs">⏰</span>
              <div className="flex-1">
                <strong className="text-xs">다시알림</strong>
                <p className="text-xs text-gray-600 dark:text-gray-400">특정 시간에 알림</p>
              </div>
            </div>
            */}
            <div className="flex items-start gap-2">
              <span className="text-xs">⏳</span>
              <div className="flex-1">
                <strong className="text-xs">언젠가</strong>
                <p className="text-xs text-gray-600 dark:text-gray-400">당장은 실행할 수 없음</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs">⏸️</span>
              <div className="flex-1">
                <strong className="text-xs">대기중</strong>
                <p className="text-xs text-gray-600 dark:text-gray-400">타인에게 위임, 응답 대기 중. 당장은 날짜나 시간을 넣기에 불명확하지만 나중에 계획 페이지에서 날짜를 지정해줄 수 있음 (즉시 수집함에서 사라짐)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs">⚡</span>
              <div className="flex-1">
                <strong className="text-xs">다음행동</strong>
                <p className="text-xs text-gray-600 dark:text-gray-400">특정 상황이 되면 할 일. 당장은 날짜나 시간을 넣기에 불명확하지만 나중에 계획 페이지에서 날짜를 지정해줄 수 있음 (다음행동상황 1개 이상 선택 시 수집함에서 사라짐)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs">📅</span>
              <div className="flex-1">
                <strong className="text-xs">일정</strong>
                <p className="text-xs text-gray-600 dark:text-gray-400">당장 날짜나 시간을 넣기에 명확한 할일 (날짜 설정 시 수집함에서 사라짐)</p>
              </div>
            </div>
          </div>
          {/* 사용 방법 */}
          <div className="ml-7 mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded border border-dashed border-green-300 dark:border-green-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-green-600 dark:text-green-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300 space-y-1">
                <div><strong>사용 방법:</strong> 할일 카드 클릭 → &quot;명료화 유형&quot; 드롭다운에서 선택</div>
                <div className="text-xs">• <strong>일정</strong> 선택 시 → 시간/날짜 설정 화면 표시</div>
                <div className="text-xs">• <strong>다음행동</strong> 선택 시 → 3단계 다음행동상황 선택 필요</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3단계: 다음행동상황 선택 */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">3️⃣</span>
            <strong className="text-sm">다음행동상황 선택</strong>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 ml-7">
            <strong>다음행동</strong>을 선택한 경우, 다음행동상황(창의성, 단순노동, Low battery, 스마트폰, 컴퓨터, 집에서, 밖에서, 어디서나, 사무실, 나중에 보기) 중 1개 이상 선택해야 수집함에서 사라집니다
          </p>
          {/* 사용 방법 */}
          <div className="ml-7 mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded border border-dashed border-amber-300 dark:border-amber-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-amber-600 dark:text-amber-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                <strong>사용 방법:</strong> 할일 편집 화면 하단에 &quot;다음행동상황&quot; 체크박스 표시 → 1개 이상 선택 후 저장
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  notes: {
    title: '노트 수집함',
    icon: '📝',
    content: (
      <div className="space-y-3">
        {/* 필수 조건 */}
        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-500">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">✅</span>
            <strong className="text-sm">수집함 제거 조건</strong>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 ml-7 mb-2">
            <strong>영역</strong> 또는 <strong>자원</strong> 중 하나를 지정하세요
          </p>
          <div className="ml-7 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-2">
            <span>→</span>
            <span>지정하면 수집함에서 사라집니다</span>
          </div>
          {/* 사용 방법 */}
          <div className="ml-7 p-2 bg-purple-100 dark:bg-purple-900/30 rounded border border-dashed border-purple-300 dark:border-purple-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-purple-600 dark:text-purple-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                <strong>사용 방법:</strong> 노트 카드 클릭 → &quot;영역&quot; 또는 &quot;자원&quot; 드롭다운에서 선택 후 저장
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  projects: {
    title: '프로젝트 수집함',
    icon: '📂',
    content: (
      <div className="space-y-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
          <strong>3가지 조건</strong>을 모두 만족하면 수집함에서 사라지고 진행중인 프로젝트로 이동합니다
        </p>

        {/* 조건 1: 종료일 */}
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border-l-4 border-rose-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📅</span>
            <strong className="text-sm">종료일 설정</strong>
          </div>
          <div className="ml-7 p-2 bg-rose-100 dark:bg-rose-900/30 rounded border border-dashed border-rose-300 dark:border-rose-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-rose-600 dark:text-rose-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                프로젝트 카드 클릭 → &quot;종료일&quot; 날짜 선택
              </div>
            </div>
          </div>
        </div>

        {/* 조건 2: 영역 또는 자원 */}
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border-l-4 border-indigo-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🏷️</span>
            <strong className="text-sm">영역 또는 자원 지정</strong>
          </div>
          <div className="ml-7 p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded border border-dashed border-indigo-300 dark:border-indigo-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-indigo-600 dark:text-indigo-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                프로젝트 카드 클릭 → &quot;영역&quot; 또는 &quot;자원&quot; 드롭다운에서 선택
              </div>
            </div>
          </div>
        </div>

        {/* 조건 3: 할일 1개 이상 */}
        <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg border-l-4 border-teal-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">✓</span>
            <strong className="text-sm">할일 1개 이상 추가</strong>
          </div>
          <div className="ml-7 p-2 bg-teal-100 dark:bg-teal-900/30 rounded border border-dashed border-teal-300 dark:border-teal-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-teal-600 dark:text-teal-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                프로젝트 카드 클릭 → &quot;할일 추가&quot; 버튼 클릭 → 할일 입력 후 저장
              </div>
            </div>
          </div>
        </div>

        {/* 참고 사항 */}
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
          💡 상태(진행중, 중단 등)는 수집함 제거 조건과 무관합니다
        </div>
      </div>
    ),
  },
  goals: {
    title: '목표 수집함',
    icon: '🎯',
    content: (
      <div className="space-y-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
          <strong>3가지 조건</strong>을 모두 만족하면 수집함에서 사라집니다
        </p>

        {/* 조건 1: 영역 */}
        <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border-l-4 border-cyan-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🏢</span>
            <strong className="text-sm">영역 지정</strong>
          </div>
          <div className="ml-7 p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded border border-dashed border-cyan-300 dark:border-cyan-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-cyan-600 dark:text-cyan-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                목표 카드 클릭 → &quot;영역&quot; 드롭다운에서 선택
              </div>
            </div>
          </div>
        </div>

        {/* 조건 2: 자원 */}
        <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-lg border-l-4 border-violet-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📚</span>
            <strong className="text-sm">자원 지정</strong>
          </div>
          <div className="ml-7 p-2 bg-violet-100 dark:bg-violet-900/30 rounded border border-dashed border-violet-300 dark:border-violet-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-violet-600 dark:text-violet-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                목표 카드 클릭 → &quot;자원&quot; 드롭다운에서 선택
              </div>
            </div>
          </div>
        </div>

        {/* 조건 3: 종료일 */}
        <div className="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg border-l-4 border-pink-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📅</span>
            <strong className="text-sm">종료일 설정</strong>
          </div>
          <div className="ml-7 p-2 bg-pink-100 dark:bg-pink-900/30 rounded border border-dashed border-pink-300 dark:border-pink-700">
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-pink-600 dark:text-pink-400">💡</span>
              <div className="flex-1 text-gray-700 dark:text-gray-300">
                목표 카드 클릭 → &quot;종료일&quot; 날짜 선택
              </div>
            </div>
          </div>
        </div>
      </div>
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
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const guide = GUIDE_CONTENT[activeTab];

  // 클라이언트 사이드 마운트 확인 (Portal용)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 팝오버 위치 계산
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const popoverWidth = Math.min(500, viewportWidth * 0.9);

      // 좌측 위치 계산 (우측 경계 벗어남 방지)
      let left = rect.left;
      if (left + popoverWidth > viewportWidth - 16) {
        left = viewportWidth - popoverWidth - 16;
      }
      left = Math.max(16, left);

      // 상단 위치: 항상 버튼 바로 아래 (버튼을 가리지 않음)
      const top = rect.bottom + 8;

      setPopoverPosition({ top, left });
    }
  }, [isOpen]);

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

  // 드래그 시작 핸들러
  const handleDragStart = (e: React.MouseEvent) => {
    // 닫기 버튼 클릭 시 드래그 시작하지 않음
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - popoverPosition.left,
      y: e.clientY - popoverPosition.top,
    });
    e.preventDefault(); // 텍스트 선택 방지
  };

  // 드래그 중 처리
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popoverWidth = Math.min(500, viewportWidth * 0.9);

      let newLeft = e.clientX - dragOffset.x;
      let newTop = e.clientY - dragOffset.y;

      // 화면 경계 제한
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - popoverWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - 100));

      setPopoverPosition({ top: newTop, left: newLeft });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div className="inline-block my-3" ref={buttonRef}>
      {/* 가이드 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-300/50 rounded-lg transition-colors"
        aria-label="가이드 보기"
        aria-expanded={isOpen}
      >
        <Info className="w-4 h-4" />
        <span>{GUIDE_LABELS[activeTab]}</span>
      </button>

      {/* 팝오버 - Portal로 body에 렌더링 */}
      {mounted && isOpen && createPortal(
        <>
          {/* 배경 오버레이 - 클릭 시 닫기 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* 팝오버 콘텐츠 */}
          <div
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
            className="fixed bg-white dark:bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 w-[90vw] max-w-[500px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
          >
            {/* 헤더 - 드래그 핸들 */}
            <div
              className="flex items-center justify-between p-4 border-b border-base-300 cursor-move select-none"
              onMouseDown={handleDragStart}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{guide.icon}</span>
                <h3 id="guide-title" className="font-bold text-lg">{guide.title}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-base-300 rounded-lg transition-colors"
                aria-label="가이드 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 내용 */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                {guide.content}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
