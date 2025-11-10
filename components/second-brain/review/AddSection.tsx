'use client';

import { FileQuestion, FolderX } from 'lucide-react';
import { useReviewStore } from '@/lib/stores/reviewStore';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';

interface AddSectionProps {
  isExpanded: boolean;
}

const ADD_TABS = [
  { id: 'someday', label: '언젠가 할일', icon: FileQuestion },
  { id: 'inactive_projects', label: '진행중이 아닌 프로젝트', icon: FolderX },
] as const;

export default function AddSection({ isExpanded }: AddSectionProps) {
  const { addTab, setAddTab } = useReviewStore();
  const { inboxItems } = useInboxStore();

  // 언젠가 할일
  const somedayTodos = inboxItems.filter(
    (item) => item.item_type === 'todo' && item.clarification === 'someday'
  );

  if (!isExpanded) return null;

  return (
    <div className="space-y-4">
      {/* 탭 영역 */}
      <div className="tabs tabs-boxed">
        {ADD_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setAddTab(tab.id as typeof addTab)}
              className={`tab ${addTab === tab.id ? 'tab-active' : ''}`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭별 내용 */}
      <div>
        {addTab === 'someday' && (
          <div className="space-y-2">
            {somedayTodos.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">언젠가 할일이 없습니다</div>
            ) : (
              somedayTodos.map((todo) => (
                <div key={todo.id} className="p-3 bg-base-100 rounded-lg">
                  <div className="font-medium">{todo.content}</div>
                  <div className="text-xs text-base-content/60 mt-1">
                    프로젝트: {todo.project_id || '없음'} | 날짜: {todo.scheduled_date || '없음'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {addTab === 'inactive_projects' && (
          <div className="text-center py-8 text-base-content/60">진행중이 아닌 프로젝트 준비중</div>
        )}
      </div>
    </div>
  );
}
