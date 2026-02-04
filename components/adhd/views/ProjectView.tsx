'use client';

import ProjectContainer from '../project/ProjectContainer';

interface ProjectViewProps {
  onExit: () => void;
}

/**
 * 프로젝트 뷰
 *
 * ADHDContainer에서 사용되는 프로젝트 모드 래퍼입니다.
 */
export default function ProjectView({ onExit }: ProjectViewProps) {
  return <ProjectContainer onExit={onExit} />;
}
