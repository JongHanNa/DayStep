'use client';

import { useState, useMemo, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/app/context/AuthContext';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { ChevronDown, Target, FolderKanban, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';
import {
  calculateDaysUntil,
  formatDaysRemaining,
  getQuarterInfo,
  getWeekRange,
  getMonthKey,
  getYear,
  safeParseDate,
  calculatePeriodProgress,
  analyzeDateStatus,
} from '@/lib/date-utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import GoalEditDialog from '@/components/second-brain/GoalEditDialog';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import type { Goal, Project } from '@/types/second-brain';

// hex 색상을 rgba로 변환하는 헬퍼 함수
function hexToRgba(hex: string, alpha: number): string {
  // #RRGGBB 형식에서 RGB 추출
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 아코디언 섹션 컴포넌트
interface AccordionSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function AccordionSection({ title, count, icon, defaultExpanded = false, children }: AccordionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-base-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-base">{title}</span>
          <span className="badge badge-sm">{count}</span>
        </div>
        <ChevronDown
          className={cn('w-5 h-5 transition-transform', isExpanded && 'rotate-180')}
        />
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// 탭 컴포넌트
interface TabButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, count, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn('tab', isActive && 'tab-active')}
    >
      {label}
      <span className="ml-1 badge badge-sm">{count}</span>
    </button>
  );
}

// 목표 카드 컴포넌트
interface GoalCardProps {
  goal: Goal;
  onClick?: () => void;
}

