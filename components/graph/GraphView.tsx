/**
 * GraphView - 그래프 뷰 메인 컨테이너
 * 옵시디언 스타일의 물리 시뮬레이션 기반 그래프 시각화
 */

'use client';

import { useEffect } from 'react';
import { Network, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useGraphData } from './hooks/useGraphData';
import { useFilteredGraphData } from './hooks/useFilteredGraphData';
import { GraphCanvas } from './GraphCanvas';
import { GraphControls } from './GraphControls';
import { GraphFAB } from './GraphFAB';
import { GraphLegend } from './GraphLegend';
import { GraphCreateModal } from './GraphCreateModal';
import { useGraphStore, useGraphEditModal } from '@/state/stores/graphStore';

export default function GraphView() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { graphData, loading, error, refetch } = useGraphData();
  const { filteredData, nodeCount, linkCount, isFiltered } = useFilteredGraphData(graphData);
  const { isOpen: isEditModalOpen, node: editingNode } = useGraphEditModal();
  const { closeEditModal } = useGraphStore();

  // 인증 대기
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // 로그인 필요
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center space-y-4">
          <Network className="w-16 h-16 mx-auto text-base-content/30" />
          <div>
            <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
            <p className="text-base-content/60 mt-1">
              그래프 뷰를 사용하려면 로그인하세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-error/10 rounded-full flex items-center justify-center">
            <Network className="w-8 h-8 text-error" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-error">오류 발생</h2>
            <p className="text-base-content/60 mt-1">{error}</p>
          </div>
          <button onClick={refetch} className="btn btn-primary btn-sm rounded-full gap-2">
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (loading && graphData.nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/60">그래프 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 빈 데이터 상태
  if (graphData.nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300 relative">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <Network className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">아직 데이터가 없습니다</h2>
            <p className="text-base-content/60 mt-1">
              오른쪽 하단의 + 버튼을 눌러<br />
              첫 번째 항목을 추가해보세요!
            </p>
          </div>
        </div>
        <GraphFAB />
        <GraphCreateModal />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--header-total-height))] bg-base-300 relative overflow-hidden">
      {/* 메인 그래프 캔버스 */}
      <GraphCanvas graphData={filteredData} />

      {/* 필터 컨트롤 패널 */}
      <GraphControls
        nodeCount={nodeCount}
        linkCount={linkCount}
        isFiltered={isFiltered}
      />

      {/* 범례 */}
      <GraphLegend />

      {/* FAB 버튼 (노드 생성) */}
      <GraphFAB />

      {/* 생성 모달 */}
      <GraphCreateModal />

      {/* 로딩 인디케이터 (데이터 새로고침 시) */}
      {loading && graphData.nodes.length > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-base-100/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs">동기화 중...</span>
          </div>
        </div>
      )}

      {/* 새로고침 버튼 */}
      <button
        onClick={refetch}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 btn btn-sm btn-ghost bg-base-100/90 backdrop-blur-sm shadow-lg rounded-full gap-2"
        title="새로고침"
      >
        <RefreshCw className="w-4 h-4" />
        <span className="text-xs">새로고침</span>
      </button>

      {/* TODO: 노드 편집 모달 (기존 모달 연동) */}
      {/* 현재는 콘솔 로그로 확인, 추후 기존 모달 컴포넌트와 연동 예정 */}
      {isEditModalOpen && editingNode && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg">{editingNode.title}</h3>
            <p className="py-4 text-base-content/70">
              타입: {editingNode.type}<br />
              ID: {editingNode.id}
            </p>
            <p className="text-xs text-base-content/50">
              (추후 기존 편집 모달과 연동 예정)
            </p>
            <div className="modal-action">
              <button onClick={closeEditModal} className="btn btn-sm rounded-full">
                닫기
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeEditModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
