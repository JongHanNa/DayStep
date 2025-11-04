'use client';

import { Folder } from 'lucide-react';
import type { Project } from '@/types/second-brain';

interface ProjectInboxListProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
}

export default function ProjectInboxList({ projects, onProjectClick }: ProjectInboxListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📂</div>
        <p className="text-lg font-semibold text-base-content/70 mb-2">
          프로젝트 수집함이 비어있습니다
        </p>
        <p className="text-sm text-base-content/50">
          시작 &gt; 프로젝트 페이지에서 새 프로젝트를 추가해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div key={project.id} className="relative overflow-hidden rounded-lg">
          {/* 카드 레이어 */}
          <button
            onClick={() => onProjectClick?.(project)}
            className="relative bg-white hover:bg-base-100 transition-colors cursor-pointer w-full text-left"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Folder className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{project.title}</p>
                  <p className="text-xs text-base-content/60 mt-1">
                    종료일, 영역/자원, 할일을 설정하면 수집함에서 사라집니다
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
