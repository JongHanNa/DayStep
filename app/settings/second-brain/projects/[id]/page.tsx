'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  // 상세보기 페이지는 더 이상 사용하지 않음
  // 프로젝트 카드 클릭 시 바로 편집 페이지로 이동하도록 변경됨
  // 이 페이지에 직접 접근하는 경우 편집 페이지로 리다이렉트
  useEffect(() => {
    router.replace(`/settings/second-brain/projects/${projectId}/edit`);
  }, [router, projectId]);

  return null;
}
