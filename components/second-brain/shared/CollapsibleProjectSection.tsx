'use client';

import { useState, useMemo } from 'react';
import { Folder, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Project } from '@/types/second-brain';

interface CollapsibleProjectSectionProps {
  selectedProjectIds: string[];
  allProjects: Project[];
  onChange: (projectIds: string[]) => void;
  onCreateProject?: (title: string) => Promise<Project>;
  todoColor?: string;
}

export default function CollapsibleProjectSection({
  selectedProjectIds = [],
  allProjects = [],
  onChange,
  onCreateProject,
  todoColor = '#808080',
}: CollapsibleProjectSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return allProjects;

    const query = searchQuery.toLowerCase();
    return allProjects.filter(project =>
      project.title?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    );
  }, [allProjects, searchQuery]);

  // 연결된 프로젝트와 다른 프로젝트 분리
  const connectedProjects = useMemo(() =>
    filteredProjects.filter(p => selectedProjectIds.includes(p.id)),
    [filteredProjects, selectedProjectIds]
  );

  const otherProjects = useMemo(() =>
    filteredProjects.filter(p => !selectedProjectIds.includes(p.id)),
    [filteredProjects, selectedProjectIds]
  );

  // 프로젝트 선택/해제 토글
  const toggleProject = (projectId: string) => {
    const newIds = selectedProjectIds.includes(projectId)
      ? selectedProjectIds.filter(id => id !== projectId)
      : [...selectedProjectIds, projectId];
    onChange(newIds);
  };

  // 축약 상태 렌더링
  if (!isExpanded) {
    return (
      <div className="my-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 rounded-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder className="h-5 w-5" style={{ color: todoColor }} />
              <span className="text-lg font-semibold" style={{ color: '#666666' }}>
                프로젝트 {selectedProjectIds.length}개
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
        className="w-full p-3 rounded-t-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Folder className="h-5 w-5" style={{ color: todoColor }} />
            <span className="text-lg font-semibold" style={{ color: '#666666' }}>
              프로젝트 {selectedProjectIds.length}개
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
              placeholder="페이지 연결 또는 생성"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>

        {/* 연결된 페이지 */}
        {connectedProjects.length > 0 && (
          <div className="p-3 border-b border-base-300">
            <div className="text-sm text-base-content/70 mb-2">
              연결된 페이지 {connectedProjects.length}개
            </div>
            <div className="space-y-1">
              {connectedProjects.map(project => (
                <label
                  key={project.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleProject(project.id)}
                    className="checkbox checkbox-sm"
                  />
                  <Folder className="h-4 w-4" style={{ color: project.color || '#808080' }} />
                  <span className="text-sm flex-1">{project.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 다른 페이지들 */}
        {otherProjects.length > 0 && (
          <div className="p-3">
            <div className="text-sm text-base-content/70 mb-2">
              다른 페이지들
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {otherProjects.map(project => (
                <label
                  key={project.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleProject(project.id)}
                    className="checkbox checkbox-sm"
                  />
                  <Folder className="h-4 w-4" style={{ color: project.color || '#808080' }} />
                  <span className="text-sm flex-1">{project.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 프로젝트가 없을 때 */}
        {filteredProjects.length === 0 && (
          <div className="p-8 text-center text-base-content/50">
            {searchQuery ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
            {onCreateProject && (
              <button
                type="button"
                onClick={() => onCreateProject('새 프로젝트')}
                className="btn btn-sm btn-primary mt-3"
              >
                프로젝트 만들기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
