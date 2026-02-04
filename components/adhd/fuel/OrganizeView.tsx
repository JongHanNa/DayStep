'use client';

import { OrganizeNeededView } from '@/components/adhd/TaskOrganize/OrganizeNeededView';

interface OrganizeViewProps {
  userId: string;
}

/**
 * 정리 뷰
 * OrganizeNeededView를 래핑
 */
export function OrganizeView({ userId }: OrganizeViewProps) {
  return <OrganizeNeededView userId={userId} />;
}
