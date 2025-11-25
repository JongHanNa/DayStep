'use client';

import { useState, useEffect } from 'react';
import { FileQuestion, FolderX } from 'lucide-react';
import { useReviewStore } from '@/lib/stores/reviewStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSomedayTodos, updateInboxTodo } from '@/lib/supabase/inbox';
import { updateTodoProjects } from '@/lib/supabase/todo-projects';
import { updateTodoNotes } from '@/lib/supabase/todo-notes';
import { linkProjectNote } from '@/lib/supabase/project-notes';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import type { InboxItem, Project, UpdateProjectInput } from '@/types/second-brain';

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
  const { projects, createProject, updateProject, deleteProject } = useProjectStore();
  const { notes, createNote, deleteNote } = useNoteStore();
  const { areas } = useAreaStore();
  const { resources } = useResourceStore();

  // 언젠가 할일 상태 (DB에서 직접 조회)
  const [somedayTodos, setSomedayTodos] = useState<InboxItem[]>([]);

  // TodoEditModal 상태
  const [editingTodo, setEditingTodo] = useState<InboxItem | null>(null);
  const [todoForm, setTodoForm] = useState<TodoFormData | null>(null);

  // ProjectEditDialog 상태
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  // 언젠가 할일 데이터 로드
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

  useEffect(() => {
    loadSomedayTodos();
  }, [user]);

  // 진행중이 아닌 프로젝트 필터링 (not_started, paused, completed)
  const inactiveProjects = projects.filter(
    (project) => project.status !== 'in_progress'
  );

  // 프로젝트 이름 조회
  const getProjectName = (projectId?: string): string => {
    if (!projectId) return '없음';
    const project = projects.find(p => p.id === projectId);
    return project?.title || '없음';
  };

  // 할일 클릭 핸들러
  const handleTodoClick = (todo: InboxItem) => {
    const latestTodo = somedayTodos.find((item) => item.id === todo.id);
    const todoToEdit = latestTodo || todo;

    setEditingTodo(todoToEdit);
    setTodoForm({
      title: todoToEdit.content,
      clarification: todoToEdit.clarification,
      nextActionStatuses: todoToEdit.next_action_status ? [todoToEdit.next_action_status] : [],
      nextActionContextIds: todoToEdit.next_action_context_ids || [],
      scheduledDate: todoToEdit.scheduled_date ? new Date(todoToEdit.scheduled_date) : undefined,
      isHighlight: todoToEdit.is_highlight || false,
      completed: todoToEdit.is_completed || false,
      projectIds: todoToEdit.project_id ? [todoToEdit.project_id] : [],
      noteIds: [],
      icon: todoToEdit.icon,
      color: todoToEdit.color || '#DBAC6C',
    });
  };

  // 할일 저장 핸들러
  const handleSaveTodo = async (updatedTodo: TodoFormData) => {
    if (!editingTodo || !user) return;

    try {
      await updateInboxTodo(user.id, editingTodo.id, {
        title: updatedTodo.title,
        clarification: updatedTodo.clarification,
        next_action_context_ids: updatedTodo.nextActionContextIds || undefined,
        scheduled_date: updatedTodo.scheduledDate
          ? (() => {
              const dateStr = updatedTodo.scheduledDate.toISOString().split('T')[0];
              if (updatedTodo.scheduleType === 'timed' && updatedTodo.startTime) {
                return new Date(`${dateStr}T${updatedTodo.startTime}:00+09:00`).toISOString();
              }
              return new Date(`${dateStr}T00:00:00+09:00`).toISOString();
            })()
          : undefined,
        is_today_highlight: updatedTodo.isHighlight,
        completed: updatedTodo.completed,
        project_id: updatedTodo.projectIds?.[0],
        schedule_type: updatedTodo.scheduleType,
      });

      await loadSomedayTodos();
      setEditingTodo(null);
      setTodoForm(null);
    } catch (error) {
      console.error('할일 저장 실패:', error);
      alert('할일 저장에 실패했습니다.');
    }
  };

  // 프로젝트 관련 핸들러
  const handleCreateProject = async (title: string) => {
    if (!user) throw new Error('User not authenticated');
    return await createProject(user.id, {
      title,
      description: '',
      status: 'not_started',
      color: '#6366f1',
      order_index: projects.length,
    });
  };

  const handleUpdateProject = async (id: string, title: string) => {
    if (!user) throw new Error('User not authenticated');
    await updateProject(user.id, id, { title });
  };

  const handleDeleteProject = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    await deleteProject(user.id, id);
  };

  // 노트 관련 핸들러
  const handleCreateNote = async (title: string) => {
    if (!user) throw new Error('User not found');

    const newNote = await createNote(user.id, {
      title,
      content: '',
      note_category: 'work_in_progress',
      is_pinned: false,
    });

    if (editingTodo?.project_id && newNote.id) {
      try {
        await linkProjectNote(editingTodo.project_id, newNote.id);
      } catch (error) {
        console.error('노트-프로젝트 연결 실패:', error);
      }
    }

    return newNote;
  };

  const handleUpdateNote = async (id: string) => {
    // Note 업데이트는 NoteEdit 모달에서 처리
  };

  const handleDeleteNote = async (id: string) => {
    if (!user) throw new Error('User not found');
    await deleteNote(id, user.id);
  };

  // 프로젝트 즉시 저장 핸들러
  const handleProjectImmediateSave = async (projectIds: string[]) => {
    if (!editingTodo?.id || !user) return;
    try {
      await updateTodoProjects(editingTodo.id, projectIds, user.id);
      await loadSomedayTodos();
    } catch (error) {
      console.error('프로젝트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 노트 즉시 저장 핸들러
  const handleNoteImmediateSave = async (noteIds: string[]) => {
    if (!editingTodo?.id || !user) return;
    try {
      await updateTodoNotes(editingTodo.id, noteIds, user.id);
      await loadSomedayTodos();
    } catch (error) {
      console.error('노트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 프로젝트 클릭 핸들러
  const handleProjectClick = (project: Project) => {
    let paraSelection = '';
    if (project.area_resource_id) {
      const isArea = areas.some((a) => a.id === project.area_resource_id);
      if (isArea) {
        paraSelection = `area-${project.area_resource_id}`;
      } else {
        paraSelection = `resource-${project.area_resource_id}`;
      }
    }

    setEditingProject({
      ...project,
      start_date: project.start_date?.split('T')[0],
      end_date: project.end_date?.split('T')[0],
      paraSelection,
    });
    setProjectDialogOpen(true);
  };

  // 프로젝트 저장 핸들러
  const handleSaveProject = async (projectData: Partial<Project>) => {
    if (!user || !editingProject) return;

    try {
      await updateProject(user.id, editingProject.id, projectData as UpdateProjectInput);
      setProjectDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('프로젝트 저장 실패:', error);
      alert('프로젝트 저장에 실패했습니다.');
    }
  };

  // 프로젝트 삭제 핸들러
  const handleDeleteProjectDialog = async (project: Project) => {
    if (!user) return;
    await deleteProject(user.id, project.id);
    setProjectDialogOpen(false);
    setEditingProject(null);
  };

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
                  onClick={() => handleTodoClick(todo)}
                >
                  <div className="font-medium">{todo.content}</div>
                  <div className="text-xs text-base-content/60 mt-1">
                    프로젝트: {getProjectName(todo.project_id)}
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
                  onClick={() => handleProjectClick(project)}
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

      {/* 할일 편집 모달 */}
      <TodoEditModal
        open={editingTodo !== null && todoForm !== null}
        todo={todoForm}
        onClose={() => {
          setEditingTodo(null);
          setTodoForm(null);
        }}
        onSave={handleSaveTodo}
        onChange={(updated) => setTodoForm(todoForm ? { ...todoForm, ...updated } : null)}
        projects={projects}
        notes={notes}
        areas={areas}
        resources={resources}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onCreateNote={handleCreateNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        todoId={editingTodo?.id}
        userId={user?.id}
        onProjectImmediateSave={handleProjectImmediateSave}
        onNoteImmediateSave={handleNoteImmediateSave}
      />

      {/* 프로젝트 편집 모달 */}
      <ProjectEditDialog
        open={projectDialogOpen}
        editingProject={editingProject}
        onSave={handleSaveProject}
        onCancel={() => {
          setProjectDialogOpen(false);
          setEditingProject(null);
        }}
        onDelete={handleDeleteProjectDialog}
        onProjectChange={setEditingProject}
      />
    </div>
  );
}
