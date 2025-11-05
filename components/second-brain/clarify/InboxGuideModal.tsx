'use client';

import { X } from 'lucide-react';
import type { InboxTabType } from './InboxTabs';

interface InboxGuideModalProps {
  open: boolean;
  onClose: () => void;
  tabType: InboxTabType;
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

export default function InboxGuideModal({ open, onClose, tabType }: InboxGuideModalProps) {
  const guide = GUIDE_CONTENT[tabType];

  if (!open) {
    return null;
  }

  return (
    <>
      {/* 모달 배경 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* 모달 콘텐츠 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{guide.icon}</span>
              <h3 className="font-bold text-lg">{guide.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 내용 */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
            <div className="prose prose-sm max-w-none">
              {guide.content}
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex justify-end p-4 border-t border-base-300">
            <button onClick={onClose} className="btn btn-primary btn-sm">
              확인
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
