'use client';

import { OrganizeNeededView } from '@/components/adhd/TaskOrganize/OrganizeNeededView';

interface OrganizeContentProps {
  userId: string;
}

/**
 * 정리 콘텐츠
 * OrganizeNeededView를 래핑
 */
export function OrganizeContent({ userId }: OrganizeContentProps) {
  return <OrganizeNeededView userId={userId} />;
}
