/**
 * GraphControls - 그래프 필터 및 컨트롤 패널
 * 노드 타입, 상태, 검색, 연결 깊이 필터링
 */

'use client';

import { Search, Filter, Eye, EyeOff, X, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  useGraphStore,
  useGraphFilter,
  useGraphControls,
} from '@/state/stores/graphStore';
import type { GraphNodeType } from '@/types/graph';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, getAllNodeTypes } from '@/lib/graph-utils';

interface GraphControlsProps {
  nodeCount: number;
  linkCount: number;
  isFiltered: boolean;
}

export function GraphControls({ nodeCount, linkCount, isFiltered }: GraphControlsProps) {
  const filter = useGraphFilter();
  const { isControlsOpen, toggleControls, setControlsOpen } = useGraphControls();
  const {
    setSearchQuery,
    toggleNodeType,
    toggleShowCompleted,
    toggleShowArchived,
    setConnectionDepth,
    setLinkWidth,
    resetFilter,
  } = useGraphStore();

  const nodeTypes = getAllNodeTypes();

  if (!isControlsOpen) {
    return (
      <button
        onClick={toggleControls}
        className="absolute top-4 right-4 z-10 btn btn-circle btn-sm bg-base-100/90 backdrop-blur-sm shadow-lg"
        title="필터 패널 열기"
      >
        <Filter className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 w-64 bg-base-100/95 backdrop-blur-sm rounded-xl shadow-xl border border-base-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-base-300">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">필터</span>
        </div>
        <button
          onClick={toggleControls}
          className="btn btn-ghost btn-xs btn-circle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* 검색 */}
        <div className="form-control">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
            <input
              type="text"
              placeholder="노드 검색..."
              value={filter.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered w-full pl-9 bg-base-200/50"
            />
            {filter.searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 노드 타입 필터 */}
        <div>
          <label className="text-xs font-medium text-base-content/70 mb-2 block">
            노드 타입
          </label>
          <div className="grid grid-cols-2 gap-1">
            {nodeTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleNodeType(type)}
                className={`btn btn-xs ${
                  filter.nodeTypes.includes(type)
                    ? 'btn-soft'
                    : 'btn-ghost opacity-50'
                } justify-start gap-2`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
                />
                <span className="text-xs">{NODE_TYPE_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 상태 필터 */}
        <div>
          <label className="text-xs font-medium text-base-content/70 mb-2 block">
            상태
          </label>
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.showCompleted}
                onChange={toggleShowCompleted}
                className="checkbox checkbox-xs checkbox-primary"
              />
              <span className="text-xs">완료 항목 표시</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.showArchived}
                onChange={toggleShowArchived}
                className="checkbox checkbox-xs checkbox-primary"
              />
              <span className="text-xs">보관 항목 표시</span>
            </label>
          </div>
        </div>

        {/* 연결 깊이 */}
        <div>
          <label className="text-xs font-medium text-base-content/70 mb-2 block">
            연결 깊이: {filter.connectionDepth}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={filter.connectionDepth}
            onChange={(e) => setConnectionDepth(parseInt(e.target.value))}
            className="range range-xs range-primary"
          />
          <div className="flex justify-between text-[10px] text-base-content/50 mt-1">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>

        {/* 연결선 두께 */}
        <div>
          <label className="text-xs font-medium text-base-content/70 mb-2 block">
            연결선 두께: {filter.linkWidth.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={filter.linkWidth}
            onChange={(e) => setLinkWidth(parseFloat(e.target.value))}
            className="range range-xs range-primary"
          />
          <div className="flex justify-between text-[10px] text-base-content/50 mt-1">
            <span>0.5</span>
            <span>1</span>
            <span>1.5</span>
            <span>2</span>
            <span>2.5</span>
            <span>3</span>
          </div>
        </div>

        {/* 통계 */}
        <div className="bg-base-200/50 rounded-lg p-2">
          <div className="flex justify-between text-xs">
            <span className="text-base-content/70">노드</span>
            <span className="font-medium">{nodeCount}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-base-content/70">연결</span>
            <span className="font-medium">{linkCount}</span>
          </div>
          {isFiltered && (
            <div className="text-xs text-primary mt-1 text-center">
              필터 적용됨
            </div>
          )}
        </div>

        {/* 필터 초기화 */}
        {isFiltered && (
          <button
            onClick={resetFilter}
            className="btn btn-ghost btn-xs w-full"
          >
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}

export default GraphControls;
