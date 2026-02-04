'use client';

import TaskOrganizeContainer from '../task-organize/TaskOrganizeContainer';

interface TaskOrganizeViewProps {
  onExit: () => void;
}

/**
 * 할일 정리 뷰
 *
 * ADHDContainer에서 사용되는 할일 정리 모드 래퍼입니다.
 */
export default function TaskOrganizeView({ onExit }: TaskOrganizeViewProps) {
  return <TaskOrganizeContainer onExit={onExit} />;
}
