/**
 * useGraphData Hook - 그래프 뷰 데이터 변환
 * 기존 스토어 데이터를 GraphNode/GraphLink 형식으로 변환
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useAuth } from '@/app/context/AuthContext';
import { fetchAllGraphRelations } from '@/lib/supabase/graph-relations';
import type { GraphNode, GraphLink, GraphData, GraphRelations } from '@/types/graph';
import {
  areaToGraphNode,
  resourceToGraphNode,
  goalToGraphNode,
  projectToGraphNode,
  todoToGraphNode,
  noteToGraphNode,
  createHierarchyLink,
  createReferenceLink,
} from '@/lib/graph-utils';

interface UseGraphDataReturn {
  graphData: GraphData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGraphData(): UseGraphDataReturn {
  const { user } = useAuth();
  const userId = user?.id;

  // 스토어 데이터
  const { areas, fetchAreas, loading: areasLoading } = useAreaStore();
  const { resources, fetchResources, loading: resourcesLoading } = useResourceStore();
  const { goals, fetchGoals, loading: goalsLoading } = useGoalStore();
  const { projects, fetchProjects, loading: projectsLoading } = useProjectStore();
  const { todos, fetchAllTodos } = useTodoStore();
  const { notes, fetchNotes, loading: notesLoading } = useNoteStore();

  // 관계 데이터 상태
  const [relations, setRelations] = useState<GraphRelations>({
    todoProjects: [],
    todoNotes: [],
    projectNotes: [],
    noteNotes: [],
  });
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초기 데이터 로딩
  useEffect(() => {
    if (!userId) return;

    const loadAllData = async () => {
      try {
        // 기존 스토어 데이터가 비어있으면 로드
        if (areas.length === 0) await fetchAreas(userId);
        if (resources.length === 0) await fetchResources(userId);
        if (goals.length === 0) await fetchGoals(userId);
        if (projects.length === 0) await fetchProjects(userId);
        if (todos.length === 0) await fetchAllTodos();
        if (notes.length === 0) await fetchNotes(userId);
      } catch (err) {
        console.error('❌ 그래프 데이터 로딩 실패:', err);
        setError(err instanceof Error ? err.message : '데이터 로딩 실패');
      }
    };

    loadAllData();
  }, [userId, areas.length, resources.length, goals.length, projects.length, todos.length, notes.length, fetchAreas, fetchResources, fetchGoals, fetchProjects, fetchAllTodos, fetchNotes]);

  // 관계 데이터 로딩 (프로젝트와 노트가 로드된 후)
  useEffect(() => {
    if (!userId || projects.length === 0) return;

    const loadRelations = async () => {
      setRelationsLoading(true);
      try {
        const projectIds = projects.map((p) => p.id);
        const noteIds = notes.map((n) => n.id);
        const graphRelations = await fetchAllGraphRelations(userId, projectIds, noteIds);
        setRelations(graphRelations);
      } catch (err) {
        console.error('❌ 관계 데이터 로딩 실패:', err);
        setError(err instanceof Error ? err.message : '관계 데이터 로딩 실패');
      } finally {
        setRelationsLoading(false);
      }
    };

    loadRelations();
  }, [userId, projects.length, notes.length]);

  // 노드 변환
  const nodes: GraphNode[] = useMemo(() => {
    const allNodes: GraphNode[] = [];

    // Area 노드
    areas.forEach((area) => {
      allNodes.push(areaToGraphNode(area));
    });

    // Resource 노드
    resources.forEach((resource) => {
      allNodes.push(resourceToGraphNode(resource));
    });

    // Goal 노드
    goals.forEach((goal) => {
      allNodes.push(goalToGraphNode(goal));
    });

    // Project 노드
    projects.forEach((project) => {
      allNodes.push(projectToGraphNode(project));
    });

    // Todo 노드
    todos.forEach((todo) => {
      allNodes.push(todoToGraphNode(todo));
    });

    // Note 노드
    notes.forEach((note) => {
      allNodes.push(noteToGraphNode(note));
    });

    console.log('📊 그래프 노드 생성:', {
      areas: areas.length,
      resources: resources.length,
      goals: goals.length,
      projects: projects.length,
      todos: todos.length,
      notes: notes.length,
      total: allNodes.length,
    });

    return allNodes;
  }, [areas, resources, goals, projects, todos, notes]);

  // 링크 생성
  const links: GraphLink[] = useMemo(() => {
    const allLinks: GraphLink[] = [];
    const nodeIdSet = new Set(nodes.map((n) => n.id));

    // Goal → Area/Resource 링크 (계층)
    // Note: Goal has area_id and resource_id instead of area_resource_id
    goals.forEach((goal) => {
      const areaOrResourceId = goal.area_id || goal.resource_id;
      if (areaOrResourceId && nodeIdSet.has(areaOrResourceId)) {
        allLinks.push(createHierarchyLink(areaOrResourceId, goal.id));
      }
    });

    // Project → Goal 링크 (계층)
    projects.forEach((project) => {
      if (project.goal_id && nodeIdSet.has(project.goal_id)) {
        allLinks.push(createHierarchyLink(project.goal_id, project.id));
      }
      // Goal이 없는 프로젝트 → Area/Resource 직접 연결
      if (!project.goal_id && project.area_resource_id && nodeIdSet.has(project.area_resource_id)) {
        allLinks.push(createHierarchyLink(project.area_resource_id, project.id));
      }
    });

    // Todo → Project 링크 (todo_projects 테이블)
    relations.todoProjects.forEach((rel) => {
      if (nodeIdSet.has(rel.todo_id) && nodeIdSet.has(rel.project_id)) {
        allLinks.push(createHierarchyLink(rel.project_id, rel.todo_id));
      }
    });

    // Todo → Note 링크 (todo_notes 테이블) - reference 타입
    relations.todoNotes.forEach((rel) => {
      if (nodeIdSet.has(rel.todo_id) && nodeIdSet.has(rel.note_id)) {
        allLinks.push(createReferenceLink(rel.todo_id, rel.note_id));
      }
    });

    // Project → Note 링크 (project_notes 테이블) - hierarchy 타입
    relations.projectNotes.forEach((rel) => {
      if (nodeIdSet.has(rel.project_id) && nodeIdSet.has(rel.note_id)) {
        allLinks.push(createHierarchyLink(rel.project_id, rel.note_id));
      }
    });

    // Note → Note 링크 (note_notes 테이블) - reference 타입
    relations.noteNotes.forEach((rel) => {
      if (nodeIdSet.has(rel.source_note_id) && nodeIdSet.has(rel.target_note_id)) {
        allLinks.push(createReferenceLink(rel.source_note_id, rel.target_note_id));
      }
    });

    console.log('🔗 그래프 링크 생성:', {
      goalToArea: goals.filter((g) => g.area_id || g.resource_id).length,
      projectToGoal: projects.filter((p) => p.goal_id).length,
      projectToArea: projects.filter((p) => !p.goal_id && p.area_resource_id).length,
      todoProjects: relations.todoProjects.length,
      todoNotes: relations.todoNotes.length,
      projectNotes: relations.projectNotes.length,
      noteNotes: relations.noteNotes.length,
      total: allLinks.length,
    });

    return allLinks;
  }, [nodes, goals, projects, relations]);

  // 데이터 새로고침
  const refetch = useCallback(async () => {
    if (!userId) return;

    setError(null);
    try {
      await Promise.all([
        fetchAreas(userId),
        fetchResources(userId),
        fetchGoals(userId),
        fetchProjects(userId),
        fetchAllTodos(),
        fetchNotes(userId),
      ]);

      const projectIds = projects.map((p) => p.id);
      const noteIds = notes.map((n) => n.id);
      const graphRelations = await fetchAllGraphRelations(userId, projectIds, noteIds);
      setRelations(graphRelations);
    } catch (err) {
      console.error('❌ 그래프 데이터 새로고침 실패:', err);
      setError(err instanceof Error ? err.message : '새로고침 실패');
    }
  }, [userId, projects, notes, fetchAreas, fetchResources, fetchGoals, fetchProjects, fetchAllTodos, fetchNotes]);

  // 로딩 상태 통합
  const loading = areasLoading || resourcesLoading || goalsLoading || projectsLoading || notesLoading || relationsLoading;

  // 그래프 데이터 반환
  const graphData: GraphData = useMemo(() => ({
    nodes,
    links,
  }), [nodes, links]);

  return {
    graphData,
    loading,
    error,
    refetch,
  };
}
