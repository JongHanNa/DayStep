'use client';

import type { TodayProjectSummary } from '../hooks/useDailyPlannerData';

interface ProjectSummaryBarProps {
  summaries: TodayProjectSummary[];
  activeProjectId: string | null;
  onProjectClick: (projectId: string | null) => void;
}

function ProgressRing({ completed, total, color, size = 32 }: { completed: number; total: number; color: string | null; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const dashOffset = circumference * (1 - progress);
  const ringColor = color || '#6366f1';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 배경 링 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-base-content/10"
        />
        {/* 진행 링 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-base-content/60">
        {completed}/{total}
      </span>
    </div>
  );
}

export function ProjectSummaryBar({ summaries, activeProjectId, onProjectClick }: ProjectSummaryBarProps) {
  if (summaries.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
      {summaries.map((s) => {
        const isActive = activeProjectId === s.projectId;
        return (
          <button
            key={s.projectId}
            onClick={() => onProjectClick(isActive ? null : s.projectId)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all flex-shrink-0
              ${isActive
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-base-300 bg-base-200 hover:bg-base-300'}
            `}
          >
            <ProgressRing completed={s.todayCompleted} total={s.todayTotal} color={s.color} />
            <div className="flex flex-col items-start">
              <span className="font-medium text-base-content/80 flex items-center gap-1">
                {s.icon && <span>{s.icon}</span>}
                {s.title}
              </span>
              <span className="text-[10px] text-base-content/50">
                {s.todayCompleted}/{s.todayTotal} 완료
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
