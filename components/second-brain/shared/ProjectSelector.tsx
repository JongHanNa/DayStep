'use client';

import { useState } from 'react';
import { Folder, Plus, MoreVertical, Trash2, Check } from 'lucide-react';
import type { Project } from '@/types/second-brain';

interface ProjectSelectorProps {
  selectedProjectIds: string[];
  projects: Project[];
  onProjectsChange: (projectIds: string[]) => void;
  onCreateProject?: (title: string) => Promise<Project>;
  onUpdateProject?: (id: string, title: string) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
}

export default function ProjectSelector({
  selectedProjectIds,
  projects,
  onProjectsChange,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: ProjectSelectorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const toggleProject = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      onProjectsChange(selectedProjectIds.filter((id) => id !== projectId));
    } else {
      onProjectsChange([...selectedProjectIds, projectId]);
    }
  };

  const startEdit = (project: Project) => {
    setEditingId(project.id);
    setEditingTitle(project.title);
    setMenuOpenId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEdit = async () => {
    if (!editingId || !editingTitle.trim() || !onUpdateProject) return;
    try {
      await onUpdateProject(editingId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('프로젝트 수정 실패:', error);
    }
  };

  const handleCreate = async () => {
    if (!onCreateProject) return;
    try {
      setIsCreating(true);
      const newProject = await onCreateProject('새프로젝트');
      // 새 프로젝트 생성 후 자동 선택 및 편집 모드
      onProjectsChange([...selectedProjectIds, newProject.id]);
      setEditingId(newProject.id);
      setEditingTitle(newProject.title);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!onDeleteProject) return;
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
    try {
      await onDeleteProject(projectId);
      // 삭제 후 선택 목록에서도 제거
      onProjectsChange(selectedProjectIds.filter((id) => id !== projectId));
      setMenuOpenId(null);
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
    }
  };

  if (projects.length === 0 && !onCreateProject) {
    return (
      <div className="text-center py-6 text-sm text-base-content/60">
        프로젝트가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-base-content/60">
          {selectedProjectIds.length}개 선택됨
        </span>
        {onCreateProject && (
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="btn btn-xs btn-ghost gap-1"
            title="새 프로젝트"
          >
            <Plus className="w-3 h-3" />
            {isCreating ? '생성 중...' : '추가'}
          </button>
        )}
      </div>

      {/* 프로젝트 목록 */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {projects.map((project) => {
          const isSelected = selectedProjectIds.includes(project.id);
          const isEditing = editingId === project.id;

          return (
            <div
              key={project.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                isSelected ? 'bg-base-200' : 'bg-transparent hover:bg-base-100'
              }`}
            >
              {/* 선택 체크박스 */}
              <button
                onClick={() => toggleProject(project.id)}
                className="flex-shrink-0"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-base-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-primary-content" />}
                </div>
              </button>

              {/* 폴더 아이콘 */}
              <Folder className="w-4 h-4 text-base-content/60 flex-shrink-0" />

              {/* 제목 (편집 가능) */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="input input-xs input-bordered w-full"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => startEdit(project)}
                    className="text-left text-sm truncate w-full hover:underline"
                  >
                    {project.title}
                  </button>
                )}
              </div>

              {/* 메뉴 버튼 */}
              {onDeleteProject && !isEditing && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpenId(menuOpenId === project.id ? null : project.id)
                    }
                    className="btn btn-xs btn-ghost btn-square"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>

                  {menuOpenId === project.id && (
                    <>
                      {/* 메뉴 드롭다운 */}
                      <div className="absolute right-0 mt-1 w-32 bg-base-100 rounded-lg shadow-lg border border-base-300 z-10">
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-base-200 rounded-lg flex items-center gap-2 text-error"
                        >
                          <Trash2 className="w-3 h-3" />
                          삭제
                        </button>
                      </div>
                      {/* 메뉴 외부 클릭 시 닫기 */}
                      <div
                        className="fixed inset-0 z-0"
                        onClick={() => setMenuOpenId(null)}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
