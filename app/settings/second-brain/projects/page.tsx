'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { Plus, X, Pencil, ArrowLeft } from 'lucide-react';
import type { CreateProjectInput, Project } from '@/types/second-brain';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';

export default function ProjectsSettingsPage() {
  const router = useRouter();
  const { createProject, updateProject, deleteProject, projects, fetchProjects } = useProjectStore();

  // 편집 관련 state
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 새 프로젝트 추가 핸들러
  const handleAddProject = () => {
    setEditingProject({
      id: '',
      title: '',
      description: '',
      icon: 'lucide-FolderOpen',
      color: '#A8DADC',
      order_index: projects.length,
      is_archived: false,
      created_at: '',
      updated_at: '',
      user_id: '',
      isNew: true,
    });
    setEditDialogOpen(true);
  };

  // 프로젝트 편집 핸들러
  const handleEditProject = (project: Project) => {
    setEditingProject({ ...project, isNew: false });
    setEditDialogOpen(true);
  };

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingProject) {
      setEditingProject({ ...editingProject, icon: iconKey });
    }
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    if (editingProject) {
      const color = getColorById(colorId).hex;
      setEditingProject({ ...editingProject, color });
    }
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingProject || !editingProject.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      if (editingProject.isNew) {
        // 새 프로젝트 생성
        const projectData: CreateProjectInput = {
          title: editingProject.title,
          description: editingProject.description || '',
          icon: editingProject.icon,
          color: editingProject.color,
          order_index: projects.length,
          is_archived: false,
        };
        await createProject(projectData);
      } else {
        // 기존 프로젝트 수정
        await updateProject(editingProject.id, {
          title: editingProject.title,
          description: editingProject.description || '',
          icon: editingProject.icon,
          color: editingProject.color,
        });
      }

      setEditDialogOpen(false);
      setEditingProject(null);
      await fetchProjects();
    } catch (error) {
      console.error('프로젝트 저장 실패:', error);
      alert('프로젝트 저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingProject(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
      await fetchProjects();
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">프로젝트 (Projects)</h1>
              <p className="text-sm text-base-content/70">
                진행 중인 프로젝트를 관리하세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 프로젝트 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">프로젝트 목록 ({projects.length}개)</h2>
            <button onClick={handleAddProject} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              새 프로젝트 추가
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 프로젝트가 없습니다. 새 프로젝트를 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => {
                const IconComponent = getUnifiedIcon(project.icon as UnifiedIconKey).component;
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: project.color + '30',
                          borderColor: project.color,
                          borderWidth: '2px',
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: project.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{project.title}</div>
                        {project.description && (
                          <div className="text-sm text-base-content/60">{project.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProject(project)}
                        className="btn btn-ghost btn-sm btn-circle"
                        aria-label="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(project)}
                        className="btn btn-ghost btn-sm btn-circle text-error"
                        aria-label="삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 편집/추가 다이얼로그 */}
      {editDialogOpen && editingProject && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingProject.isNew ? '새 프로젝트 추가' : '프로젝트 편집'}
            </h3>

            {/* 아이콘 및 색상 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">아이콘 및 색상</span>
              </label>
              <button
                type="button"
                onClick={() => setIconBrowserOpen(true)}
                className="btn btn-outline w-full justify-start"
                style={{
                  backgroundColor: editingProject.color + '20',
                  borderColor: editingProject.color,
                }}
              >
                {(() => {
                  const IconComponent = getUnifiedIcon(editingProject.icon as UnifiedIconKey).component;
                  return <IconComponent className="w-6 h-6 mr-2" />;
                })()}
                <span>변경하기</span>
              </button>
            </div>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={editingProject.title}
                onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 웹사이트 리뉴얼"
              />
            </div>

            {/* 설명 */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">설명</span>
              </label>
              <textarea
                value={editingProject.description || ''}
                onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                className="textarea textarea-bordered h-20"
                placeholder="예: 회사 웹사이트 디자인 및 기능 개선"
              />
            </div>

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelEdit} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveEdit} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && projectToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">프로젝트 삭제</h3>
            <p className="mb-6">
              <strong>{projectToDelete.title}</strong> 프로젝트를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-base-content/60">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="modal-action">
              <button onClick={handleCancelDelete} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-error">
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelDelete} />
        </dialog>
      )}

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingProject?.icon}
        selectedColor={editingProject?.color}
        onColorSelect={handleColorChange}
      />
    </div>
  );
}
