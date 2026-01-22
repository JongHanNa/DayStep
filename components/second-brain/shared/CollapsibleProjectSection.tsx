'use client';

import { useState, useMemo } from 'react';
import { FolderOpen, Search, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { Project } from '@/types';

interface CollapsibleProjectSectionProps {
  selectedProjectId: string | null;
  allProjects: Project[];
  onChange: (projectId: string | null) => void;
  todoColor?: string;
  // 즉시 DB 저장을 위한 props
  todoId?: string;
  userId?: string;
  onImmediateSave?: (projectId: string | null) => Promise<void>;
  // 프로젝트 생성
  onCreateProject?: (title: string) => Promise<Project>;
  // 프로젝트 클릭 시 편집 모달 열기
  onProjectClick?: (project: Project) => void;
}

/**
 * 할일에 프로젝트를 연결하는 접이식 섹션
 * - 단일 선택 (하나의 할일 = 하나의 프로젝트)
 * - 프로젝트 검색 및 새 프로젝트 생성 지원
 */
export default function CollapsibleProjectSection({
  selectedProjectId,
  allProjects = [],
  onChange,
  todoColor = '#808080',
  todoId,
  userId,
  onImmediateSave,
  onCreateProject,
  onProjectClick,
}: CollapsibleProjectSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 활성 프로젝트만 필터링
  const activeProjects = useMemo(() => {
    return allProjects.filter((p) => p.status === 'active');
  }, [allProjects]);

  // 검색 필터링
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeProjects;
    }

    const query = searchQuery.toLowerCase();
    return activeProjects.filter((project) =>
      project.title?.toLowerCase().includes(query)
    );
  }, [activeProjects, searchQuery]);

  // 선택된 프로젝트
  const selectedProject = useMemo(() => {
    return allProjects.find((p) => p.id === selectedProjectId) || null;
  }, [allProjects, selectedProjectId]);

  // 다른 프로젝트들 (선택되지 않은 것들)
  const otherProjects = useMemo(() => {
    return filteredProjects.filter((p) => p.id !== selectedProjectId);
  }, [filteredProjects, selectedProjectId]);

  // 프로젝트 선택/해제 토글
  const toggleProject = async (projectId: string) => {
    const newProjectId = selectedProjectId === projectId ? null : projectId;

    // 로컬 상태 즉시 업데이트
    onChange(newProjectId);

    // DB에 즉시 저장 (선택적)
    if (onImmediateSave) {
      try {
        await onImmediateSave(newProjectId);
      } catch (error) {
        console.error('프로젝트 연결 저장 실패:', error);
        // 실패 시 원래 상태로 되돌리기
        onChange(selectedProjectId);
      }
    }
  };

  // 프로젝트 생성 및 자동 연결
  const handleCreateProject = async () => {
    if (!onCreateProject || !searchQuery.trim()) return;

    try {
      const newProject = await onCreateProject(searchQuery.trim());

      // 생성된 프로젝트 자동 선택
      onChange(newProject.id);

      // DB에 즉시 저장 (선택적)
      if (onImmediateSave) {
        await onImmediateSave(newProject.id);
      }

      // 검색어 초기화
      setSearchQuery('');
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
    }
  };

  // 프로젝트 색상 표시
  const getProjectColor = (project: Project) => {
    return project.color || '#A8DADC';
  };

  // 축약 상태 렌더링
  if (!isExpanded) {
    return (
      <div className="my-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 rounded-lg bg-base-100 border border-base-300 hover:bg-base-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-5 w-5" style={{ color: todoColor }} />
              <span
                className="text-lg font-semibold"
                style={{ color: '#666666' }}
              >
                {selectedProject ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getProjectColor(selectedProject) }}
                    />
                    {selectedProject.title}
                  </span>
                ) : (
                  '프로젝트 없음'
                )}
              </span>
            </div>
            <ChevronDown className="h-5 w-5 text-base-content/50" />
          </div>
        </button>
      </div>
    );
  }

  // 확장 상태 렌더링
  return (
    <div className="my-4">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="w-full p-3 rounded-t-lg bg-base-100 border border-base-300 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5" style={{ color: todoColor }} />
            <span
              className="text-lg font-semibold"
              style={{ color: '#666666' }}
            >
              {selectedProject ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getProjectColor(selectedProject) }}
                  />
                  {selectedProject.title}
                </span>
              ) : (
                '프로젝트 없음'
              )}
            </span>
          </div>
          <ChevronUp className="h-5 w-5 text-base-content/50" />
        </div>
      </button>

      {/* 확장된 내용 */}
      <div className="border border-t-0 border-base-300 rounded-b-lg bg-base-100">
        {/* 검색 입력창 */}
        <div className="p-3 border-b border-base-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50" />
            <input
              type="text"
              placeholder="프로젝트 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>

        {/* 선택된 프로젝트 */}
        {selectedProject && (
          <div className="p-3 border-b border-base-300">
            <div className="text-sm text-base-content/70 mb-2">
              연결된 프로젝트
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors">
                {/* 라디오 버튼 - 선택 해제 */}
                <input
                  type="radio"
                  name="project"
                  checked={true}
                  onChange={() => toggleProject(selectedProject.id)}
                  className="radio radio-sm radio-primary cursor-pointer"
                />

                {/* 클릭 가능 영역 - 프로젝트 편집 모달 열기 */}
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onProjectClick?.(selectedProject)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getProjectColor(selectedProject) }}
                    />
                    <span className="text-sm font-medium">
                      {selectedProject.title}
                    </span>
                    {selectedProject.icon && (
                      <span className="text-sm">{selectedProject.icon}</span>
                    )}
                  </div>
                  {selectedProject.description && (
                    <p className="text-xs text-base-content/60 mt-0.5 line-clamp-1">
                      {selectedProject.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 다른 프로젝트들 */}
        {otherProjects.length > 0 && (
          <div className="p-3">
            <div className="text-sm text-base-content/70 mb-2">
              다른 프로젝트
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {otherProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors"
                >
                  {/* 라디오 버튼 - 선택 */}
                  <input
                    type="radio"
                    name="project"
                    checked={false}
                    onChange={() => toggleProject(project.id)}
                    className="radio radio-sm cursor-pointer"
                  />

                  {/* 클릭 가능 영역 - 프로젝트 편집 모달 열기 */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onProjectClick?.(project)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getProjectColor(project) }}
                      />
                      <span className="text-sm">{project.title}</span>
                      {project.icon && (
                        <span className="text-sm">{project.icon}</span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-base-content/60 mt-0.5 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 프로젝트 없음 옵션 */}
        {selectedProject && (
          <div className="p-3 border-t border-base-300">
            <button
              type="button"
              onClick={() => toggleProject(selectedProject.id)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-base-200 transition-colors text-left"
            >
              <input
                type="radio"
                name="project"
                checked={false}
                onChange={() => {}}
                className="radio radio-sm cursor-pointer"
              />
              <span className="text-sm text-base-content/70">
                프로젝트 연결 해제
              </span>
            </button>
          </div>
        )}

        {/* 프로젝트가 없을 때 */}
        {filteredProjects.length === 0 && (
          <div className="p-8 text-center text-base-content/50">
            {searchQuery ? '검색 결과가 없습니다' : '활성 프로젝트가 없습니다'}
          </div>
        )}

        {/* 검색어가 있을 때 생성 버튼 표시 */}
        {onCreateProject && searchQuery.trim() && (
          <div className="p-3 border-t border-base-300">
            <button
              type="button"
              onClick={handleCreateProject}
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
            >
              <Plus className="h-5 w-5 text-base-content/70" />
              <FolderOpen className="h-5 w-5 text-base-content/70" />
              <span className="text-sm">
                새로운 <strong>{searchQuery}</strong> 프로젝트 생성
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
