'use client';

import { ProjectsView } from './components';

interface ProjectsScreenProps {
  userId: string;
  onExit?: () => void;
}

/**
 * 내 계획 보기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * 프로젝트 목록 관리 UI를 표시
 */
export function ProjectsScreen({ userId }: ProjectsScreenProps) {
  return <ProjectsView userId={userId} />;
}
