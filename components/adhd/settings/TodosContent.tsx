'use client';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TodoCompletionSettings from '@/components/notifications/TodoCompletionSettings';

interface TodosContentProps {
  onBack: () => void;
}

/**
 * 할일 완료 설정 콘텐츠
 *
 * 기존 /settings/todos 페이지의 콘텐츠를 URL 변경 없이 렌더링합니다.
 */
export default function TodosContent({ onBack }: TodosContentProps) {
  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="btn btn-circle btn-ghost btn-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">할일 완료 설정</h1>
          <p className="text-muted-foreground">할일 완료와 관련된 설정을 관리하세요</p>
        </div>
      </div>

      {/* 할일 완료 설정 미리보기 카드 */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-semibold">할일 완료 설정</h2>
            <p className="opacity-90">
              축하 효과, 알림, 자동 정리 등을 설정할 수 있습니다
            </p>
          </div>
        </div>
        <div className="text-sm opacity-90">
          할일을 완료했을 때의 피드백과 동작을 커스터마이즈하세요
        </div>
      </div>

      {/* 할일 완료 설정 컴포넌트 */}
      <TodoCompletionSettings />

      {/* 할일 완료 기능 설명 */}
      <Card>
        <CardHeader>
          <CardTitle>할일 완료 시 동작</CardTitle>
          <CardDescription>
            할일을 완료했을 때 어떤 일이 일어나는지 확인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">✨ 축하 애니메이션 효과 (설정에 따라)</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">🔔 완료 알림 전송 (설정에 따라)</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">📊 완료 통계 업데이트</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">🗂️ 완료된 항목으로 분류</span>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              💡 <strong>팁:</strong> 축하 효과를 활성화하면 할일 완료 시 성취감을 높일 수 있습니다. 집중이 필요한 환경에서는 효과를 끄는 것이 좋습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