function GoalCard({ goal, onClick }: GoalCardProps) {
  const daysUntil = goal.end_date ? calculateDaysUntil(goal.end_date) : null;
  const daysLabel = daysUntil !== null ? formatDaysRemaining(daysUntil) : '';
  const isDanger = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;
  const isWarning = daysUntil !== null && daysUntil > 7 && daysUntil <= 30;
  const isOverdue = daysUntil !== null && daysUntil < 0;

  // 기간 경과율 및 상태 계산
  const periodProgress = calculatePeriodProgress(goal.start_date, goal.end_date);
  const dateStatus = analyzeDateStatus(goal.start_date, goal.end_date, goal.status);

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="flex flex-col p-4 bg-base-100 hover:bg-base-300 transition-colors cursor-pointer rounded-lg mb-3"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: goal.color }}
        >
          <Target className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{goal.title}</h3>
          {/* 상태 뱃지 + D-day */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={dateStatus} />
            {daysLabel && (
              <span
                className={cn(
                  'text-sm font-medium',
                  isDanger && 'text-error',
                  isWarning && 'text-warning',
                  isOverdue && 'text-error',
                  !isDanger && !isWarning && !isOverdue && 'text-base-content/60'
                )}
              >
                {daysLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 진행률 섹션 */}
      <div className="space-y-2">
        {/* 목표 진행도 */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs text-base-content/60">
            <span>목표 진행도</span>
            <span className="font-medium">{goal.progress}%</span>
          </div>
          <div
            className="w-full rounded-full h-2"
            style={{ backgroundColor: hexToRgba(goal.color, 0.2) }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
            />
          </div>
        </div>

        {/* 기간 경과율 (날짜 설정된 경우만) */}
        {periodProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-base-content/60">
              <span>기간 경과율</span>
              <span className="font-medium">{periodProgress}%</span>
            </div>
            <div className="w-full rounded-full h-1.5 bg-base-200">
              <div
                className="h-full rounded-full transition-all bg-warning"
                style={{ width: `${periodProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 프로젝트 카드 컴포넌트
interface ProjectCardProps {
  project: Project;
  showGoalName?: boolean;
  goals?: Goal[];
  onClick?: () => void;
}

function ProjectCard({ project, showGoalName = false, goals = [], onClick }: ProjectCardProps) {
  const daysUntil = project.end_date ? calculateDaysUntil(project.end_date) : null;
  const daysLabel = daysUntil !== null ? formatDaysRemaining(daysUntil) : '';
  const isDanger = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;
  const isWarning = daysUntil !== null && daysUntil > 7 && daysUntil <= 30;
  const isOverdue = daysUntil !== null && daysUntil < 0;

  // 기간 경과율 및 상태 계산
  const periodProgress = calculatePeriodProgress(project.start_date, project.end_date);
  const dateStatus = analyzeDateStatus(
    project.start_date,
    project.end_date,
    project.status,
    project.completed_at
  );

  // 할일 완료율 계산
  const taskCompletionRate = project.total_todos > 0
    ? Math.round((project.completed_todos / project.total_todos) * 100)
    : 0;

  // 진행률 불일치 경고 (기간 경과율 > 할일 완료율 + 20%)
  const isProgressMismatch = periodProgress !== null
    && periodProgress > taskCompletionRate + 20
    && project.status !== 'completed';

  const goalName = showGoalName && project.goal_id
    ? goals.find(g => g.id === project.goal_id)?.title
    : null;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="flex flex-col p-4 bg-base-100 hover:bg-base-300 transition-colors cursor-pointer rounded-lg mb-3"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: project.color }}
        >
          <FolderKanban className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{project.title}</h3>
          {goalName && <p className="text-xs text-base-content/50 truncate">{goalName}</p>}
          {/* 상태 뱃지 + D-day + 경고 */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={dateStatus} />
            {daysLabel && (
              <span
                className={cn(
                  'text-sm font-medium',
                  isDanger && 'text-error',
                  isWarning && 'text-warning',
                  isOverdue && 'text-error',
                  !isDanger && !isWarning && !isOverdue && 'text-base-content/60'
                )}
              >
                {daysLabel}
              </span>
            )}
            {isProgressMismatch && (
              <span
                className="text-warning inline-flex items-center"
                title="진행률이 기간 대비 뒤처지고 있습니다"
              >
                <AlertTriangle className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 듀얼 진행률 섹션 */}
      <div className="space-y-2">
        {/* 할일 완료율 (주요) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs text-base-content/60">
            <span>할일 완료율</span>
            <span className="font-medium">
              {project.total_todos > 0
                ? `${project.completed_todos}/${project.total_todos} (${taskCompletionRate}%)`
                : '할일 없음'
              }
            </span>
          </div>
          <div
            className="w-full rounded-full h-2"
            style={{ backgroundColor: hexToRgba(project.color, 0.2) }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${taskCompletionRate}%`, backgroundColor: project.color }}
            />
          </div>
        </div>

        {/* 기간 경과율 (보조, 날짜 설정된 경우만) */}
        {periodProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-base-content/60">
              <span>기간 경과율</span>
              <span className="font-medium">{periodProgress}%</span>
            </div>
            <div className="w-full rounded-full h-1.5 bg-base-200">
              <div
                className="h-full rounded-full transition-all bg-warning"
                style={{ width: `${periodProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 빈 상태 컴포넌트
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-base-content/50">{message}</p>
    </div>
  );
}

export default function GoalCompassPage() {
  const { user, appUser } = useAuth();
  const { goals, fetchGoals, updateGoal, deleteGoal } = useGoalStore();
  const { projects, fetchProjects, createProject, updateProject, deleteProject } = useProjectStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/goal-compass');
  }, []);

  // 탭 상태
  const [ongoingGoalsTab, setOngoingGoalsTab] = useState<'quarter' | 'year'>('quarter');
  const [ongoingProjectsTab, setOngoingProjectsTab] = useState<'goal' | 'month' | 'week'>('goal');
  const [completedGoalsTab, setCompletedGoalsTab] = useState('month');
  const [completedProjectsTab, setCompletedProjectsTab] = useState<'goal' | 'month'>('goal');

  // 편집 모달 상태
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<(Goal & { paraSelection?: string; isNew?: boolean }) | null>(null);
  const [editingProject, setEditingProject] = useState<(Project & { paraSelection?: string; isNew?: boolean }) | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // 데이터 페칭
  useEffect(() => {
    if (user?.id) {
      fetchGoals(user.id);
      fetchProjects(user.id);
      fetchAreas(user.id);
      fetchResources(user.id);
    }
  }, [user?.id, fetchGoals, fetchProjects, fetchAreas, fetchResources]);

  // 목표 클릭 핸들러
  const handleGoalClick = (goal: Goal) => {
    // paraSelection 생성 (아카이브 페이지와 동일한 패턴)
    let paraSelection = '';
    if (goal.area_id) {
      paraSelection = `area-${goal.area_id}`;
    } else if (goal.resource_id) {
      paraSelection = `resource-${goal.resource_id}`;
    }

    setEditingGoal({ ...goal, paraSelection, isNew: false });
    setGoalDialogOpen(true);
  };

  // 프로젝트 추가 핸들러 (GoalEditDialog 내에서 호출)
  const handleAddProject = async () => {
    if (!editingGoal || editingGoal.isNew) {
      alert('먼저 목표를 저장해주세요.');
      return;
    }

    if (isCreatingProject || !appUser?.id) return;

    setIsCreatingProject(true);
    try {
      await createProject(appUser.id, {
        title: '새 프로젝트',
        icon: 'lucide-FolderOpen',
        color: '#A8DADC',
        status: 'not_started',
        goal_id: editingGoal.id,
        order_index: projects.length,
      });
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // 프로젝트 편집 핸들러 (GoalEditDialog 내에서 호출)
  const handleEditProject = (project: Project) => {
    let paraSelection = '';
    if (project.goal_id) {
      paraSelection = `goal-${project.goal_id}`;
    }
    if (project.area_resource_id) {
      const isArea = areas.some(a => a.id === project.area_resource_id);
      const isResource = resources.some(r => r.id === project.area_resource_id);
      if (isArea) {
        paraSelection = `area-${project.area_resource_id}`;
      } else if (isResource) {
        paraSelection = `resource-${project.area_resource_id}`;
      }
    }
    setEditingProject({ ...project, paraSelection, isNew: false });
    setProjectDialogOpen(true);
  };

  // 프로젝트 삭제 핸들러 (GoalEditDialog 내에서 호출)
  const handleDeleteProject = async (project: Project) => {
    if (!appUser?.id) return;

    if (confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      try {
        await deleteProject(appUser.id, project.id);
      } catch (error) {
        console.error('프로젝트 삭제 실패:', error);
        alert('프로젝트 삭제에 실패했습니다.');
      }
    }
  };

  // 프로젝트 클릭 핸들러
  const handleProjectClick = (project: Project) => {
    // paraSelection 생성 (아카이브 페이지와 동일한 패턴)
    let paraSelection = '';

    // goal_id 처리
    if (project.goal_id) {
      paraSelection = `goal-${project.goal_id}`;
    }

    // area_resource_id 처리
    if (project.area_resource_id) {
      const isArea = areas.some(a => a.id === project.area_resource_id);
      const isResource = resources.some(r => r.id === project.area_resource_id);

      if (isArea) {
        paraSelection = `area-${project.area_resource_id}`;
      } else if (isResource) {
        paraSelection = `resource-${project.area_resource_id}`;
      }
    }

    setEditingProject({ ...project, paraSelection, isNew: false });
    setProjectDialogOpen(true);
  };

  // 1. 진행 중인 목표
  const ongoingGoals = useMemo(() => {
    return goals.filter((goal) => goal.status === 'in_progress');
  }, [goals]);

  // 진행 중인 목표 - 분기별 그룹화
  const ongoingGoalsByQuarter = useMemo(() => {
    const grouped: Record<string, Goal[]> = {};

    ongoingGoals.forEach((goal) => {
      if (goal.year_goal && goal.quarter_goal) {
        const key = `${goal.year_goal}년 ${goal.quarter_goal.replace('Q', '')}분기`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(goal);
      }
    });

    // 각 그룹 내에서 디데이 오름차순 정렬
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const daysA = a.end_date ? calculateDaysUntil(a.end_date) : Infinity;
        const daysB = b.end_date ? calculateDaysUntil(b.end_date) : Infinity;
        return daysA - daysB;
      });
    });

    return grouped;
  }, [ongoingGoals]);

  // 진행 중인 목표 - 연간 그룹화
  const ongoingGoalsByYear = useMemo(() => {
    const grouped: Record<string, Goal[]> = {};

    ongoingGoals.forEach((goal) => {
      if (goal.year_goal) {
        const key = `${goal.year_goal}년`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(goal);
      }
    });

    // 각 그룹 내에서 디데이 오름차순 정렬
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const daysA = a.end_date ? calculateDaysUntil(a.end_date) : Infinity;
        const daysB = b.end_date ? calculateDaysUntil(b.end_date) : Infinity;
        return daysA - daysB;
      });
    });

    return grouped;
  }, [ongoingGoals]);

  // 2. 진행 중인 프로젝트 (종료일이 설정된 것만)
  const ongoingProjects = useMemo(() => {
    return projects.filter(
      (project) => project.end_date && project.status === 'in_progress'
    );
  }, [projects]);

  // 진행 중인 프로젝트 - 목표별 그룹화
  const ongoingProjectsByGoal = useMemo(() => {
    const grouped: Record<string, Project[]> = {};

    ongoingProjects.forEach((project) => {
      const goalId = project.goal_id || 'no_goal';
      const key = goalId === 'no_goal'
        ? '목표 없음'
        : goals.find(g => g.id === goalId)?.title || '목표 없음';

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(project);
    });

    // 각 그룹 내에서 디데이 오름차순 정렬
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const daysA = a.end_date ? calculateDaysUntil(a.end_date) : Infinity;
        const daysB = b.end_date ? calculateDaysUntil(b.end_date) : Infinity;
        return daysA - daysB;
      });
    });

    return grouped;
  }, [ongoingProjects, goals]);

  // 진행 중인 프로젝트 - 월별 그룹화
  const ongoingProjectsByMonth = useMemo(() => {
    const grouped: Record<string, Project[]> = {};

    ongoingProjects.forEach((project) => {
      if (project.end_date) {
        const key = getMonthKey(project.end_date);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(project);
      }
    });

    // 각 그룹 내에서 디데이 오름차순 정렬
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const daysA = a.end_date ? calculateDaysUntil(a.end_date) : Infinity;
        const daysB = b.end_date ? calculateDaysUntil(b.end_date) : Infinity;
        return daysA - daysB;
      });
    });

    return grouped;
  }, [ongoingProjects]);

  // 진행 중인 프로젝트 - 주별 그룹화
  const ongoingProjectsByWeek = useMemo(() => {
    const grouped: Record<string, Project[]> = {};

    ongoingProjects.forEach((project) => {
      if (project.end_date) {
        const key = getWeekRange(project.end_date);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(project);
      }
    });

    // 각 그룹 내에서 디데이 오름차순 정렬
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const daysA = a.end_date ? calculateDaysUntil(a.end_date) : Infinity;
        const daysB = b.end_date ? calculateDaysUntil(b.end_date) : Infinity;
        return daysA - daysB;
      });
    });

    return grouped;
  }, [ongoingProjects]);

  // 3. 완료된 목표
  const completedGoals = useMemo(() => {
    return goals.filter((goal) => goal.status === 'completed');
  }, [goals]);

  // 완료된 목표 - 월별 그룹화
  const completedGoalsByMonth = useMemo(() => {
    const grouped: Record<string, Goal[]> = {};

    completedGoals.forEach((goal) => {
      const key = getMonthKey(goal.updated_at);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(goal);
    });

    // 각 그룹 내에서 최신순 정렬
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const dateA = safeParseDate(a.updated_at).getTime();
        const dateB = safeParseDate(b.updated_at).getTime();
        return dateB - dateA;
      });
    });

    return grouped;
  }, [completedGoals]);

  // 4. 완료된 프로젝트 (종료일이 설정된 것만)
  const completedProjects = useMemo(() => {
    return projects.filter(
      (project) => project.end_date && project.status === 'completed'
    );
  }, [projects]);

  // 완료된 프로젝트 - 목표별 그룹화
  const completedProjectsByGoal = useMemo(() => {
    const grouped: Record<string, Project[]> = {};

    completedProjects.forEach((project) => {
      const goalId = project.goal_id || 'no_goal';
      const key = goalId === 'no_goal'
        ? '목표 없음'
        : goals.find(g => g.id === goalId)?.title || '목표 없음';

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(project);
    });

    // 각 그룹 내에서 최신순 정렬
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const dateA = a.completed_at
          ? safeParseDate(a.completed_at).getTime()
          : safeParseDate(a.updated_at).getTime();
        const dateB = b.completed_at
          ? safeParseDate(b.completed_at).getTime()
          : safeParseDate(b.updated_at).getTime();
        return dateB - dateA;
      });
    });

    return grouped;
  }, [completedProjects, goals]);

  // 완료된 프로젝트 - 월별 그룹화
  const completedProjectsByMonth = useMemo(() => {
    const grouped: Record<string, Project[]> = {};

    completedProjects.forEach((project) => {
      const dateToUse = project.completed_at || project.updated_at;
      const key = getMonthKey(dateToUse);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(project);
    });

    // 각 그룹 내에서 최신순 정렬
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const dateA = a.completed_at
          ? safeParseDate(a.completed_at).getTime()
          : safeParseDate(a.updated_at).getTime();
        const dateB = b.completed_at
          ? safeParseDate(b.completed_at).getTime()
          : safeParseDate(b.updated_at).getTime();
        return dateB - dateA;
      });
    });

    return grouped;
  }, [completedProjects]);

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
            <p className="text-sm text-base-content/70">
              목표와 프로젝트의 진행 상황을 한눈에 확인하세요
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto">
          {/* 1. 진행 중인 목표 */}
          <AccordionSection
            title="진행 중인 목표"
            count={ongoingGoals.length}
            icon={<Target className="w-5 h-5 text-primary" />}
          >
            <div className="tabs tabs-boxed inline-flex mb-4">
              <TabButton
                label="분기별"
                count={Object.values(ongoingGoalsByQuarter).flat().length}
                isActive={ongoingGoalsTab === 'quarter'}
                onClick={() => setOngoingGoalsTab('quarter')}
              />
              <TabButton
                label="연간"
                count={Object.values(ongoingGoalsByYear).flat().length}
                isActive={ongoingGoalsTab === 'year'}
                onClick={() => setOngoingGoalsTab('year')}
              />
            </div>

            {ongoingGoalsTab === 'quarter' && (
              <>
                {Object.keys(ongoingGoalsByQuarter).length === 0 ? (
                  <EmptyState message="진행 중인 분기 목표가 없습니다" />
                ) : (
                  Object.entries(ongoingGoalsByQuarter).map(([quarter, goalList]) => (
                    <div key={quarter} className="mb-6">
                      <h3 className="font-semibold text-sm text-base-content/70 mb-2 px-2">{quarter}</h3>
                      {goalList.map((goal) => (
                        <GoalCard key={goal.id} goal={goal} onClick={() => handleGoalClick(goal)} />
                      ))}
                    </div>
                  ))
                )}
              </>
            )}

            {ongoingGoalsTab === 'year' && (
              <>
                {Object.keys(ongoingGoalsByYear).length === 0 ? (
                  <EmptyState message="진행 중인 연간 목표가 없습니다" />
                ) : (
                  Object.entries(ongoingGoalsByYear).map(([year, goalList]) => (
                    <div key={year} className="mb-6">
                      <h3 className="font-semibold text-sm text-base-content/70 mb-2 px-2">{year}</h3>
                      {goalList.map((goal) => (
                        <GoalCard key={goal.id} goal={goal} onClick={() => handleGoalClick(goal)} />
                      ))}
                    </div>
                  ))
                )}
              </>
            )}
          </AccordionSection>

          {/* 2. 진행 중인 프로젝트 */}
          <AccordionSection
            title="진행 중인 프로젝트"
            count={ongoingProjects.length}
            icon={<FolderKanban className="w-5 h-5 text-secondary" />}
          >
            <div className="tabs tabs-boxed inline-flex mb-4">
              <TabButton
                label="목표별"
                count={Object.values(ongoingProjectsByGoal).flat().length}
                isActive={ongoingProjectsTab === 'goal'}
                onClick={() => setOngoingProjectsTab('goal')}
              />
              <TabButton
                label="월별"
                count={Object.values(ongoingProjectsByMonth).flat().length}
                isActive={ongoingProjectsTab === 'month'}
                onClick={() => setOngoingProjectsTab('month')}
              />
              <TabButton
                label="주별"
                count={Object.values(ongoingProjectsByWeek).flat().length}
                isActive={ongoingProjectsTab === 'week'}
                onClick={() => setOngoingProjectsTab('week')}
              />
            </div>

            {ongoingProjectsTab === 'goal' && (
              <>
                {Object.keys(ongoingProjectsByGoal).length === 0 ? (
                  <EmptyState message="진행 중인 프로젝트가 없습니다" />
                ) : (
                  Object.entries(ongoingProjectsByGoal).map(([goalName, projectList]) => (
                    <div key={goalName} className="mb-6">
                      <h3 className="font-semibold text-sm text-base-content/70 mb-2 px-2">{goalName}</h3>
                      {projectList.map((project) => (
                        <ProjectCard key={project.id} project={project} goals={goals} onClick={() => handleProjectClick(project)} />
                      ))}
                    </div>
                  ))
                )}
              </>
            )}

            {ongoingProjectsTab === 'month' && (
              <>
                {Object.keys(ongoingProjectsByMonth).length === 0 ? (
                  <EmptyState message="진행 중인 프로젝트가 없습니다" />
                ) : (
                  Object.entries(ongoingProjectsByMonth).map(([month, projectList]) => (
                    <div key={month} className="mb-6">
                      <h3 className="font-semibold text-sm text-base-content/70 mb-2 px-2">{month}</h3>
                      {projectList.map((project) => (
                        <ProjectCard key={project.id} project={project} showGoalName goals={goals} onClick={() => handleProjectClick(project)} />
                      ))}
                    </div>
                  ))
                )}
              </>
            )}

            {ongoingProjectsTab === 'week' && (
              <>
                {Object.keys(ongoingProjectsByWeek).length === 0 ? (
                  <EmptyState message="진행 중인 프로젝트가 없습니다" />
                ) : (
                  Object.entries(ongoingProjectsByWeek).map(([week, projectList]) => (
                    <div key={week} className="mb-6">
                      <h3 className="font-semibold text-sm text-base-content/70 mb-2 px-2">{week}</h3>
                      {projectList.map((project) => (
                        <ProjectCard key={project.id} project={project} showGoalName goals={goals} onClick={() => handleProjectClick(project)} />
                      ))}
                    </div>
                  ))
                )}
              </>
            )}
          </AccordionSection>

          {/* 3. 완료된 목표 */}
          <AccordionSection
            title="완료된 목표"
            count={completedGoals.length}
            icon={<CheckCircle2 className="w-5 h-5 text-success" />}
          >
            <div className="tabs tabs-boxed inline-flex mb-4">
              <TabButton
                label="월별"
                count={Object.values(completedGoalsByMonth).flat().length}
                isActive={true}
                onClick={() => {}}
              />
            </div>

            {Object.keys(completedGoalsByMonth).length === 0 ? (
              <EmptyState message="완료된 목표가 없습니다" />
            ) : (
              Object.entries(completedGoalsByMonth).map(([month, goalList]) => (
                <div key={month} className="mb-6">
                  <h3 className="font-semibold text-sm text-base-content/70 mb-2 px-2">{month}</h3>
                  {goalList.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onClick={() => handleGoalClick(goal)} />
                  ))}
                </div>
              ))
            )}
          </AccordionSection>

          {/* 4. 완료된 프로젝트 */}
          <AccordionSection
            title="완료된 프로젝트"
            count={completedProjects.length}
            icon={<CheckCircle2 className="w-5 h-5 text-info" />}
          >
            <div className="tabs tabs-boxed inline-flex mb-4">
              <TabButton
                label="목표별"
                count={Object.values(completedProjectsByGoal).flat().length}
                isActive={completedProjectsTab === 'goal'}
                onClick={() => setCompletedProjectsTab('goal')}
              />
              <TabButton
                label="월별"
                count={Object.values(completedProjectsByMonth).flat().length}
                isActive={completedProjectsTab === 'month'}
                onClick={() => setCompletedProjectsTab('month')}
              />
            </div>

            {completedProjectsTab === 'goal' && (
              <>
                {Object.keys(completedProjectsByGoal).length === 0 ? (
                  <EmptyState message="완료된 프로젝트가 없습니다" />
                ) : (
                  Object.entries(completedProjectsByGoal).map(([goalName, projectList]) => (
                    <div key={goalName} className="mb-6">
                      <h3 className="font-semibold text-sm text-base-content/70 mb-2 px-2">{goalName}</h3>
                      {projectList.map((project) => (
                        <ProjectCard key={project.id} project={project} goals={goals} onClick={() => handleProjectClick(project)} />
                      ))}
                    </div>
                  ))
                )}
              </>
            )}

            {completedProjectsTab === 'month' && (
              <>
                {Object.keys(completedProjectsByMonth).length === 0 ? (
                  <EmptyState message="완료된 프로젝트가 없습니다" />
                ) : (
                  Object.entries(completedProjectsByMonth).map(([month, projectList]) => (
                    <div key={month} className="mb-6">
                      <h3 className="font-semibold text-sm text-base-content/70 mb-2 px-2">{month}</h3>
                      {projectList.map((project) => (
                        <ProjectCard key={project.id} project={project} showGoalName goals={goals} onClick={() => handleProjectClick(project)} />
                      ))}
                    </div>
                  ))
                )}
              </>
            )}
          </AccordionSection>
        </div>


        {/* 목표 편집 모달 */}
        {goalDialogOpen && editingGoal && (
          <GoalEditDialog
            open={goalDialogOpen}
            editingGoal={editingGoal}
            areas={areas}
            resources={resources}
            projects={projects}
            onSave={async (goalData, area_id, resource_id) => {
              if (!appUser?.id) return;

              // UI 전용 필드(isNew, paraSelection 등)를 제외하고 DB 필드만 추출
              const updateData = {
                title: goalData.title!,
                icon: goalData.icon!,
                color: goalData.color!,
                status: goalData.status!,
                area_id: area_id || undefined,
                resource_id: resource_id || undefined,
                start_date: goalData.start_date || undefined,
                end_date: goalData.end_date || undefined,
                year_goal: goalData.year_goal ?? null,
                quarter_goal: goalData.quarter_goal ?? null,
              };

              await updateGoal(appUser.id, editingGoal.id, updateData);
              await fetchGoals(appUser.id);
              setGoalDialogOpen(false);
              setEditingGoal(null);
            }}
            onCancel={() => {
              setGoalDialogOpen(false);
              setEditingGoal(null);
            }}
            onDelete={async (goal) => {
              if (!appUser?.id) return;
              await deleteGoal(appUser.id, goal.id);
              await fetchGoals(appUser.id);
              setGoalDialogOpen(false);
              setEditingGoal(null);
            }}
            onGoalChange={(goal) => {
              setEditingGoal(goal);
            }}
            onAddProject={handleAddProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            isCreatingProject={isCreatingProject}
          />
        )}

        {/* 프로젝트 편집 모달 */}
        {projectDialogOpen && editingProject && (
          <ProjectEditDialog
            open={projectDialogOpen}
            editingProject={editingProject}
            onSave={async (projectData) => {
              if (!appUser?.id) return;

              // UI 전용 필드(isNew, paraSelection 등)를 제외하고 DB 필드만 추출
              const updateData = {
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

              await updateProject(appUser.id, editingProject.id, updateData);
              await fetchProjects(appUser.id);
              setProjectDialogOpen(false);
              setEditingProject(null);
            }}
            onCancel={() => {
              setProjectDialogOpen(false);
              setEditingProject(null);
            }}
            onDelete={async (project) => {
              if (!appUser?.id) return;
              await deleteProject(appUser.id, project.id);
              await fetchProjects(appUser.id);
              setProjectDialogOpen(false);
              setEditingProject(null);
            }}
            onProjectChange={(project) => {
              setEditingProject(project);
            }}
          />
        )}
      </div>
    </AuthGuard>
  );
}
