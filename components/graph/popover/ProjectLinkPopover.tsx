'use client';

import { useState, useMemo } from 'react';
import { Folder, Plus, Check } from 'lucide-react';
import { PopoverContainer } from './PopoverContainer';
import { PopoverSearchInput } from './PopoverSearchInput';
import type { Project } from '@/types/second-brain';

interface ProjectLinkPopoverProps {
  position: { x: number; y: number };
  selectedProjectIds: string[];
  allProjects: Project[];
  onToggle: (projectId: string, isSelected: boolean) => Promise<void>;
  onCreateProject?: (title: string) => Promise<Project>;
  onClose: () => void;
}

export function ProjectLinkPopover({
  position,
  selectedProjectIds,
  allProjects,
  onToggle,
  onCreateProject,
  onClose,
}: ProjectLinkPopoverProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 검색 필터링
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return allProjects;

    const query = searchQuery.toLowerCase();
    return allProjects.filter(
      (project) =>
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
  }, [allProjects, searchQuery]);

  // 연결된 프로젝트와 다른 프로젝트 분리
  const connectedProjects = useMemo(
    () => filteredProjects.filter((p) => selectedProjectIds.includes(p.id)),
    [filteredProjects, selectedProjectIds]
  );

  const otherProjects = useMemo(
    () => filteredProjects.filter((p) => !selectedProjectIds.includes(p.id)),
    [filteredProjects, selectedProjectIds]
  );

  // 프로젝트 토글
  const handleToggle = async (projectId: string) => {
    if (isToggling) return;

    setIsToggling(projectId);
    const isSelected = selectedProjectIds.includes(projectId);

    try {
      await onToggle(projectId, !isSelected);
    } catch (error) {
      console.error('프로젝트 연결 토글 실패:', error);
    } finally {
      setIsToggling(null);
    }
  };

  // 프로젝트 생성 및 연결
  const handleCreateProject = async () => {
    if (!onCreateProject || !searchQuery.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newProject = await onCreateProject(searchQuery.trim());
      await onToggle(newProject.id, true);
      setSearchQuery('');
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PopoverContainer
      position={position}
      onClose={onClose}
      title="프로젝트 연결"
      width={300}
      maxHeight={450}
    >
      <PopoverSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="프로젝트 검색 또는 생성..."
      />

      <div className="px-2 pb-2 space-y-1 max-h-[300px] overflow-y-auto">
        {/* 연결된 프로젝트 */}
        {connectedProjects.length > 0 && (
          <>
            <div className="px-1 py-1.5 text-xs font-medium text-base-content/50">
              연결된 프로젝트 ({connectedProjects.length})
            </div>
            {connectedProjects.map((project) => {
              const isSelected = selectedProjectIds.includes(project.id);
              const isLoading = isToggling === project.id;

              return (
                <button
                  key={project.id}
                  onClick={() => handleToggle(project.id)}
                  disabled={isToggling !== null}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-base-300'
                    }`}
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      isSelected && <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <Folder
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: project.color || '#808080' }}
                  />
                  <span className="text-sm truncate">{project.title}</span>
                </button>
              );
            })}
          </>
        )}

        {/* 다른 프로젝트 */}
        {otherProjects.length > 0 && (
          <>
            <div className="px-1 py-1.5 text-xs font-medium text-base-content/50 mt-2">
              다른 프로젝트 ({otherProjects.length})
            </div>
            {otherProjects.map((project) => {
              const isLoading = isToggling === project.id;

              return (
                <button
                  key={project.id}
                  onClick={() => handleToggle(project.id)}
                  disabled={isToggling !== null}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 transition-colors text-left"
                >
                  <div className="w-4 h-4 rounded border border-base-300 flex items-center justify-center flex-shrink-0">
                    {isLoading && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                  </div>
                  <Folder
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: project.color || '#808080' }}
                  />
                  <span className="text-sm truncate">{project.title}</span>
                </button>
              );
            })}
          </>
        )}

        {/* 검색 결과 없음 */}
        {filteredProjects.length === 0 && !searchQuery && (
          <div className="px-2 py-3 text-sm text-base-content/40 text-center">
            프로젝트가 없습니다
          </div>
        )}
      </div>

      {/* 프로젝트 생성 버튼 */}
      {onCreateProject && searchQuery.trim() && (
        <div className="px-2 pb-2 border-t border-base-300 pt-2">
          <button
            onClick={handleCreateProject}
            disabled={isCreating}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-base-200 transition-colors text-left"
          >
            {isCreating ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Plus className="w-4 h-4 text-primary" />
            )}
            <Folder className="w-4 h-4 text-base-content/50" />
            <span className="text-sm">
              <span className="font-medium">{searchQuery}</span> 프로젝트 생성
            </span>
          </button>
        </div>
      )}
    </PopoverContainer>
  );
}
