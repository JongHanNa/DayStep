import { Project } from '@/types/domain';

/**
 * 프로젝트 수집함 필터
 *
 * 프로젝트가 수집함에 남아있는 조건:
 *   - 종료일(end_date) 없음, 또는
 *   - 할일(todoCount) 없음
 *
 * → 둘 다 있으면 수집함에서 제거
 *
 * @param projects - 프로젝트 배열
 * @param todoCountMap - 프로젝트 ID별 할일 갯수 맵
 * @returns 수집함에 남아있어야 할 프로젝트 배열
 */
export function filterInboxProjects(
  projects: Project[],
  todoCountMap: Map<string, number>
): Project[] {
  return projects.filter((project) => {
    const hasEndDate = project.end_date != null;
    const todoCount = todoCountMap.get(project.id) || 0;

    // end_date + todoCount > 0 모두 충족 시 제외
    if (hasEndDate && todoCount > 0) return false;
    return true;
  });
}
