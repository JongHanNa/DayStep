'use client';

import { useState, useEffect } from 'react';
import { FileQuestion, FolderX } from 'lucide-react';
import { useReviewStore } from '@/lib/stores/reviewStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSomedayTodos } from '@/lib/supabase/inbox';
import type { InboxItem, Project } from '@/types/second-brain';

interface AddSectionProps {
  isExpanded: boolean;
}

const ADD_TABS = [
  { id: 'someday', label: '언젠가 할일', icon: FileQuestion },
  { id: 'inactive_projects', label: '진행중이 아닌 프로젝트', icon: FolderX },
] as const;

// 프로젝트 상태 라벨
const getProjectStatusLabel = (status?: string): string => {
  const labelMap: Record<string, string> = {
    not_started: '시작 전',
    in_progress: '진행중',
    paused: '일시중지',
    completed: '완료',
  };
  return labelMap[status || ''] || status || '';
};

export default function AddSection({ isExpanded }: AddSectionProps) {
  const { user } = useAuth();
  const { addTab, setAddTab } = useReviewStore();
  const { projects } = useProjectStore();

  // 언젠가 할일 상태 (DB에서 직접 조회)
  const [somedayTodos, setSomedayTodos] = useState<InboxItem[]>([]);

  // 언젠가 할일 데이터 로드
  useEffect(() => {
    const loadSomedayTodos = async () => {
      if (!user) return;

      try {
        const todos = await fetchSomedayTodos(user.id);
        const items: InboxItem[] = todos.map((todo) => ({
          id: todo.id,
          user_id: user.id,
          content: todo.title,
          status: 'inbox',
          item_type: 'todo' as const,
          clarification: todo.clarification || '',
          scheduled_date: todo.start_time || undefined,
          schedule_type: todo.schedule_type || 'none',
          is_highlight: todo.is_today_highlight || false,
          is_completed: todo.completed || false,
          next_action_status: '',
          next_action_context_ids: todo.next_action_context_ids || [],
          recurrence_pattern: todo.recurrence_pattern || 'none',
          project_id: todo.todo_projects?.[0]?.project_id || undefined,
          created_at: todo.created_at,
          updated_at: todo.updated_at,
        }));
        setSomedayTodos(items);
      } catch (error) {
        console.error('언젠가 할일 로드 실패:', error);
      }
    };

    loadSomedayTodos();
  }, [user]);

  // 진행중이 아닌 프로젝트 필터링 (not_started, paused, completed)
  const inactiveProjects = projects.filter(
    (project) => project.status !== 'in_progress'
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
      <div className="mt-4 bg-base-200 rounded-lg p-4">
        {addTab === 'someday' && (
          <div className="space-y-2">
            {somedayTodos.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">언젠가 할일이 없습니다</div>
            ) : (
              somedayTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="p-3 bg-base-100 rounded-lg cursor-pointer hover:bg-base-300 transition-colors"
                >
                  <div className="font-medium">{todo.content}</div>
                  <div className="text-xs text-base-content/60 mt-1">
                    프로젝트: {todo.project_id || '없음'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {addTab === 'inactive_projects' && (
          <div className="space-y-2">
            {inactiveProjects.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">
                진행중이 아닌 프로젝트가 없습니다
              </div>
            ) : (
              inactiveProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-base-100 rounded-lg cursor-pointer hover:bg-base-300 transition-colors"
                >
                  <div className="font-medium">{project.title}</div>
                  <div className="text-xs text-base-content/60 mt-1">
                    상태: {getProjectStatusLabel(project.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
