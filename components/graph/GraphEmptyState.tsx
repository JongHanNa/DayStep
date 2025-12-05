/**
 * GraphEmptyState - 그래프뷰 빈 상태 컴포넌트
 * 앱의 계층 구조를 시각적으로 설명하고 시작점을 안내
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Archive, Target, FolderOpen, CheckSquare, StickyNote, ChevronDown, Sparkles } from 'lucide-react';
import { useGraphStore } from '@/state/stores/graphStore';
import { NODE_TYPE_COLORS } from '@/lib/graph-utils';
import type { GraphNodeType } from '@/types/graph';
import { GraphFAB } from './GraphFAB';
import { GraphCreateModal } from './GraphCreateModal';

// 계층 구조 정의
const HIERARCHY_ITEMS = [
  {
    types: ['area', 'resource'] as GraphNodeType[],
    label: '책임 / 자원',
    description: '삶의 영역과 관리하는 것들',
    icons: [Briefcase, Archive],
    colors: [NODE_TYPE_COLORS.area, NODE_TYPE_COLORS.resource],
    isStart: true,
  },
  {
    types: ['goal'] as GraphNodeType[],
    label: '목표',
    description: '달성하고 싶은 것',
    icons: [Target],
    colors: [NODE_TYPE_COLORS.goal],
  },
  {
    types: ['project'] as GraphNodeType[],
    label: '프로젝트',
    description: '목표 달성을 위한 계획',
    icons: [FolderOpen],
    colors: [NODE_TYPE_COLORS.project],
  },
  {
    types: ['todo'] as GraphNodeType[],
    label: '할일',
    description: '구체적인 실행 항목',
    icons: [CheckSquare],
    colors: [NODE_TYPE_COLORS.todo],
  },
];

const NOTE_ITEM = {
  types: ['note'] as GraphNodeType[],
  label: '노트',
  description: '어디든 연결 가능한 메모',
  icons: [StickyNote],
  colors: [NODE_TYPE_COLORS.note],
};

export function GraphEmptyState() {
  const { openCreateModal } = useGraphStore();
  const [showStartMenu, setShowStartMenu] = useState(false);

  const handleStartCreate = (type: GraphNodeType) => {
    openCreateModal(type);
    setShowStartMenu(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 relative px-4 py-8">
      {/* 메인 컨텐츠 */}
      <div className="max-w-sm w-full">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold mb-2">나의 그래프를 시작하세요</h1>
          <p className="text-base-content/60 text-sm">
            모든 것이 연결된 나만의 시스템을 만들어보세요
          </p>
        </motion.div>

        {/* 트리 다이어그램 */}
        <div className="space-y-3">
          {HIERARCHY_ITEMS.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              {/* 연결선 (첫 번째 제외) */}
              {index > 0 && (
                <div className="flex justify-center mb-3">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="w-0.5 h-6 bg-base-content/20 origin-top"
                  />
                </div>
              )}

              {/* 노드 카드 */}
              <div
                className={`
                  relative p-4 rounded-xl border-2 transition-all
                  ${item.isStart
                    ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/10'
                    : 'bg-base-100 border-base-300'
                  }
                `}
              >
                {/* 시작점 뱃지 */}
                {item.isStart && (
                  <div className="absolute -top-2 left-4 px-2 py-0.5 bg-primary text-primary-content text-xs font-medium rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    여기서 시작
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* 아이콘들 */}
                  <div className="flex -space-x-2">
                    {item.icons.map((Icon, iconIndex) => (
                      <div
                        key={iconIndex}
                        className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-base-200"
                        style={{ backgroundColor: item.colors[iconIndex] }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    ))}
                  </div>

                  {/* 텍스트 */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{item.label}</h3>
                    <p className="text-sm text-base-content/60">{item.description}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 노트 (독립적) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-2 justify-center">
            <div className="h-px flex-1 bg-base-content/10" />
            <span className="text-xs text-base-content/40 px-2">독립적으로 연결 가능</span>
            <div className="h-px flex-1 bg-base-content/10" />
          </div>

          <div className="p-3 rounded-xl bg-base-100 border border-base-300 border-dashed">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: NOTE_ITEM.colors[0] }}
              >
                <StickyNote className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-base">{NOTE_ITEM.label}</h3>
                <p className="text-sm text-base-content/60">{NOTE_ITEM.description}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-8 relative"
        >
          <button
            onClick={() => setShowStartMenu(!showStartMenu)}
            className="w-full btn btn-primary btn-lg rounded-full gap-2"
          >
            첫 책임 또는 자원 만들기
            <ChevronDown className={`w-5 h-5 transition-transform ${showStartMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* 드롭다운 메뉴 */}
          {showStartMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-2 p-2 bg-base-100 rounded-2xl shadow-xl border border-base-300 z-10"
            >
              <button
                onClick={() => handleStartCreate('area')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: NODE_TYPE_COLORS.area }}
                >
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">책임 영역</div>
                  <div className="text-sm text-base-content/60">삶에서 담당하는 역할</div>
                </div>
              </button>

              <button
                onClick={() => handleStartCreate('resource')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: NODE_TYPE_COLORS.resource }}
                >
                  <Archive className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">자원</div>
                  <div className="text-sm text-base-content/60">관리하고 싶은 것들</div>
                </div>
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* 안내 텍스트 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="text-center text-sm text-base-content/40 mt-4"
        >
          또는 오른쪽 하단의 + 버튼을 사용하세요
        </motion.p>
      </div>

      {/* FAB 버튼 */}
      <GraphFAB />
      <GraphCreateModal />
    </div>
  );
}

export default GraphEmptyState;
