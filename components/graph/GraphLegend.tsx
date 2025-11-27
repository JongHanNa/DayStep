/**
 * GraphLegend - 그래프 노드 타입 범례
 * 노드 타입별 색상과 라벨 표시
 */

'use client';

import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, getAllNodeTypes } from '@/lib/graph-utils';
import type { GraphNodeType } from '@/types/graph';

interface GraphLegendProps {
  className?: string;
}

export function GraphLegend({ className = '' }: GraphLegendProps) {
  const nodeTypes = getAllNodeTypes();

  return (
    <div className={`absolute bottom-6 left-6 z-10 ${className}`}>
      <div className="bg-base-100/90 backdrop-blur-sm rounded-lg shadow-lg border border-base-300 p-3">
        <div className="text-xs font-medium text-base-content/70 mb-2">범례</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {nodeTypes.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
              />
              <span className="text-xs text-base-content/80">
                {NODE_TYPE_LABELS[type]}
              </span>
            </div>
          ))}
        </div>
        {/* 링크 타입 */}
        <div className="mt-2 pt-2 border-t border-base-300">
          <div className="flex items-center gap-3 text-xs text-base-content/60">
            <div className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-white/30"></span>
              <span>계층</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-white/15 border-dashed border-t border-white/30"></span>
              <span>참조</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraphLegend;
