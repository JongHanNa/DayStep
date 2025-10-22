'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import MarkdownEditor from './MarkdownEditor';
import { Badge } from '@/components/ui/badge';
import {
  StickyNote,
  Pin,
  PinOff,
  Link,
  X,
  Trash2,
  Search,
  Plus,
  Edit3,
  Check,
  Save,
  Clock,
  AlertCircle,
  Tag,
  Hash,
  Repeat,
  Calendar,
} from 'lucide-react';
import TaskLinkModal from './TaskLinkModal';
import { cn } from '@/lib/utils';
import { useNoteStore, Note } from '@/state/stores/noteStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useMemoTagStore } from '@/state/stores/memoTagStore';
import { useModalStore } from '@/state/stores/modalStore';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TAG_COLOR_PALETTE } from '@/lib/memo-tag-constants';

interface NoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NoteSheet: React.FC<NoteSheetProps> = ({ open, onOpenChange }) => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Modal Store (하단 네비게이션 숨김용)
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  // Note Store
  const {
    loading,
    error,
    filters,
    createNote,
    updateNote,
    deleteNote,
    pinNote,
    unpinNote,
    setFilter,
    getFilteredNotes,
    setSelectedNoteForEdit,
    initialize,
    ui: { selectedNoteForEdit },
  } = useNoteStore();

  // Todo Store (할일 연결용)
  const { todos, fetchTodoById } = useTodoStore();

  // 노트에 연결된 할일을 별도로 관리 (현재 뷰에 없는 할일도 표시하기 위함)
  const [linkedTodosMap, setLinkedTodosMap] = useState<Map<string, any>>(new Map());

  // Memo Tag Store (태그 관리용)
  const {
    tags,
    templates,
    getTagsForMemo,
    getFilteredTags,
    getFilteredTemplates,
    updateMemoTags,
    updateMemoTagsWithTemplates,
    loadAllTags,
    loadTemplates,
    loadMemoTagLinks,
    createTagFromTemplate,
    createDefaultTagsForUser,
    createTag,
    templatesLoading
  } = useMemoTagStore();

  // 로컬 상태
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);
  const [taskLinkModalOpen, setTaskLinkModalOpen] = useState(false);
  const [selectedMemoForLink, setSelectedMemoForLink] = useState<Note | null>(null);

  // 새 태그 생성 모달 상태
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  // 통합된 노트 편집 모달 상태
  const [memoEditorOpen, setMemoEditorOpen] = useState(false);
  const [memoEditorMode, setMemoEditorMode] = useState<'create' | 'edit'>('create');
  const [memoContent, setMemoContent] = useState('');
  const [originalMemoContent, setOriginalMemoContent] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [currentEditingMemo, setCurrentEditingMemo] = useState<Note | null>(null);
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false);

  // 태그 관련 상태
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 실제 사용자 태그만
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]); // 선택된 템플릿 태그들
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [tagSelectorTab, setTagSelectorTab] = useState<'user' | 'templates'>('user'); // 탭 상태
  const [showTemplateCreation, setShowTemplateCreation] = useState(false);
  const [processingTemplates, setProcessingTemplates] = useState<Set<string>>(new Set()); // 처리 중인 템플릿 ID들
  const [addedTemplates, setAddedTemplates] = useState<Set<string>>(new Set()); // 방금 추가된 템플릿 ID들


  // 자동 저장 기능
  const autoSave = useAutoSave(memoContent, {
    onSave: async () => {
      if (!memoContent.trim()) {
        throw new Error('내용을 입력해주세요');
      }

      // Capacitor 백업 인증 패턴으로 사용자 ID 확보
      let userId: string | null = null;

      try {
        const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
        if (session?.user?.id) {
          userId = session.user.id;
        }
      } catch (authError) {
        console.log('⚠️ 웹 세션 확보 실패:', authError);
      }

      if (!userId) {
        try {
          const { isCapacitorEnvironment } = await import('@/lib/supabaseWebViewHelper');
          if (isCapacitorEnvironment()) {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key: 'supabase_auth_session' });
            if (value) {
              const session = JSON.parse(value);
              userId = session.user?.id;
            }
          }
        } catch (capacitorError) {
          console.log('⚠️ Capacitor 백업 인증 실패:', capacitorError);
        }
      }

      if (!userId) {
        throw new Error('사용자 인증이 필요합니다');
      }

      if (memoEditorMode === 'edit' && currentEditingMemo) {
        await updateNote({
          id: currentEditingMemo.id,
          content: memoContent.trim(),
        });

        // 새로운 방식: 사용자 태그와 템플릿 태그 별도 처리
        if (selectedTags.length > 0 || selectedTemplates.length > 0 || getTagsForMemo(currentEditingMemo.id).length > 0) {
          await updateMemoTagsWithTemplates(currentEditingMemo.id, selectedTags, selectedTemplates, userId);
        }
      } else {
        const newMemo = await createNote({
          content: memoContent.trim(),
          related_task_id: selectedTaskId,
          user_id: userId,
        });

        // 새 노트에 태그 연결 (사용자 태그 + 템플릿 태그 직접 연결)
        if ((selectedTags.length > 0 || selectedTemplates.length > 0) && newMemo) {
          await updateMemoTagsWithTemplates(newMemo.id, selectedTags, selectedTemplates, userId);
        }

        // 새 노트 생성 시 편집 모드로 전환
        setCurrentEditingMemo(newMemo);
        setMemoEditorMode('edit');
        setOriginalMemoContent(memoContent.trim());
      }
    },
    onDelete: async () => {
      // 편집 모드에서만 삭제 (새 노트 생성 중에는 삭제하지 않음)
      if (memoEditorMode === 'edit' && currentEditingMemo) {
        console.log('🗑️ [Note] 빈 노트 자동 삭제:', currentEditingMemo.id);
        await deleteNote(currentEditingMemo.id);

        // 삭제 완료 토스트 알림
        toast({
          title: '빈 노트가 삭제되었습니다',
          description: '내용이 없는 노트가 자동으로 삭제되었습니다.',
        });

        // 편집 상태 초기화 (모달은 닫지 않고 새 노트 모드로 전환)
        setCurrentEditingMemo(null);
        setMemoEditorMode('create');
        setOriginalMemoContent('');
      }
    },
    debounceMs: 1000,
    enabled: memoEditorOpen && isAuthenticated && hasUserEditedContent
  });

  // 필터링된 노트 목록
  const filteredNotes = getFilteredNotes();

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    if (open && isAuthenticated && user?.id) {
      initialize(user.id);
      loadAllTags(user.id); // 태그도 함께 로드
    }
  }, [open, isAuthenticated, user?.id, initialize, loadAllTags]);

  // 노트에 연결된 할일 로드 (현재 뷰에 없는 할일도 가져오기)
  useEffect(() => {
    const loadLinkedTodos = async () => {
      const newLinkedTodosMap = new Map(linkedTodosMap);
      let hasUpdates = false;

      for (const memo of filteredNotes) {
        if (memo.related_task_id && !linkedTodosMap.has(memo.related_task_id)) {
          // todos 배열에서 먼저 찾기
          const existingTodo = todos.find(t => t.id === memo.related_task_id);
          if (existingTodo) {
            newLinkedTodosMap.set(memo.related_task_id, existingTodo);
            hasUpdates = true;
          } else {
            // todos 배열에 없으면 DB에서 직접 가져오기
            try {
              const linkedTodo = await fetchTodoById(memo.related_task_id);
              if (linkedTodo) {
                newLinkedTodosMap.set(memo.related_task_id, linkedTodo);
                hasUpdates = true;
              }
            } catch (error) {
              console.warn(`연결된 할일 로드 실패 (${memo.related_task_id}):`, error);
            }
          }
        }
      }

      if (hasUpdates) {
        setLinkedTodosMap(newLinkedTodosMap);
      }
    };

    if (filteredNotes.length > 0) {
      loadLinkedTodos();
    }
  }, [filteredNotes, todos, fetchTodoById]);

  // 노트 편집 시 기존 태그 로드 (사용자 태그와 템플릿 태그 분리)
  useEffect(() => {
    if (currentEditingMemo && user?.id) {
      const memoTags = getTagsForMemo(currentEditingMemo.id);

      // 사용자 태그와 템플릿 태그 분리
      const userTags = memoTags.filter(tag => !tag.is_template);
      const templateTags = memoTags.filter(tag => tag.is_template);

      // 사용자 태그 ID 설정
      setSelectedTags(userTags.map(tag => tag.id));

      // 템플릿 태그는 원본 template_id로 설정
      setSelectedTemplates(templateTags.map(tag => tag.template_id).filter(Boolean) as string[]);
    } else {
      setSelectedTags([]); // 새 노트 생성 시 태그 초기화
      setSelectedTemplates([]); // 새 노트 생성 시 템플릿 초기화
    }
  }, [currentEditingMemo, getTagsForMemo, user?.id]);

  // 모달 닫힐 때 템플릿 상태 초기화
  useEffect(() => {
    if (!open) {
      setProcessingTemplates(new Set());
      setAddedTemplates(new Set());
      setSelectedTemplates([]); // 선택된 템플릿 태그도 초기화
    }
  }, [open]);

  // 템플릿 로딩 (공용 데이터이므로 인증 불필요)
  useEffect(() => {
    if (open && isAuthenticated && user?.id) {
      console.log('🔄 템플릿 및 태그 링크 로딩 시작...');
      loadTemplates(); // 템플릿도 함께 로드
      loadMemoTagLinks(user.id); // 노트 태그 링크도 함께 로드
    }
  }, [open, isAuthenticated, user?.id, loadTemplates, loadMemoTagLinks]);

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({ searchQuery });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setFilter]);

  // 수정 모달 모니터링
  useEffect(() => {
    if (selectedNoteForEdit && !memoEditorOpen) {
      openMemoEditor('edit', selectedNoteForEdit);
    }
  }, [selectedNoteForEdit, memoEditorOpen]);

  // 통합된 노트 편집기 열기
  const openMemoEditor = (mode: 'create' | 'edit', memo?: Note) => {
    setMemoEditorMode(mode);

    if (mode === 'edit' && memo) {
      setCurrentEditingMemo(memo);
      setMemoContent(memo.content);
      setOriginalMemoContent(memo.content);
      setSelectedTaskId(memo.related_task_id || null);
      // 기존 노트 편집 시에는 사용자 편집으로 간주하지 않음 (초기값 로딩이므로)
      setHasUserEditedContent(false);
    } else {
      setCurrentEditingMemo(null);
      setMemoContent('');
      setOriginalMemoContent('');
      setSelectedTaskId(null);
      // 새 노트 생성 시에도 사용자 편집으로 간주하지 않음 (초기 상태)
      setHasUserEditedContent(false);
    }

    setMemoEditorOpen(true);
    setShowExitConfirm(false);
  };

  // 노트 편집기 닫기
  const closeMemoEditor = () => {
    setMemoEditorOpen(false);
    setSelectedNoteForEdit(null);
    setMemoContent('');
    setOriginalMemoContent('');
    setSelectedTaskId(null);
    setCurrentEditingMemo(null);
    setShowExitConfirm(false);
    setHasUserEditedContent(false);
  };

  // 변경사항 확인 (자동 저장 시에는 저장 대기중인 경우만 변경사항으로 간주)
  const hasChanges = memoContent !== originalMemoContent && autoSave.saveStatus === 'pending';


  // 노트 편집 취소 시도
  const handleCancelMemoEdit = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      closeMemoEditor();
    }
  };

  // 변경사항 저장하고 닫기
  const handleSaveAndClose = async () => {
    if (autoSave.saveStatus === 'pending') {
      // 대기중인 자동 저장을 즉시 실행
      autoSave.triggerSave();
      // 저장 완료까지 잠시 기다림
      setTimeout(() => {
        closeMemoEditor();
      }, 500);
    } else {
      closeMemoEditor();
    }
  };

  // 변경사항 무시하고 닫기
  const handleDiscardAndClose = () => {
    closeMemoEditor();
  };

  // 노트 삭제
  const handleDeleteMemo = async (memoId: string) => {
    try {
      await deleteNote(memoId);
      toast({
        title: '노트가 삭제되었습니다',
        description: '선택한 노트가 삭제되었습니다.',
      });
    } catch (error) {
      toast({
        title: '노트 삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 노트 핀 토글
  const handleTogglePin = async (memo: Note) => {
    try {
      if (memo.is_pinned) {
        await unpinNote(memo.id);
      } else {
        await pinNote(memo.id);
      }
    } catch (error) {
      toast({
        title: '핀 설정 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 할일 연결/해제
  const handleToggleTaskLink = async (memo: Note) => {
    setSelectedMemoForLink(memo);
    setTaskLinkModalOpen(true);
  };

  // 새 태그 생성
  const handleCreateTag = async () => {
    if (!user?.id || !newTagName.trim()) {
      toast({
        title: '오류',
        description: '태그 이름을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const tagData = {
        name: newTagName.trim(),
        color: newTagColor,
        category: 'general', // 기본값으로 설정
        position: tags.length,
        is_active: true,
      };

      const newTag = await createTag(tagData, user.id);

      if (newTag) {
        toast({
          title: '성공',
          description: `"${newTag.name}" 태그가 생성되었습니다.`,
        });

        // 모달 닫기 및 상태 리셋
        setShowCreateTagModal(false);
        setNewTagName('');
        setNewTagColor('#3B82F6');
      }
    } catch (error) {
      toast({
        title: '태그 생성 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };


  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
    {open && (
      <dialog open className="modal modal-open">
        <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
          {/* 헤더 (닫기-제목-추가) */}
          <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
            <button onClick={() => onOpenChange(false)} className="btn btn-primary btn-sm rounded-full">
              닫기
            </button>
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">퀵노트</h3>
              <Badge variant="outline" className="text-xs">
                {filteredNotes.length}개
              </Badge>
            </div>
            <button onClick={() => openMemoEditor('create')} className="btn btn-primary btn-sm rounded-full">
              <Plus className="h-4 w-4 mr-1" />
              추가
            </button>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
              {/* 검색 및 필터 영역 */}
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#f8f8f8' }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="노트 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background"
                  />
                </div>
              </div>

              {/* 노트 목록 영역 */}
              <div className="space-y-3">
                {loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    노트를 불러오는 중...
                  </div>
                )}

                {error && (
                  <div className="text-center py-8 text-red-500">
                    {error}
                  </div>
                )}

                {!loading && !error && filteredNotes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <StickyNote className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm">아직 노트가 없습니다</p>
                    <p className="text-xs text-muted-foreground/70">위에서 첫 번째 노트를 작성해보세요</p>
                  </div>
                )}

                {filteredNotes.map((memo: Note) => {
                  // 연결된 할일 찾기: todos 배열 우선, 없으면 linkedTodosMap에서 찾기
                  const linkedTodo = memo.related_task_id
                    ? (todos.find(todo => todo.id === memo.related_task_id) || linkedTodosMap.get(memo.related_task_id))
                    : null;

                  // related_task_id가 있으면 연결됨으로 표시 (todos 스토어에 없어도)
                  const isLinked = memo.related_task_id || memo.linked_timeline_task_id;

                  return (
                    <div
                      key={memo.id}
                      className={cn(
                        'group p-3 py-2.5 rounded-lg bg-white cursor-pointer shadow-sm',
                        'hover:shadow-md transition-all duration-200',
                        memo.is_pinned && 'ring-1 ring-brand/30 bg-brand/5'
                      )}
                      onClick={() => openMemoEditor('edit', memo)}
                    >
                      <div className="flex items-center gap-3">
                        {/* 색상 인디케이터 - 타임라인과 동일한 패턴 */}
                        <div
                          className="w-2 h-8 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: memo.is_pinned
                              ? '#f97316' // orange-500 - 핀된 노트
                              : isLinked
                                ? '#22c55e' // green-500 - 연결된 노트
                                : '#3b82f6' // blue-500 - 기본 노트
                          }}
                        />

                        {/* 노트 콘텐츠 영역 */}
                        <div className="flex-1 min-w-0">
                          {/* 노트 헤더 */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {memo.is_pinned && (
                                <Pin className="h-3 w-3 text-brand" />
                              )}

                              {isLinked && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <Link className="h-3 w-3" />
                                  연결됨
                                </Badge>
                              )}

                              {/* 노트 태그들 표시 - 타임라인과 동일한 배지 형태 */}
                              {(() => {
                                const memoTags = getTagsForMemo(memo.id);
                                if (memoTags.length === 0) return null;

                                return (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {memoTags.slice(0, 2).map((tag) => (
                                      <div
                                        key={tag.id}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                                        title={`${tag.name}${tag.is_template ? ' (템플릿)' : ''}`}
                                      >
                                        <div
                                          className="w-2 h-2 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="truncate max-w-[50px]">{tag.name}</span>
                                        {tag.is_template && (
                                          <span className="text-blue-500 text-[10px] font-bold">(T)</span>
                                        )}
                                      </div>
                                    ))}
                                    {memoTags.length > 2 && (
                                      <span className="text-xs text-gray-400 px-1">
                                        +{memoTags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePin(memo);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                {memo.is_pinned ? (
                                  <PinOff className="h-3 w-3" />
                                ) : (
                                  <Pin className="h-3 w-3" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTaskLink(memo);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                {memo.related_task_id ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Link className="h-3 w-3" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMemoEditor('edit', memo);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMemo(memo.id);
                                }}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* 노트 내용 */}
                          <div className="space-y-2">
                            <div className="relative max-h-24 overflow-hidden">
                              <p className="text-sm text-foreground whitespace-pre-wrap">
                                {memo.content}
                              </p>
                              {memo.content.length > 150 && (
                                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent flex items-end justify-center">
                                  <span className="text-xs text-muted-foreground bg-card px-1">
                                    ...더보기
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 연결된 할일 정보 */}
                            {linkedTodo && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                                  <Link className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    연결된 할일: {linkedTodo.content}
                                  </span>
                                </div>

                                {/* 할일 타입 및 연결 방식 상세 정보 */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {(() => {
                                    // 반복 할일 여부 판별 (camelCase 속성 사용)
                                    const isRecurringTodo = linkedTodo.recurrencePattern && linkedTodo.recurrencePattern !== 'none';

                                    // 반복 할일 연결 방식 판별
                                    let connectionType: 'single' | 'recurring' | 'instance' | null = null;
                                    if (isRecurringTodo) {
                                      if (memo.recurrence_type === 'single') {
                                        connectionType = 'single'; // 동일노트
                                      } else if (memo.recurrence_type === 'recurring') {
                                        connectionType = 'recurring'; // 반복노트
                                      } else if (memo.linked_date) {
                                        connectionType = 'instance'; // 특정날짜
                                      }
                                    }

                                    return (
                                      <>
                                        {/* 할일 타입 배지 */}
                                        <Badge
                                          variant="outline"
                                          className="text-xs flex items-center gap-1"
                                          style={{
                                            borderColor: isRecurringTodo ? '#a855f7' : '#3b82f6',
                                            color: isRecurringTodo ? '#a855f7' : '#3b82f6'
                                          }}
                                        >
                                          {isRecurringTodo ? (
                                            <>
                                              <Repeat className="h-3 w-3" />
                                              반복 할일
                                            </>
                                          ) : (
                                            <>
                                              <Hash className="h-3 w-3" />
                                              일반 할일
                                            </>
                                          )}
                                        </Badge>

                                        {/* 반복 할일인 경우 연결 방식 배지 */}
                                        {isRecurringTodo && connectionType && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs flex items-center gap-1"
                                            style={{
                                              borderColor: connectionType === 'single' ? '#06b6d4' :
                                                          connectionType === 'recurring' ? '#8b5cf6' :
                                                          '#10b981',
                                              color: connectionType === 'single' ? '#06b6d4' :
                                                    connectionType === 'recurring' ? '#8b5cf6' :
                                                    '#10b981'
                                            }}
                                          >
                                            {connectionType === 'single' && '동일노트'}
                                            {connectionType === 'recurring' && '반복노트'}
                                            {connectionType === 'instance' && (
                                              <>
                                                <Calendar className="h-3 w-3" />
                                                특정날짜
                                              </>
                                            )}
                                          </Badge>
                                        )}

                                        {/* 특정 날짜 정보 표시 */}
                                        {memo.linked_date && connectionType === 'instance' && (
                                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                            {format(new Date(memo.linked_date), 'M월 d일', { locale: ko })}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* 노트 메타 정보 */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {format(new Date(memo.created_at), 'M월 d일 HH:mm', { locale: ko })}
                              </span>

                              {memo.updated_at !== memo.created_at && (
                                <span>
                                  수정: {format(new Date(memo.updated_at), 'HH:mm', { locale: ko })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })}
              </div>
          </div>
        </div>
        <div className="modal-backdrop" onClick={() => onOpenChange(false)} />
      </dialog>
    )}

    {/* 통합된 노트 편집기 모달 */}
    {memoEditorOpen && (
      <dialog open className="modal modal-open">
        <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
          {/* 헤더 (취소-제목-연결+자동저장) */}
          <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
            <button onClick={handleCancelMemoEdit} className="btn btn-primary btn-sm rounded-full">
              취소
            </button>
            <h3 className="font-bold text-lg">
              {memoEditorMode === 'edit' ? '노트 수정' : '새 노트'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const memoForLink = memoEditorMode === 'edit' && currentEditingMemo
                    ? currentEditingMemo
                    : {
                        id: 'new',
                        content: memoContent,
                        related_task_id: selectedTaskId,
                      } as Note;
                  setSelectedMemoForLink(memoForLink);
                  setTaskLinkModalOpen(true);
                }}
                className="btn btn-primary btn-sm rounded-full"
              >
                <Link className="h-4 w-4 mr-1" />
                연결
              </button>
              {/* 자동 저장 상태 표시 */}
              <div className="flex items-center gap-2">
                {autoSave.saveStatus === 'pending' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 animate-pulse" />
                    <span>저장 대기중...</span>
                  </div>
                )}

                {autoSave.saveStatus === 'saving' && (
                  <div className="flex items-center gap-1 text-xs text-brand">
                    <Save className="h-3 w-3 animate-spin" />
                    <span>{!memoContent.trim() && currentEditingMemo ? '삭제 중...' : '저장 중...'}</span>
                  </div>
                )}

                {autoSave.saveStatus === 'saved' && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" />
                    <span>{!memoContent.trim() && currentEditingMemo ? '삭제됨' : '저장됨'}</span>
                  </div>
                )}

                {autoSave.saveStatus === 'error' && (
                  <button
                    onClick={autoSave.triggerSave}
                    className="btn btn-ghost btn-sm text-error"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    재시도
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {/* 할일 연결 상태 표시 */}
                  {selectedTaskId && (
                    <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          할일 연결됨
                        </span>
                      </div>

                      {(() => {
                        // 연결된 할일 찾기: todos 배열 우선, 없으면 linkedTodosMap에서 찾기
                        const linkedTodo = todos.find(todo => todo.id === selectedTaskId)
                          || linkedTodosMap.get(selectedTaskId);
                        if (!linkedTodo) return null;

                        // 반복 할일 여부 판별 (camelCase 속성 사용)
                        const isRecurringTodo = linkedTodo.recurrencePattern && linkedTodo.recurrencePattern !== 'none';

                        // 반복 할일 연결 방식 판별 (편집 모달에서는 currentEditingMemo 사용)
                        let connectionType: 'single' | 'recurring' | 'instance' | null = null;
                        if (isRecurringTodo && currentEditingMemo) {
                          if (currentEditingMemo.recurrence_type === 'single') {
                            connectionType = 'single'; // 동일노트
                          } else if (currentEditingMemo.recurrence_type === 'recurring') {
                            connectionType = 'recurring'; // 반복노트
                          } else if (currentEditingMemo.linked_date) {
                            connectionType = 'instance'; // 특정날짜
                          }
                        }

                        return (
                          <div className="space-y-2">
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                              {linkedTodo.content}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* 할일 타입 배지 */}
                              <Badge
                                variant="outline"
                                className="text-xs flex items-center gap-1"
                                style={{
                                  borderColor: isRecurringTodo ? '#a855f7' : '#3b82f6',
                                  color: isRecurringTodo ? '#a855f7' : '#3b82f6'
                                }}
                              >
                                {isRecurringTodo ? (
                                  <>
                                    <Repeat className="h-3 w-3" />
                                    반복 할일
                                  </>
                                ) : (
                                  <>
                                    <Hash className="h-3 w-3" />
                                    일반 할일
                                  </>
                                )}
                              </Badge>

                              {/* 반복 할일인 경우 연결 방식 배지 */}
                              {isRecurringTodo && connectionType && (
                                <Badge
                                  variant="outline"
                                  className="text-xs flex items-center gap-1"
                                  style={{
                                    borderColor: connectionType === 'single' ? '#06b6d4' :
                                                connectionType === 'recurring' ? '#8b5cf6' :
                                                '#10b981',
                                    color: connectionType === 'single' ? '#06b6d4' :
                                          connectionType === 'recurring' ? '#8b5cf6' :
                                          '#10b981'
                                  }}
                                >
                                  {connectionType === 'single' && '동일노트'}
                                  {connectionType === 'recurring' && '반복노트'}
                                  {connectionType === 'instance' && (
                                    <>
                                      <Calendar className="h-3 w-3" />
                                      특정날짜
                                    </>
                                  )}
                                </Badge>
                              )}

                              {/* 특정 날짜 정보 표시 */}
                              {currentEditingMemo?.linked_date && connectionType === 'instance' && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  {format(new Date(currentEditingMemo.linked_date), 'M월 d일', { locale: ko })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 태그 선택 섹션 */}
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">태그</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTagSelector(!showTagSelector)}
                        className="text-xs h-7 px-2"
                      >
                        {showTagSelector ? '숨기기' : '선택'}
                      </Button>
                    </div>

                    {/* 선택된 태그들 표시 (사용자 태그 + 템플릿 태그) */}
                    {(selectedTags.length > 0 || selectedTemplates.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {/* 사용자 태그 표시 */}
                        {selectedTags.map((tagId) => {
                          const tag = getFilteredTags().find(t => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <Badge
                              key={`user-${tag.id}`}
                              variant="outline"
                              className="text-xs flex items-center gap-1 px-2 py-1"
                              style={{ borderColor: tag.color, color: tag.color }}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                              <button
                                onClick={async () => {
                                  const newSelectedTags = selectedTags.filter(id => id !== tagId);
                                  setSelectedTags(newSelectedTags);

                                  // 편집 모드이고 노트가 있으면 즉시 DB 업데이트
                                  if (memoEditorMode === 'edit' && currentEditingMemo && user?.id) {
                                    await updateMemoTagsWithTemplates(
                                      currentEditingMemo.id,
                                      newSelectedTags,
                                      selectedTemplates,
                                      user.id
                                    );
                                  }
                                }}
                                className="ml-1 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}

                        {/* 템플릿 태그 표시 */}
                        {selectedTemplates.map((templateId) => {
                          const template = getFilteredTemplates().find(t => t.id === templateId);
                          if (!template) return null;
                          return (
                            <Badge
                              key={`template-${template.id}`}
                              variant="outline"
                              className="text-xs flex items-center gap-1 px-2 py-1 border-dashed"
                              style={{ borderColor: template.color, color: template.color }}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: template.color }}
                              />
                              {template.name}
                              <span className="text-xs opacity-60">(템플릿)</span>
                              <button
                                onClick={async () => {
                                  const newSelectedTemplates = selectedTemplates.filter(id => id !== templateId);
                                  setSelectedTemplates(newSelectedTemplates);

                                  // 편집 모드이고 노트가 있으면 즉시 DB 업데이트
                                  if (memoEditorMode === 'edit' && currentEditingMemo && user?.id) {
                                    await updateMemoTagsWithTemplates(
                                      currentEditingMemo.id,
                                      selectedTags,
                                      newSelectedTemplates,
                                      user.id
                                    );
                                  }
                                }}
                                className="ml-1 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {/* 태그 선택기 */}
                    {showTagSelector && (
                      <div className="space-y-3">
                        {/* 탭 헤더 */}
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                          <button
                            onClick={() => setTagSelectorTab('user')}
                            className={cn(
                              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
                              tagSelectorTab === 'user'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            )}
                          >
                            내 태그 ({getFilteredTags().length})
                          </button>
                          <button
                            onClick={() => setTagSelectorTab('templates')}
                            className={cn(
                              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
                              tagSelectorTab === 'templates'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            )}
                          >
                            템플릿 ({getFilteredTemplates().length})
                          </button>
                        </div>

                        {/* 디버깅용 강제 로드 버튼 */}
                        <button
                          onClick={() => {
                            console.log('🔧 강제 템플릿 재로드 시작');
                            loadTemplates(true);
                          }}
                          className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded"
                        >
                          🔧 템플릿 강제 로드 (디버그)
                        </button>

                        {/* 사용자 태그 탭 */}
                        {tagSelectorTab === 'user' && (
                          <div className="space-y-2">
                            {getFilteredTags().length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {getFilteredTags().map((tag) => {
                                  const isSelected = selectedTags.includes(tag.id);
                                  return (
                                    <button
                                      key={tag.id}
                                      onClick={async () => {
                                        const newSelectedTags = isSelected
                                          ? selectedTags.filter(id => id !== tag.id)
                                          : [...selectedTags, tag.id];

                                        setSelectedTags(newSelectedTags);

                                        // 편집 모드이고 노트가 있으면 즉시 DB 업데이트
                                        if (memoEditorMode === 'edit' && currentEditingMemo && user?.id) {
                                          await updateMemoTagsWithTemplates(
                                            currentEditingMemo.id,
                                            newSelectedTags,
                                            selectedTemplates,
                                            user.id
                                          );
                                        }
                                      }}
                                      className={cn(
                                        'flex items-center gap-2 p-2 rounded-md border transition-all text-left',
                                        isSelected
                                          ? 'border-blue-300 bg-blue-50'
                                          : 'border-gray-200 hover:border-gray-300 bg-white'
                                      )}
                                    >
                                      <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: tag.color }}
                                      />
                                      <span className="text-sm truncate">{tag.name}</span>
                                      {isSelected && (
                                        <Check className="h-3 w-3 text-blue-600 ml-auto flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-gray-500 text-sm">
                                <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>아직 생성된 태그가 없습니다</p>
                                <p className="text-xs text-gray-400 mb-3">나만의 태그를 만들어보세요</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCreateTagModal(true)}
                                  className="mt-2"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  새 태그 만들기
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 템플릿 태그 탭 */}
                        {tagSelectorTab === 'templates' && (
                          <div className="space-y-3">
                            {templatesLoading ? (
                              <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-sm text-gray-500 mt-2">템플릿 로딩 중...</p>
                              </div>
                            ) : getFilteredTemplates().length > 0 ? (
                              <div className="space-y-3">
                                {/* 카테고리별 템플릿 표시 */}
                                {['productivity', 'personal', 'priority', 'type'].map(category => {
                                  const categoryTemplates = getFilteredTemplates().filter(t => t.category === category);
                                  if (categoryTemplates.length === 0) return null;

                                  const categoryInfo = {
                                    productivity: { name: '생산성', icon: '💼' },
                                    personal: { name: '개인', icon: '👤' },
                                    priority: { name: '우선순위', icon: '⭐' },
                                    type: { name: '유형', icon: '🏷️' }
                                  }[category];

                                  return (
                                    <div key={category} className="space-y-2">
                                      <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                        <span>{categoryInfo?.icon}</span>
                                        {categoryInfo?.name}
                                      </h4>
                                      <div className="grid grid-cols-2 gap-2">
                                        {categoryTemplates.map((template) => (
                                          <button
                                            key={template.id}
                                            onClick={async () => {
                                              const isSelected = selectedTemplates.includes(template.id);

                                              const newSelectedTemplates = isSelected
                                                ? selectedTemplates.filter(id => id !== template.id)
                                                : [...selectedTemplates, template.id];

                                              setSelectedTemplates(newSelectedTemplates);

                                              // 성공 피드백 (추가 시에만)
                                              if (!isSelected) {
                                                setAddedTemplates(prev => new Set([...prev, template.id]));
                                                toast({
                                                  title: "✨ 템플릿 태그 선택됨",
                                                  description: `"${template.name}" 태그가 노트에 추가됩니다`
                                                });
                                                setTimeout(() => {
                                                  setAddedTemplates(prev => {
                                                    const newSet = new Set(prev);
                                                    newSet.delete(template.id);
                                                    return newSet;
                                                  });
                                                }, 2000);
                                              }

                                              // 편집 모드이고 노트가 있으면 즉시 DB 업데이트
                                              if (memoEditorMode === 'edit' && currentEditingMemo && user?.id) {
                                                await updateMemoTagsWithTemplates(
                                                  currentEditingMemo.id,
                                                  selectedTags,
                                                  newSelectedTemplates,
                                                  user.id
                                                );
                                              }
                                            }}
                                            className={cn(
                                              "flex items-center gap-2 p-2 rounded-md border transition-all text-left relative overflow-hidden",
                                              selectedTemplates.includes(template.id)
                                                ? "border-blue-400 bg-blue-50"
                                                : addedTemplates.has(template.id)
                                                ? "border-green-300 bg-green-50 scale-105"
                                                : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                                            )}
                                          >
                                            <div
                                              className="w-3 h-3 rounded-full flex-shrink-0"
                                              style={{ backgroundColor: template.color }}
                                            />
                                            <span className="text-sm truncate">{template.name}</span>

                                            {/* 상태별 아이콘 */}
                                            {selectedTemplates.includes(template.id) ? (
                                              <Check className="h-3 w-3 text-blue-600 ml-auto flex-shrink-0" />
                                            ) : addedTemplates.has(template.id) ? (
                                              <Check className="h-3 w-3 text-green-600 ml-auto flex-shrink-0" />
                                            ) : (
                                              <Plus className="h-3 w-3 text-gray-400 ml-auto flex-shrink-0" />
                                            )}

                                            {/* 성공 시 반짝이는 효과 */}
                                            {addedTemplates.has(template.id) && (
                                              <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-blue-100 opacity-50 animate-pulse rounded-md"></div>
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>사용 가능한 템플릿이 없습니다</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 노트 내용 입력 */}
                  <MarkdownEditor
                    value={memoContent}
                    onChange={(value) => {
                      setMemoContent(value);
                      // 사용자가 실제로 내용을 변경했을 때만 편집 상태로 표시
                      if (!hasUserEditedContent && value !== originalMemoContent) {
                        setHasUserEditedContent(true);
                      }
                    }}
                    placeholder="노트 내용을 입력하세요..."
                    className="text-sm"
                    minHeight={600}
                  />
                </div>
          </div>
        </div>
        <div className="modal-backdrop" onClick={handleCancelMemoEdit} />
      </dialog>
    )}


    {/* 변경사항 확인 다이얼로그 */}
    {showExitConfirm && (
      <dialog open className="modal modal-open">
        <div className="modal-box">
          {/* 헤더 (빈공간-제목-닫기) */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-base-300">
            <div className="w-12"></div>
            <h3 className="font-bold text-lg">변경사항이 있습니다</h3>
            <button
              onClick={() => setShowExitConfirm(false)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 콘텐츠 */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {autoSave.saveStatus === 'pending'
                ? '저장 대기중인 변경사항이 있습니다. 어떻게 하시겠어요?'
                : '노트에 변경사항이 있습니다. 어떻게 하시겠어요?'
              }
            </p>

            <div className="flex flex-col gap-2">
              <button onClick={handleSaveAndClose} className="btn btn-primary w-full">
                <Check className="h-4 w-4 mr-2" />
                저장하고 닫기
              </button>

              <button onClick={handleDiscardAndClose} className="btn btn-outline w-full">
                <X className="h-4 w-4 mr-2" />
                저장하지 않고 닫기
              </button>

              <button onClick={() => setShowExitConfirm(false)} className="btn btn-ghost w-full">
                계속 편집하기
              </button>
            </div>
          </div>
        </div>
        <div className="modal-backdrop" onClick={() => setShowExitConfirm(false)} />
      </dialog>
    )}

    {/* 할일 연결 모달 */}
    <TaskLinkModal
      open={taskLinkModalOpen}
      onOpenChange={(open) => {
        setTaskLinkModalOpen(open);
        // 할일 연결 모달이 닫힐 때 새로운 연결 상태를 노트 편집기에 반영
        if (!open && selectedMemoForLink?.id === 'new' && memoEditorOpen) {
          // TaskLinkModal에서 할일이 연결된 경우 selectedTaskId가 자동으로 업데이트됨
        }
      }}
      memoId={selectedMemoForLink?.id || ''}
      currentLinkedTaskId={selectedMemoForLink?.related_task_id || null}
      currentLinkedDate={selectedMemoForLink?.linked_date || null}
      currentTimelineTaskId={selectedMemoForLink?.linked_timeline_task_id || null}
    />

    {/* 새 태그 생성 모달 */}
    {showCreateTagModal && (
      <dialog open className="modal modal-open">
        <div className="modal-box">
          {/* 헤더 (취소-제목-생성) */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-base-300">
            <button
              onClick={() => {
                setShowCreateTagModal(false);
                setNewTagName('');
                setNewTagColor('#3B82F6');
              }}
              className="btn btn-primary btn-sm rounded-full"
            >
              취소
            </button>

            <h3 className="font-bold text-lg">새 태그 만들기</h3>

            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="btn btn-primary btn-sm rounded-full"
            >
              <Check className="h-4 w-4 mr-1" />
              생성
            </button>
          </div>

          {/* 콘텐츠 */}
          <div className="space-y-6">
            {/* 태그 이름 입력 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                태그 이름 *
              </label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="예: 중요, 업무, 개인"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-brand"
                maxLength={50}
                autoFocus
              />
              <div className="text-xs text-gray-500">
                {newTagName.length}/50
              </div>
            </div>

            {/* 태그 색상 선택 */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                태그 색상
              </label>
              <div className="grid grid-cols-7 gap-2">
                {TAG_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      newTagColor === color
                        ? "border-gray-900 dark:border-gray-100 scale-110"
                        : "border-gray-300 dark:border-gray-600 hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* 선택된 색상 미리보기 */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">미리보기:</span>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: newTagColor }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {newTagName || '태그 이름'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-backdrop" onClick={() => {
          setShowCreateTagModal(false);
          setNewTagName('');
          setNewTagColor('#3B82F6');
        }} />
      </dialog>
    )}
    </>
  );
};

export default NoteSheet;