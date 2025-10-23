'use client';

import { useState } from 'react';
import { Target, Calendar, Timer } from 'lucide-react';
import type { Project, Goal } from '@/types/second-brain';
import ProjectCard from '@/components/second-brain/ProjectCard';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

type ProjectViewTab = 'goals' | 'monthly' | 'weekly';

interface ActiveProjectsSectionProps {
  projects: Project[];
  goals: Goal[];
  onProjectClick?: (project: Project) => void;
}

export default function ActiveProjectsSection({ projects, goals, onProjectClick }: ActiveProjectsSectionProps) {
  const [activeTab, setActiveTab] = useState<ProjectViewTab>('goals');

  // active 상태인 프로젝트만 필터링
  const activeProjects = projects.filter((p) => p.status === 'active');

  // 목표별 그룹화
  const projectsByGoal = () => {
    const grouped: Record<string, Project[]> = {
      'no-goal': [],
    };

    activeProjects.forEach((project) => {
      const key = project.goal_id || 'no-goal';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(project);
    });

    return grouped;
  };

  // 월별 그룹화
  const projectsByMonth = () => {
    const grouped: Record<string, Project[]> = {};

    activeProjects.forEach((project) => {
      if (project.target_end_date) {
        const monthKey = format(new Date(project.target_end_date), 'yyyy-MM');
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(project);
      }
    });

    return grouped;
  };

  // 주별 그룹화
  const projectsByWeek = () => {
    const grouped: Record<string, Project[]> = {};

    activeProjects.forEach((project) => {
      if (project.target_end_date) {
        const date = new Date(project.target_end_date);
        const weekStart = startOfWeek(date, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
        const weekKey = `${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`;
        if (!grouped[weekKey]) grouped[weekKey] = [];
        grouped[weekKey].push(project);
      }
    });

    return grouped;
  };

  const renderProjects = () => {
    if (activeTab === 'goals') {
      const grouped = projectsByGoal();
      return (
        <div className="space-y-6">
          {Object.entries(grouped).map(([goalId, projects]) => {
            const goal = goals.find((g) => g.id === goalId);
            const title = goal ? goal.title : '목표 없음';

            return (
              <div key={goalId} className="space-y-2">
                <h3 className="text-sm font-semibold text-base-content/70 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {title}
                </h3>
                <div className="space-y-2">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEditClick={(p) => onProjectClick?.(p)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'monthly') {
      const grouped = projectsByMonth();
      return (
        <div className="space-y-6">
          {Object.entries(grouped).map(([monthKey, projects]) => (
            <div key={monthKey} className="space-y-2">
              <h3 className="text-sm font-semibold text-base-content/70 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {monthKey}
              </h3>
              <div className="space-y-2">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEditClick={(p) => onProjectClick?.(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'weekly') {
      const grouped = projectsByWeek();
      return (
        <div className="space-y-6">
          {Object.entries(grouped).map(([weekKey, projects]) => (
            <div key={weekKey} className="space-y-2">
              <h3 className="text-sm font-semibold text-base-content/70 flex items-center gap-2">
                <Timer className="w-4 h-4" />
                {weekKey}
              </h3>
              <div className="space-y-2">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEditClick={(p) => onProjectClick?.(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  if (activeProjects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚀</div>
        <p className="text-lg font-semibold text-base-content/70 mb-2">
          진행중인 프로젝트가 없습니다
        </p>
        <p className="text-sm text-base-content/50">
          프로젝트 수집함에서 프로젝트를 활성화해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">진행중인 프로젝트</h2>

      {/* 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('goals')}
          className={`btn btn-sm rounded-full ${activeTab === 'goals' ? 'btn-primary text-primary-content' : 'btn-ghost'}`}
        >
          목표별
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`btn btn-sm rounded-full ${activeTab === 'monthly' ? 'btn-primary text-primary-content' : 'btn-ghost'}`}
        >
          월별
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`btn btn-sm rounded-full ${activeTab === 'weekly' ? 'btn-primary text-primary-content' : 'btn-ghost'}`}
        >
          주별
        </button>
      </div>

      {/* 프로젝트 리스트 */}
      {renderProjects()}
    </div>
  );
}
