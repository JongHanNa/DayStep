'use client';

import { OrganizeView } from '@/components/adhd/fuel/OrganizeView';

interface OrganizeScreenProps {
  userId: string;
}

/**
 * 할일 정리하기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 */
export function OrganizeScreen({ userId }: OrganizeScreenProps) {
  return <OrganizeView userId={userId} />;
}

export default OrganizeScreen;
