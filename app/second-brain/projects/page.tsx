'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { Plus } from 'lucide-react';
import ProjectGoalSection from '@/components/second-brain/ProjectGoalSection';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import type { CreateProjectInput, UpdateProjectInput, Project } from '@/types/second-brain';
import { Sheet } from 'react-modal-sheet';
import { createModalConfig } from '@/lib/modal-config';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';

export default function ProjectsPage() {
  const { appUser } = useAuth();
  const { projects, fetchProjects, createProject, updateProject, deleteProject } = useProjectStore();
  const { fetchInboxItems } = useInboxStore();
  const { goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();

  const [isCreating, setIsCreating] = useState(false);

  // 접기/펼치기 상태 관리 (기본: 모두 접힘)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  // 편집 관련 state
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/projects');
  }, []);

  useEffect(() => {
    if (appUser?.id) {
      fetchProjects(appUser.id);
      if (appUser?.id) fetchInboxItems(appUser.id);
      fetchGoals(appUser.id);
      fetchAreas(appUser.id);
      fetchResources(appUser.id);
    }
  }, [appUser?.id, fetchProjects, fetchInboxItems, fetchGoals, fetchAreas, fetchResources]);

  // 초기 로딩 시 모든 목표를 접힌 상태로 유지 (useEffect 제거됨)

  // 목표별로 프로젝트 그룹화 (useMemo로 캐싱)
  const projectsByGoal = useMemo(() => {
    const grouped: { [key: string]: Project[] } = {
      'no-goal': [], // 목표없음
    };

    // 프로젝트를 목표별로 분류
    projects.forEach((project) => {
      if (!project.goal_id) {
        grouped['no-goal'].push(project);
      } else {
        if (!grouped[project.goal_id]) {
          grouped[project.goal_id] = [];
        }
        grouped[project.goal_id].push(project);
      }
    });

    return grouped;
  }, [projects]);

  // 목표 섹션 접기/펼치기 토글
  const toggleGoalSection = (goalId: string) => {
    setExpandedGoals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  // 새 프로젝트 추가 핸들러 - "새 프로젝트" 카드를 즉시 생성
  const handleAddProject = async () => {
    if (isCreating || !appUser?.id) return; // 중복 클릭 방지

    setIsCreating(true);
    try {
      // 프로젝트 생성 - DB에 저장하고 UI 즉시 업데이트
      const createdProject = await createProject(appUser.id, {
        title: '새 프로젝트',
        icon: 'lucide-FolderOpen',
        color: '#A8DADC',
        status: 'not_started',
        order_index: projects.length,
      });

      console.log('새 프로젝트 생성 완료:', createdProject);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 프로젝트 편집 핸들러
  const handleEditProject = (project: Project) => {
    console.log('🔍 프로젝트 편집 시작:', {
      id: project.id,
      title: project.title,
      start_date: project.start_date,
      end_date: project.end_date,
      start_date_type: typeof project.start_date,
      end_date_type: typeof project.end_date,
      area_resource_id: project.area_resource_id
    });

    // 날짜 형식 변환: ISO datetime을 YYYY-MM-DD로 변환
    const formatDateForInput = (dateString?: string) => {
      if (!dateString) return '';
      // ISO datetime 형식 (2025-01-15T00:00:00.000Z)을 date 형식 (2025-01-15)으로 변환
      return dateString.split('T')[0];
    };

    // area_resource_id → paraSelection 변환
    let paraSelection = '';
    if (project.area_resource_id) {
      // area인지 resource인지 구분하기 위해 areas와 resources 배열 체크
      const isArea = areas.some(a => a.id === project.area_resource_id);
      const isResource = resources.some(r => r.id === project.area_resource_id);

      if (isArea) {
        paraSelection = `area-${project.area_resource_id}`;
      } else if (isResource) {
        paraSelection = `resource-${project.area_resource_id}`;
      }
    }

    const editData = {
      ...project,
      paraSelection,
      isNew: false,
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date)
    };

    console.log('✅ 편집 데이터:', editData);

    setEditingProject(editData);
    setEditDialogOpen(true);
  };

  // 프로젝트 저장 핸들러
  const handleSaveProject = async (projectData: Partial<Project>) => {
    if (!appUser?.id) return;

    try {
      if ((projectData as any).isNew) {
        const createData: CreateProjectInput = {
          title: projectData.title!,
          description: projectData.description || '',
          icon: projectData.icon!,
          color: projectData.color!,
          status: projectData.status!,
          goal_id: projectData.goal_id || undefined,
          area_resource_id: projectData.area_resource_id || undefined,
          start_date: projectData.start_date || undefined,
          end_date: projectData.end_date || undefined,
          order_index: projectData.order_index!,
        };
        await createProject(appUser.id, createData);
      } else {
        const updateData: UpdateProjectInput = {
          title: projectData.title!,
          description: projectData.description || '',
          icon: projectData.icon!,
          color: projectData.color!,
          status: projectData.status!,
          goal_id: projectData.goal_id || undefined,
          area_resource_id: projectData.area_resource_id || undefined,
          start_date: projectData.start_date || undefined,
          end_date: projectData.end_date || undefined,
        };
        await updateProject(appUser.id, projectData.id!, updateData);
      }

      setEditDialogOpen(false);
      setEditingProject(null);
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
    if (!projectToDelete || !appUser?.id) return;

    try {
      await deleteProject(appUser.id, projectToDelete.id);
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
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
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="bg-base-200 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-base-content/70 mt-1">
                목표에 따라 그룹화된 프로젝트 목록
                </p>
              </div>
              <button
                onClick={handleAddProject}
                className="btn btn-primary btn-sm rounded-full"
                disabled={isCreating}
              >
                {isCreating ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isCreating ? '생성 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* 프로젝트 목록이 없을 때 */}
          {projects.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 프로젝트가 없습니다. 새 프로젝트를 추가해보세요.
                </p>
                <button
                  onClick={handleAddProject}
                  className="btn btn-primary btn-sm rounded-full mt-4 mx-auto"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isCreating ? '생성 중...' : '새 프로젝트 추가'}
                </button>
              </div>
            </div>
          ) : (
            /* 목표별 프로젝트 그룹 */
            <div className="space-y-6">

              {/* 목표별 섹션들 */}
              <div className="space-y-4">
                {/* 목표없음 섹션 (항상 먼저 표시) */}
                {projectsByGoal['no-goal'] && projectsByGoal['no-goal'].length > 0 && (
                  <ProjectGoalSection
                    goalId="no-goal"
                    projects={projectsByGoal['no-goal']}
                    isExpanded={expandedGoals.has('no-goal')}
                    onToggle={() => toggleGoalSection('no-goal')}
                    onEditProject={handleEditProject}
                  />
                )}

                {/* 각 목표별 섹션 */}
                {goals.map((goal) => {
                  const goalProjects = projectsByGoal[goal.id] || [];
                  // 프로젝트가 없는 목표는 표시하지 않음
                  if (goalProjects.length === 0) return null;

                  return (
                    <ProjectGoalSection
                      key={goal.id}
                      goalId={goal.id}
                      goal={goal}
                      projects={goalProjects}
                      isExpanded={expandedGoals.has(goal.id)}
                      onToggle={() => toggleGoalSection(goal.id)}
                      onEditProject={handleEditProject}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 프로젝트 편집 다이얼로그 */}
        <ProjectEditDialog
          open={editDialogOpen}
          editingProject={editingProject}
          onSave={handleSaveProject}
          onCancel={handleCancelEdit}
          onDelete={handleDeleteClick}
          onProjectChange={setEditingProject}
        />

        {/* 삭제 확인 다이얼로그 */}
        <Sheet
          isOpen={deleteConfirmOpen && !!projectToDelete}
          onClose={handleCancelDelete}
          detent="content-height"
        >
          <Sheet.Container className="bg-background">
            <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
              <div className="px-4 py-3">
                <h3 className="font-bold text-lg">프로젝트 삭제</h3>
              </div>
            </Sheet.Header>

            <Sheet.Content>
              <div className="px-4 py-6">
                <p className="mb-6">
                  <strong>{projectToDelete?.title}</strong> 프로젝트를 삭제하시겠습니까?
                  <br />
                  <span className="text-sm text-base-content/60">
                    이 작업은 되돌릴 수 없습니다.
                  </span>
                </p>
                <div className="flex gap-3 justify-end">
                  <button onClick={handleCancelDelete} className="btn btn-ghost rounded-full">
                    취소
                  </button>
                  <button onClick={handleConfirmDelete} className="btn btn-error rounded-full">
                    삭제
                  </button>
                </div>
              </div>
            </Sheet.Content>
          </Sheet.Container>
        </Sheet>

      </div>
    </AuthGuard>
  );
}
