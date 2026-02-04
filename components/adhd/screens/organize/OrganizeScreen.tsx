'use client';

import { OrganizeNeededView } from '@/components/adhd/TaskOrganize/OrganizeNeededView';

interface OrganizeScreenProps {
  userId: string;
}

/**
 * 할일 정리하기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * OrganizeNeededView를 직접 사용
 */
export function OrganizeScreen({ userId }: OrganizeScreenProps) {
  return <OrganizeNeededView userId={userId} />;
}

export default OrganizeScreen;
