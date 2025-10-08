'use client';

import { ArrowLeft, Circle, Square, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSettingsStore, BubbleShape } from '@/state/stores/settingsStore';
import { cn } from '@/lib/utils';

export default function BubbleShapePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { bubbleShape, setBubbleShape } = useSettingsStore();
  const router = useRouter();

  // 인증 확인
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=%2Fsettings%2Ftimeline%2Fbubble-shape');
    }
  }, [loading, isAuthenticated, router]);

  // 로딩 중이거나 미인증 상태일 때
  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const shapes: Array<{
    value: BubbleShape;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }> = [
    {
      value: 'circle',
      label: '버블 (원형)',
      icon: Circle,
      description: '부드럽고 친근한 원형 버블'
    },
    {
      value: 'square',
      label: '네모 (사각형)',
      icon: Square,
      description: '깔끔하고 정돈된 사각형'
    },
    {
      value: 'arrow',
      label: '아래 화살표',
      icon: ArrowDown,
      description: '진행 방향을 나타내는 화살표'
    }
  ];

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-3">
        <Link href="/settings/timeline">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">버블 아이콘 형태</h1>
          <p className="text-muted-foreground">타임라인 버블의 모양을 선택하세요</p>
        </div>
      </div>

      {/* 현재 선택된 형태 미리보기 */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          {(() => {
            const currentShape = shapes.find(s => s.value === bubbleShape);
            const IconComponent = currentShape?.icon || Circle;
            return (
              <>
                <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                  <IconComponent className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">현재 선택: {currentShape?.label}</h2>
                  <p className="opacity-90 text-sm">{currentShape?.description}</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* 형태 선택 카드들 */}
      <div className="grid grid-cols-1 gap-4">
        {shapes.map((shape) => {
          const isSelected = bubbleShape === shape.value;
          const IconComponent = shape.icon;

          return (
            <Card
              key={shape.value}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg',
                isSelected && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
              )}
              onClick={() => setBubbleShape(shape.value)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* 아이콘 미리보기 */}
                  <div
                    className={cn(
                      'w-16 h-16 rounded-lg flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <IconComponent className="w-10 h-10" />
                  </div>

                  {/* 설명 */}
                  <div className="flex-1">
                    <h3
                      className={cn(
                        'text-lg font-semibold',
                        isSelected && 'text-blue-700 dark:text-blue-300'
                      )}
                    >
                      {shape.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">{shape.description}</p>
                  </div>

                  {/* 선택 표시 */}
                  {isSelected && (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 안내 정보 */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">선택한 형태는 타임라인 화면에 즉시 적용됩니다</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">버블 색상은 할일 카테고리 색상으로 유지됩니다</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">진행률에 따른 색상 표시는 모든 형태에 동일하게 적용됩니다</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
