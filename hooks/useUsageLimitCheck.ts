'use client';

/**
 * 용량 제한 체크 Hook
 *
 * 생성 전 용량 체크 및 모달 표시를 위한 헬퍼 훅
 * 컴포넌트에서 생성 버튼 클릭 시 사용
 */

import { useState, useCallback } from 'react';
import { useUsageStats, type CanCreateResult } from '@/hooks/useUsageStats';
import { FEATURE_FLAGS, type UsageEntityType } from '@/lib/featureFlags';

interface UseUsageLimitCheckResult {
  /** 생성 가능 여부 체크 (모달 표시 포함) */
  checkAndProceed: (entity: UsageEntityType, onCreate: () => void | Promise<void>) => Promise<void>;
  /** 현재 모달에 표시할 결과 */
  limitResult: CanCreateResult | null;
  /** 모달 열림 상태 */
  isModalOpen: boolean;
  /** 모달 닫기 */
  closeModal: () => void;
  /** 생성 후 카운트 증가 (성공 시 호출) */
  onCreateSuccess: (entity: UsageEntityType) => void;
  /** 삭제 후 카운트 감소 */
  onDeleteSuccess: (entity: UsageEntityType) => void;
}

/**
 * 용량 제한 체크 Hook
 *
 * @example
 * ```tsx
 * const { checkAndProceed, limitResult, isModalOpen, closeModal, onCreateSuccess } = useUsageLimitCheck();
 *
 * const handleCreate = async () => {
 *   await checkAndProceed('todo', async () => {
 *     await createTodo(data);
 *     onCreateSuccess('todo');
 *   });
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleCreate}>할일 추가</button>
 *     <UsageLimitModal isOpen={isModalOpen} onClose={closeModal} result={limitResult!} />
 *   </>
 * );
 * ```
 */
export function useUsageLimitCheck(): UseUsageLimitCheckResult {
  const { canCreate, incrementCount, decrementCount } = useUsageStats();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [limitResult, setLimitResult] = useState<CanCreateResult | null>(null);

  /**
   * 생성 가능 여부 체크 및 진행
   */
  const checkAndProceed = useCallback(
    async (entity: UsageEntityType, onCreate: () => void | Promise<void>) => {
      // 결제 비활성화 시 바로 진행
      if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
        await onCreate();
        return;
      }

      const result = canCreate(entity);

      // 차단 상태면 모달 표시
      if (result.blocked) {
        setLimitResult(result);
        setIsModalOpen(true);
        return;
      }

      // 허용이면 생성 진행
      await onCreate();
    },
    [canCreate]
  );

  /**
   * 모달 닫기
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setLimitResult(null);
  }, []);

  /**
   * 생성 성공 시 카운트 증가
   */
  const onCreateSuccess = useCallback(
    (entity: UsageEntityType) => {
      incrementCount(entity);
    },
    [incrementCount]
  );

  /**
   * 삭제 성공 시 카운트 감소
   */
  const onDeleteSuccess = useCallback(
    (entity: UsageEntityType) => {
      decrementCount(entity);
    },
    [decrementCount]
  );

  return {
    checkAndProceed,
    limitResult,
    isModalOpen,
    closeModal,
    onCreateSuccess,
    onDeleteSuccess,
  };
}
