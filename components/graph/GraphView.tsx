'use client';

import { Network } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * GraphView 컴포넌트
 *
 * 인증된 사용자가 루트 페이지('/')에 접속 시 표시되는 메인 대시보드
 * 향후 그래프 시각화 기능을 추가할 예정
 */
export default function GraphView() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
          <Network className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-base-content mb-2">그래프 뷰</h1>
          <p className="text-base-content/70">개발 예정</p>
        </div>
        <button
          onClick={() => router.push('/second-brain/areas')}
          className="btn btn-primary btn-sm rounded-full"
        >
          Areas로 이동
        </button>
      </div>
    </div>
  );
}
