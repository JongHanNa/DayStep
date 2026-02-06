// Graph View Types
// Note: originalData uses 'any' to accommodate different type sources
// (types/index.ts, types/domain.ts, entities/todo/Todo.ts)

// Node type enum
export type GraphNodeType = 'area' | 'resource' | 'goal' | 'project' | 'todo' | 'note';

// Link type enum
export type GraphLinkType = 'hierarchy' | 'reference';

// Animation mode enum
export type GraphAnimationMode = 'fast' | 'fade' | 'scale-fade' | 'ripple';

// Graph node interface for react-force-graph
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  title: string;
  color: string;
  icon: string | null;
  status?: string;
  // react-force-graph internal fields
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number; // fixed x position
  fy?: number; // fixed y position
  // Original data reference (any to support multiple type sources)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalData: any;
}

// Graph link interface for react-force-graph
export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: GraphLinkType;
}

// Graph data structure
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Filter state
export interface GraphFilter {
  nodeTypes: GraphNodeType[];
  searchQuery: string;
  showCompleted: boolean;
  showArchived: boolean;
  connectionDepth: number; // 1-5, how many levels of connections to show
  linkWidth: number; // 0.5-3, link width multiplier
  animationMode: GraphAnimationMode; // 노드 등장 애니메이션 모드
}

// Default filter values
export const DEFAULT_GRAPH_FILTER: GraphFilter = {
  nodeTypes: ['area', 'resource', 'goal', 'project', 'todo', 'note'],
  searchQuery: '',
  showCompleted: true,
  showArchived: false,
  connectionDepth: 3,
  linkWidth: 1,
  animationMode: 'fast', // 기본값: 빠른 안정화
};

// Relation data from junction tables
export interface TodoProjectRelation {
  id: string;
  todo_id: string;
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface TodoNoteRelation {
  id: string;
  todo_id: string;
  note_id: string;
  user_id: string;
  created_at: string;
}

export interface ProjectNoteRelation {
  id: string;
  project_id: string;
  note_id: string;
  created_at: string;
}

export interface NoteNoteRelation {
  id: string;
  source_note_id: string;
  target_note_id: string;
  created_at: string;
}

// All relations combined
export interface GraphRelations {
  todoProjects: TodoProjectRelation[];
  todoNotes: TodoNoteRelation[];
  projectNotes: ProjectNoteRelation[];
  noteNotes: NoteNoteRelation[];
}

// Graph view state for Zustand store
export interface GraphViewState {
  // Filter
  filter: GraphFilter;

  // Selection
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Create modal
  createModalOpen: boolean;
  createModalType: GraphNodeType | null;

  // Edit modal
  editModalOpen: boolean;
  editingNode: GraphNode | null;

  // View state
  zoomLevel: number;

  // Actions
  setFilter: (filter: Partial<GraphFilter>) => void;
  resetFilter: () => void;
  setSelectedNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  openCreateModal: (type: GraphNodeType) => void;
  closeCreateModal: () => void;
  openEditModal: (node: GraphNode) => void;
  closeEditModal: () => void;
  setZoomLevel: (level: number) => void;
}

// Canvas rendering context for custom node drawing
export interface NodeRenderContext {
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
}
