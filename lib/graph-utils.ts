// Graph View Utility Functions
import type { GraphNodeType, GraphNode, GraphLink, GraphData } from '@/types/graph';
import type { AreaResource, Goal, Project, Note } from '@/types/second-brain';
import type { Todo } from '@/entities/todo/Todo';

// Node type color mapping (using project color palette)
export const NODE_TYPE_COLORS: Record<GraphNodeType, string> = {
  area: '#9061C5',      // Purple (책임)
  resource: '#428366',  // Sage (자원)
  goal: '#F0CC49',      // Sunshine (목표)
  project: '#A7C5E4',   // Sky Blue (프로젝트)
  todo: '#E0AD3B',      // Golden (할일)
  note: '#E8A39C',      // Pink (노트)
};

// Node type Korean labels
export const NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  area: '책임',
  resource: '자원',
  goal: '목표',
  project: '프로젝트',
  todo: '할일',
  note: '노트',
};

// Node type default icons (Lucide icon names)
export const NODE_TYPE_ICONS: Record<GraphNodeType, string> = {
  area: 'lucide-Briefcase',
  resource: 'lucide-Archive',
  goal: 'lucide-Target',
  project: 'lucide-FolderOpen',
  todo: 'lucide-CheckSquare',
  note: 'lucide-StickyNote',
};

// Canvas용 아이콘 SVG Path (24x24 viewBox 기준)
export const NODE_TYPE_ICON_PATHS: Record<GraphNodeType, string> = {
  // Briefcase (책임/Area)
  area: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16 M2 10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8z',
  // Archive (자원/Resource)
  resource: 'M21 8v13H3V8 M1 3h22v5H1z M10 12h4',
  // Target (목표/Goal)
  goal: 'M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0 M12 12m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0 M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  // FolderOpen (프로젝트/Project)
  project: 'M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h9a2 2 0 0 1 2 2v1 M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2z',
  // CheckSquare (할일/Todo)
  todo: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  // StickyNote (노트/Note)
  note: 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z M15 3v6h6',
};

// Node sizes for rendering
export const NODE_SIZES: Record<GraphNodeType, number> = {
  area: 16,
  resource: 16,
  goal: 14,
  project: 12,
  todo: 8,
  note: 8,
};

// Convert Area to GraphNode
export function areaToGraphNode(area: AreaResource): GraphNode {
  return {
    id: area.id,
    type: 'area',
    title: area.title,
    color: NODE_TYPE_COLORS.area,
    icon: area.icon || NODE_TYPE_ICONS.area,
    status: area.status,
    originalData: area,
  };
}

// Convert Resource to GraphNode
export function resourceToGraphNode(resource: AreaResource): GraphNode {
  return {
    id: resource.id,
    type: 'resource',
    title: resource.title,
    color: NODE_TYPE_COLORS.resource,
    icon: resource.icon || NODE_TYPE_ICONS.resource,
    status: resource.status,
    originalData: resource,
  };
}

// Convert Goal to GraphNode
export function goalToGraphNode(goal: Goal): GraphNode {
  return {
    id: goal.id,
    type: 'goal',
    title: goal.title,
    color: NODE_TYPE_COLORS.goal,
    icon: goal.icon || NODE_TYPE_ICONS.goal,
    status: goal.status,
    originalData: goal,
  };
}

// Convert Project to GraphNode
export function projectToGraphNode(project: Project): GraphNode {
  return {
    id: project.id,
    type: 'project',
    title: project.title,
    color: NODE_TYPE_COLORS.project,
    icon: project.icon || NODE_TYPE_ICONS.project,
    status: project.status,
    originalData: project,
  };
}

// Convert Todo to GraphNode
export function todoToGraphNode(todo: Todo): GraphNode {
  return {
    id: todo.id,
    type: 'todo',
    title: todo.title,
    color: NODE_TYPE_COLORS.todo,
    icon: todo.icon ?? NODE_TYPE_ICONS.todo,
    status: todo.completed ? 'completed' : 'active',
    originalData: todo,
  };
}

// Convert Note to GraphNode
export function noteToGraphNode(note: Note): GraphNode {
  return {
    id: note.id,
    type: 'note',
    title: note.title || note.content.slice(0, 30) + (note.content.length > 30 ? '...' : ''),
    color: NODE_TYPE_COLORS.note,
    icon: NODE_TYPE_ICONS.note,
    originalData: note,
  };
}

