/**
 * useGraphData Hook - 그래프 뷰 데이터 변환 (Todos + Notes)
 * todoStore와 noteStore 데이터를 GraphNode 형식으로 변환
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/noteStore';
import { useAuth } from '@/app/context/AuthContext';
import { fetchTodoNoteRelations, fetchNoteNoteRelations } from '@/lib/supabase/graph-relations';
import type { GraphNode, GraphLink, GraphData, TodoNoteRelation, NoteNoteRelation } from '@/types/graph';
import type { Note as SecondBrainNote } from '@/types/second-brain';
import { todoToGraphNode, noteToGraphNode, createReferenceLink } from '@/lib/graph-utils';

interface UseGraphDataReturn {
  graphData: GraphData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// 노트 관계 데이터 타입
interface NoteRelations {
  todoNotes: TodoNoteRelation[];
  noteNotes: NoteNoteRelation[];
}

export function useGraphData(): UseGraphDataReturn {
  const { user } = useAuth();
  const userId = user?.id;

  // todoStore 데이터
  const { todos, fetchAllTodos } = useTodoStore();

  // noteStore 데이터
  const { notes, getNotes, loading: notesLoading } = useNoteStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 관계 데이터 상태
  const [relations, setRelations] = useState<NoteRelations>({
    todoNotes: [],
    noteNotes: [],
  });
  const [relationsLoading, setRelationsLoading] = useState(false);

  // 초기 데이터 로딩
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAllTodos(),
          getNotes(userId),
        ]);
      } catch (err) {
        console.error('❌ 그래프 데이터 로딩 실패:', err);
        setError(err instanceof Error ? err.message : '데이터 로딩 실패');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, fetchAllTodos, getNotes]);

  // 관계 데이터 로딩 (노트가 로드된 후)
  useEffect(() => {
    if (!userId || notes.length === 0) return;

    const loadRelations = async () => {
      // temp ID 필터링 (optimistic update 대기)
      const validNotes = notes.filter((n) => !n.id.startsWith('temp-'));
      if (validNotes.length === 0) return;

      setRelationsLoading(true);
      try {
        const noteIds = validNotes.map((n) => n.id);
        const [todoNotes, noteNotes] = await Promise.all([
          fetchTodoNoteRelations(userId),
          fetchNoteNoteRelations(noteIds),
        ]);
        setRelations({ todoNotes, noteNotes });
      } catch (err) {
        console.error('❌ 관계 데이터 로딩 실패:', err);
        setError(err instanceof Error ? err.message : '관계 데이터 로딩 실패');
      } finally {
        setRelationsLoading(false);
      }
    };

    loadRelations();
  }, [userId, notes.length]);

  // 노드 변환
  const nodes: GraphNode[] = useMemo(() => {
    const allNodes: GraphNode[] = [];

    // Todo 노드
    todos.forEach((todo) => {
      allNodes.push(todoToGraphNode(todo));
    });

    // Note 노드
    notes.forEach((note) => {
      // NoteStoreNote를 SecondBrainNote로 변환하여 noteToGraphNode에 전달
      allNodes.push(noteToGraphNode({
        ...note,
        title: note.title || '',
        note_category: note.note_category || 'none',
      } as SecondBrainNote));
    });

    console.log('📊 그래프 노드 생성:', {
      todos: todos.length,
      notes: notes.length,
      total: allNodes.length,
    });

    return allNodes;
  }, [todos, notes]);

  // 링크 생성
  const links: GraphLink[] = useMemo(() => {
    const allLinks: GraphLink[] = [];
    const nodeIdSet = new Set(nodes.map((n) => n.id));

    // Todo → Note 링크 (reference 타입)
    relations.todoNotes.forEach((rel) => {
      if (nodeIdSet.has(rel.todo_id) && nodeIdSet.has(rel.note_id)) {
        allLinks.push(createReferenceLink(rel.todo_id, rel.note_id));
      }
    });

    // Note → Note 링크 (reference 타입)
    relations.noteNotes.forEach((rel) => {
      if (nodeIdSet.has(rel.source_note_id) && nodeIdSet.has(rel.target_note_id)) {
        allLinks.push(createReferenceLink(rel.source_note_id, rel.target_note_id));
      }
    });

    console.log('🔗 그래프 링크 생성:', {
      todoNotes: relations.todoNotes.length,
      noteNotes: relations.noteNotes.length,
      total: allLinks.length,
    });

    return allLinks;
  }, [nodes, relations]);

  // 데이터 새로고침
  const refetch = useCallback(async () => {
    if (!userId) return;

    setError(null);
    setLoading(true);
    try {
      await Promise.all([
        fetchAllTodos(),
        getNotes(userId),
      ]);

      // 관계 데이터도 새로고침
      const validNotes = notes.filter((n) => !n.id.startsWith('temp-'));
      if (validNotes.length > 0) {
        const noteIds = validNotes.map((n) => n.id);
        const [todoNotes, noteNotes] = await Promise.all([
          fetchTodoNoteRelations(userId),
          fetchNoteNoteRelations(noteIds),
        ]);
        setRelations({ todoNotes, noteNotes });
      }
    } catch (err) {
      console.error('❌ 그래프 데이터 새로고침 실패:', err);
      setError(err instanceof Error ? err.message : '새로고침 실패');
    } finally {
      setLoading(false);
    }
  }, [userId, fetchAllTodos, getNotes, notes]);

  // 로딩 상태 통합
  const isLoading = loading || notesLoading || relationsLoading;

  // 그래프 데이터 반환
  const graphData: GraphData = useMemo(() => ({
    nodes,
    links,
  }), [nodes, links]);

  return {
    graphData,
    loading: isLoading,
    error,
    refetch,
  };
}
