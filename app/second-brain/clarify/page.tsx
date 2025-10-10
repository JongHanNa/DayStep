'use client';

import { useEffect, useState } from 'react';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { X, ThumbsUp, ThumbsDown, Calendar, Users, Clock } from 'lucide-react';

export default function ClarifyPage() {
  const { inboxItems, fetchInboxItemsByStatus, clarifyInboxItem } = useInboxStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [unprocessedItems, setUnprocessedItems] = useState<typeof inboxItems>([]);

  useEffect(() => {
    loadUnprocessedItems();
  }, []);

  const loadUnprocessedItems = async () => {
    const items = await fetchInboxItemsByStatus('inbox');
    setUnprocessedItems(items);
  };

  const currentItem = unprocessedItems[currentIndex];

  const handleActionable = async (isActionable: boolean) => {
    if (!currentItem) return;

    if (!isActionable) {
      // 실행 불가능 → 삭제/보관/언젠가
      const action = confirm('나중에 다시 볼까요? (취소하면 삭제됩니다)');
      await clarifyInboxItem(currentItem.id, action ? 'someday' : 'deleted');
      moveToNext();
    } else {
      // 실행 가능 → 다음 질문
      // 임시: 바로 다음 행동으로 분류
      await clarifyInboxItem(currentItem.id, 'next_action');
      moveToNext();
    }
  };

  const moveToNext = () => {
    if (currentIndex < unprocessedItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadUnprocessedItems();
      setCurrentIndex(0);
    }
  };

  const handleSkip = () => {
    moveToNext();
  };

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-base-100 pb-20">
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">명료화</h1>
            <p className="text-sm text-base-content/70">
              수집한 항목을 분류하고 처리하세요
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <p className="text-lg font-semibold text-base-content/70 mb-2">
              모든 항목을 처리했습니다!
            </p>
            <p className="text-sm text-base-content/50">
              수집함에 새로운 항목을 추가해보세요
            </p>
          </div>
        </div>

        <SecondBrainBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">명료화</h1>
            <button onClick={handleSkip} className="btn btn-ghost btn-sm">
              <X className="w-4 h-4" />
              건너뛰기
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              {currentIndex + 1} / {unprocessedItems.length}
            </p>
            <progress
              className="progress progress-primary w-32"
              value={currentIndex + 1}
              max={unprocessedItems.length}
            />
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 - Tinder 스타일 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 카드 */}
        <div className="card bg-gradient-to-br from-primary/5 to-secondary/5 shadow-xl mb-8">
          <div className="card-body p-8">
            <p className="text-xl text-center min-h-[120px] flex items-center justify-center">
              {currentItem.content}
            </p>
          </div>
        </div>

        {/* 질문 */}
        <div className="card bg-base-200 mb-8">
          <div className="card-body">
            <h2 className="card-title text-center justify-center">
              이것은 실행 가능한가요?
            </h2>
            <p className="text-sm text-base-content/60 text-center">
              구체적인 행동으로 옮길 수 있나요?
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleActionable(false)}
            className="btn btn-lg btn-outline hover:btn-error"
          >
            <ThumbsDown className="w-6 h-6" />
            아니요
          </button>
          <button
            onClick={() => handleActionable(true)}
            className="btn btn-lg btn-primary"
          >
            <ThumbsUp className="w-6 h-6" />
            예
          </button>
        </div>

        {/* 가이드 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-base-content/40">
            &ldquo;아니요&rdquo; → 삭제하거나 언젠가 목록으로
            <br />
            &ldquo;예&rdquo; → 다음 행동 또는 프로젝트로 변환
          </p>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