// Create hierarchy link (parent-child relationship)
export function createHierarchyLink(sourceId: string, targetId: string): GraphLink {
  return {
    source: sourceId,
    target: targetId,
    type: 'hierarchy',
  };
}

// Create reference link (note-to-note, todo-to-note, etc.)
export function createReferenceLink(sourceId: string, targetId: string): GraphLink {
  return {
    source: sourceId,
    target: targetId,
    type: 'reference',
  };
}

// Get node size based on type
export function getNodeSize(node: GraphNode): number {
  return NODE_SIZES[node.type] || 10;
}

// Get link color based on type and theme
export function getLinkColor(link: GraphLink, isDarkMode: boolean = true): string {
  if (isDarkMode) {
    return link.type === 'hierarchy'
      ? 'rgba(255, 255, 255, 0.4)'
      : 'rgba(255, 255, 255, 0.2)';
  } else {
    return link.type === 'hierarchy'
      ? 'rgba(0, 0, 0, 0.3)'
      : 'rgba(0, 0, 0, 0.15)';
  }
}

// Get link width based on type with optional multiplier
export function getLinkWidth(link: GraphLink, widthMultiplier: number = 1): number {
  const baseWidth = link.type === 'hierarchy' ? 1.5 : 0.8;
  return baseWidth * widthMultiplier;
}

// Filter graph data to show only connected nodes within depth
export function filterByConnectionDepth(
  graphData: GraphData,
  selectedNodeId: string | null,
  depth: number
): GraphData {
  if (!selectedNodeId || depth <= 0) {
    return graphData;
  }

  const connectedNodeIds = new Set<string>([selectedNodeId]);
  const nodesToProcess = [selectedNodeId];
  let currentDepth = 0;

  while (currentDepth < depth && nodesToProcess.length > 0) {
    const nextNodes: string[] = [];

    for (const nodeId of nodesToProcess) {
      // Find all connected nodes
      for (const link of graphData.links) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

        if (sourceId === nodeId && !connectedNodeIds.has(targetId)) {
          connectedNodeIds.add(targetId);
          nextNodes.push(targetId);
        }
        if (targetId === nodeId && !connectedNodeIds.has(sourceId)) {
          connectedNodeIds.add(sourceId);
          nextNodes.push(sourceId);
        }
      }
    }

    nodesToProcess.length = 0;
    nodesToProcess.push(...nextNodes);
    currentDepth++;
  }

  return {
    nodes: graphData.nodes.filter(node => connectedNodeIds.has(node.id)),
    links: graphData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId);
    }),
  };
}

// Search nodes by title
export function searchNodes(nodes: GraphNode[], query: string): GraphNode[] {
  if (!query.trim()) {
    return nodes;
  }

  const lowerQuery = query.toLowerCase();
  return nodes.filter(node =>
    node.title.toLowerCase().includes(lowerQuery)
  );
}

// Filter nodes by type
export function filterNodesByType(nodes: GraphNode[], types: GraphNodeType[]): GraphNode[] {
  if (types.length === 0) {
    return nodes;
  }
  return nodes.filter(node => types.includes(node.type));
}

// Filter nodes by status (completed/archived)
export function filterNodesByStatus(
  nodes: GraphNode[],
  showCompleted: boolean,
  showArchived: boolean
): GraphNode[] {
  return nodes.filter(node => {
    // Check for completed status
    if (!showCompleted && node.status === 'completed') {
      return false;
    }
    // Check for archived status
    if (!showArchived && node.status === 'archived') {
      return false;
    }
    return true;
  });
}

// Filter links to only include those with existing nodes
export function filterLinksForNodes(links: GraphLink[], nodeIds: Set<string>): GraphLink[] {
  return links.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return nodeIds.has(sourceId) && nodeIds.has(targetId);
  });
}

// Get all node types
export function getAllNodeTypes(): GraphNodeType[] {
  return ['area', 'resource', 'goal', 'project', 'todo', 'note'];
}

// Check if node is a top-level node (area or resource)
export function isTopLevelNode(node: GraphNode): boolean {
  return node.type === 'area' || node.type === 'resource';
}

// Check if node is a leaf node (todo or note)
export function isLeafNode(node: GraphNode): boolean {
  return node.type === 'todo' || node.type === 'note';
}
