/**
 * Graph Store - 그래프 뷰 상태 관리
 * 필터링, 선택, 모달 상태 등을 관리
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  GraphViewState,
  GraphFilter,
  GraphNode,
  GraphNodeType,
  DEFAULT_GRAPH_FILTER,
} from '@/types/graph';

// Default filter values (inline to avoid circular import)
const defaultFilter: GraphFilter = {
  nodeTypes: ['area', 'resource', 'goal', 'project', 'todo', 'note'],
  searchQuery: '',
  showCompleted: true,
  showArchived: false,
  connectionDepth: 3,
};

interface GraphStoreState {
  // Filter state
  filter: GraphFilter;

  // Selection state
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Create modal state
  createModalOpen: boolean;
  createModalType: GraphNodeType | null;
  createModalParentId: string | null; // Parent node for hierarchical creation

  // Edit modal state
  editModalOpen: boolean;
  editingNode: GraphNode | null;

  // View state
  zoomLevel: number;
  isControlsOpen: boolean; // Controls panel visibility

  // Actions - Filter
  setFilter: (filter: Partial<GraphFilter>) => void;
  resetFilter: () => void;
  toggleNodeType: (type: GraphNodeType) => void;
  setSearchQuery: (query: string) => void;
  setConnectionDepth: (depth: number) => void;
  toggleShowCompleted: () => void;
  toggleShowArchived: () => void;

  // Actions - Selection
  setSelectedNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  clearSelection: () => void;

  // Actions - Create Modal
  openCreateModal: (type: GraphNodeType, parentId?: string) => void;
  closeCreateModal: () => void;

  // Actions - Edit Modal
  openEditModal: (node: GraphNode) => void;
  closeEditModal: () => void;

  // Actions - View
  setZoomLevel: (level: number) => void;
  toggleControls: () => void;
  setControlsOpen: (open: boolean) => void;
}

export const useGraphStore = create<GraphStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      filter: defaultFilter,
      selectedNodeId: null,
      hoveredNodeId: null,
      createModalOpen: false,
      createModalType: null,
      createModalParentId: null,
      editModalOpen: false,
      editingNode: null,
      zoomLevel: 1,
      isControlsOpen: true,

      // Filter actions
      setFilter: (newFilter) => {
        set((state) => ({
          filter: { ...state.filter, ...newFilter },
        }));
      },

      resetFilter: () => {
        set({ filter: defaultFilter });
      },

      toggleNodeType: (type) => {
        set((state) => {
          const { nodeTypes } = state.filter;
          const newNodeTypes = nodeTypes.includes(type)
            ? nodeTypes.filter((t) => t !== type)
            : [...nodeTypes, type];
          return {
            filter: { ...state.filter, nodeTypes: newNodeTypes },
          };
        });
      },

      setSearchQuery: (query) => {
        set((state) => ({
          filter: { ...state.filter, searchQuery: query },
        }));
      },

      setConnectionDepth: (depth) => {
        set((state) => ({
          filter: { ...state.filter, connectionDepth: Math.max(1, Math.min(5, depth)) },
        }));
      },

      toggleShowCompleted: () => {
        set((state) => ({
          filter: { ...state.filter, showCompleted: !state.filter.showCompleted },
        }));
      },

      toggleShowArchived: () => {
        set((state) => ({
          filter: { ...state.filter, showArchived: !state.filter.showArchived },
        }));
      },

      // Selection actions
      setSelectedNode: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },

      setHoveredNode: (nodeId) => {
        set({ hoveredNodeId: nodeId });
      },

      clearSelection: () => {
        set({ selectedNodeId: null, hoveredNodeId: null });
      },

      // Create modal actions
      openCreateModal: (type, parentId) => {
        set({
          createModalOpen: true,
          createModalType: type,
          createModalParentId: parentId || null,
        });
      },

      closeCreateModal: () => {
        set({
          createModalOpen: false,
          createModalType: null,
          createModalParentId: null,
        });
      },

      // Edit modal actions
      openEditModal: (node) => {
        set({
          editModalOpen: true,
          editingNode: node,
        });
      },

      closeEditModal: () => {
        set({
          editModalOpen: false,
          editingNode: null,
        });
      },

      // View actions
      setZoomLevel: (level) => {
        set({ zoomLevel: Math.max(0.1, Math.min(4, level)) });
      },

      toggleControls: () => {
        set((state) => ({ isControlsOpen: !state.isControlsOpen }));
      },

      setControlsOpen: (open) => {
        set({ isControlsOpen: open });
      },
    }),
    { name: 'graphStore' }
  )
);

// Selector hooks for optimized re-renders
export const useGraphFilter = () => useGraphStore((state) => state.filter);
export const useGraphSelectedNode = () => useGraphStore((state) => state.selectedNodeId);
export const useGraphHoveredNode = () => useGraphStore((state) => state.hoveredNodeId);
export const useGraphCreateModal = () =>
  useGraphStore(
    useShallow((state) => ({
      isOpen: state.createModalOpen,
      type: state.createModalType,
      parentId: state.createModalParentId,
    }))
  );
export const useGraphEditModal = () =>
  useGraphStore(
    useShallow((state) => ({
      isOpen: state.editModalOpen,
      node: state.editingNode,
    }))
  );
export const useGraphControls = () =>
  useGraphStore(
    useShallow((state) => ({
      isControlsOpen: state.isControlsOpen,
      toggleControls: state.toggleControls,
      setControlsOpen: state.setControlsOpen,
    }))
  );
