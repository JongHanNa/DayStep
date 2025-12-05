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
  linkWidth: 1,
};

// Action menu position interface
interface ActionMenuPosition {
  x: number;
  y: number;
}

// Popover types for note editing
export type NotePopoverType = 'title' | 'content' | 'areaResource' | 'project' | 'todo' | 'note';

interface GraphStoreState {
  // Filter state
  filter: GraphFilter;

  // Selection state
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Multi-selection state (for marquee/rectangle selection)
  selectedNodeIds: string[];
  isMarqueeSelecting: boolean;

  // Create modal state
  createModalOpen: boolean;
  createModalType: GraphNodeType | null;
  createModalParentId: string | null; // Parent node for hierarchical creation

  // Edit modal state
  editModalOpen: boolean;
  editingNode: GraphNode | null;

  // Action menu state (for note nodes)
  actionMenuOpen: boolean;
  actionMenuNode: GraphNode | null;
  actionMenuPosition: ActionMenuPosition | null;

  // Popover state (for note section editing)
  activePopover: NotePopoverType | null;
  popoverPosition: { x: number; y: number } | null;

  // View state
  zoomLevel: number;
  isControlsOpen: boolean; // Controls panel visibility

  // Focus state (for new node creation)
  focusNodeId: string | null;

  // Actions - Filter
  setFilter: (filter: Partial<GraphFilter>) => void;
  resetFilter: () => void;
  toggleNodeType: (type: GraphNodeType) => void;
  setSearchQuery: (query: string) => void;
  setConnectionDepth: (depth: number) => void;
  setLinkWidth: (width: number) => void;
  toggleShowCompleted: () => void;
  toggleShowArchived: () => void;

  // Actions - Selection
  setSelectedNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  clearSelection: () => void;

  // Actions - Multi-selection
  setSelectedNodeIds: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;
  clearMultiSelection: () => void;
  setMarqueeSelecting: (isSelecting: boolean) => void;

  // Actions - Create Modal
  openCreateModal: (type: GraphNodeType, parentId?: string) => void;
  closeCreateModal: () => void;

  // Actions - Edit Modal
  openEditModal: (node: GraphNode) => void;
  closeEditModal: () => void;

  // Actions - Action Menu
  openActionMenu: (node: GraphNode, position: ActionMenuPosition) => void;
  closeActionMenu: () => void;

  // Actions - Popover
  openPopover: (type: NotePopoverType, position: { x: number; y: number }) => void;
  closePopover: () => void;

  // Actions - View
  setZoomLevel: (level: number) => void;
  toggleControls: () => void;
  setControlsOpen: (open: boolean) => void;

  // Actions - Focus
  setFocusNodeId: (id: string | null) => void;
  clearFocusNode: () => void;
}

export const useGraphStore = create<GraphStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      filter: defaultFilter,
      selectedNodeId: null,
      hoveredNodeId: null,
      selectedNodeIds: [],
      isMarqueeSelecting: false,
      createModalOpen: false,
      createModalType: null,
      createModalParentId: null,
      editModalOpen: false,
      editingNode: null,
      actionMenuOpen: false,
      actionMenuNode: null,
      actionMenuPosition: null,
      activePopover: null,
      popoverPosition: null,
      zoomLevel: 1,
      isControlsOpen: true,
      focusNodeId: null,

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

      setLinkWidth: (width) => {
        set((state) => ({
          filter: { ...state.filter, linkWidth: Math.max(0.5, Math.min(3, width)) },
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

      // Multi-selection actions
      setSelectedNodeIds: (nodeIds) => {
        set({ selectedNodeIds: nodeIds });
      },

      addToSelection: (nodeId) => {
        set((state) => {
          if (state.selectedNodeIds.includes(nodeId)) return state;
          return { selectedNodeIds: [...state.selectedNodeIds, nodeId] };
        });
      },

      removeFromSelection: (nodeId) => {
        set((state) => ({
          selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
        }));
      },

      toggleNodeSelection: (nodeId) => {
        set((state) => {
          if (state.selectedNodeIds.includes(nodeId)) {
            return { selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId) };
          }
          return { selectedNodeIds: [...state.selectedNodeIds, nodeId] };
        });
      },

      clearMultiSelection: () => {
        set({ selectedNodeIds: [] });
      },

      setMarqueeSelecting: (isSelecting) => {
        set({ isMarqueeSelecting: isSelecting });
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

      // Action menu actions
      openActionMenu: (node, position) => {
        set({
          actionMenuOpen: true,
          actionMenuNode: node,
          actionMenuPosition: position,
          // 팝오버 상태 초기화 (이전 팝오버가 남아있으면 새 액션 메뉴에서 자동으로 열리는 버그 방지)
          activePopover: null,
          popoverPosition: null,
        });
      },

      closeActionMenu: () => {
        set({
          actionMenuOpen: false,
          actionMenuNode: null,
          actionMenuPosition: null,
        });
      },

      // Popover actions
      openPopover: (type, position) => {
        set({
          activePopover: type,
          popoverPosition: position,
          // 팝오버 열 때 액션 메뉴는 닫지 않음 (노드 정보 유지 필요)
        });
      },

      closePopover: () => {
        set({
          activePopover: null,
          popoverPosition: null,
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

      // Focus actions
      setFocusNodeId: (id) => {
        set({ focusNodeId: id });
      },

      clearFocusNode: () => {
        set({ focusNodeId: null });
      },
    }),
    { name: 'graphStore' }
  )
);

// Selector hooks for optimized re-renders
export const useGraphFilter = () => useGraphStore((state) => state.filter);
export const useGraphSelectedNode = () => useGraphStore((state) => state.selectedNodeId);
export const useGraphHoveredNode = () => useGraphStore((state) => state.hoveredNodeId);
export const useGraphMultiSelection = () =>
  useGraphStore(
    useShallow((state) => ({
      selectedNodeIds: state.selectedNodeIds,
      isMarqueeSelecting: state.isMarqueeSelecting,
      setSelectedNodeIds: state.setSelectedNodeIds,
      addToSelection: state.addToSelection,
      removeFromSelection: state.removeFromSelection,
      toggleNodeSelection: state.toggleNodeSelection,
      clearMultiSelection: state.clearMultiSelection,
      setMarqueeSelecting: state.setMarqueeSelecting,
    }))
  );
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
export const useGraphActionMenu = () =>
  useGraphStore(
    useShallow((state) => ({
      isOpen: state.actionMenuOpen,
      node: state.actionMenuNode,
      position: state.actionMenuPosition,
    }))
  );

export const useGraphPopover = () =>
  useGraphStore(
    useShallow((state) => ({
      activePopover: state.activePopover,
      position: state.popoverPosition,
      openPopover: state.openPopover,
      closePopover: state.closePopover,
    }))
  );

export const useGraphFocus = () =>
  useGraphStore(
    useShallow((state) => ({
      focusNodeId: state.focusNodeId,
      setFocusNodeId: state.setFocusNodeId,
      clearFocusNode: state.clearFocusNode,
    }))
  );
