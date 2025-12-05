'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { Plus, Lightbulb, Pencil, Target, BookOpen } from 'lucide-react';
import type { CreateAreaInput, AreaResource, CreateResourceInput, Goal, Project, Note } from '@/types/second-brain';
import type { SecondBrainItemType } from '@/types/settings';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { useModalStore } from '@/state/stores/modalStore';
import AreaResourceEditModal from '@/components/ui/AreaResourceEditModal';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';

// 탭 타입
type TabType = 'area' | 'resource';

// 추천 영역 프리셋
const AREA_PRESETS = [
  { title: '직장', icon: 'lucide-Briefcase', color: '#DBAC6C' },
  { title: '가족', icon: 'lucide-Users', color: '#FF6B6B' },
  { title: '건강', icon: 'lucide-Heart', color: '#4ECDC4' },
  { title: '나', icon: 'lucide-Sparkles', color: '#C7B3E5' },
  { title: '자기개발', icon: 'lucide-Book', color: '#F38181' },
  { title: '취미', icon: 'lucide-Palette', color: '#AA96DA' },
];

// 추천 자원 프리셋
const RESOURCE_PRESETS = [
  { title: '독서', icon: 'lucide-Book', color: '#FF6B6B' },
  { title: '프로그래밍', icon: 'lucide-Laptop', color: '#4ECDC4' },
  { title: '영화', icon: 'lucide-Film', color: '#95E1D3' },
  { title: '여행', icon: 'lucide-Plane', color: '#F38181' },
  { title: '요리', icon: 'lucide-ChefHat', color: '#AA96DA' },
  { title: '음악', icon: 'lucide-Music', color: '#DBAC6C' },
];

type Preset = {
  title: string;
  icon: string;
  color: string;
};

export default function AreasResourcesPage() {
  const { appUser } = useAuth();
  const { createArea, updateArea, deleteArea, areas, fetchAreas, archiveArea, unarchiveArea } = useAreaStore();
  const { createResource, updateResource, deleteResource, resources, fetchResources, archiveResource, unarchiveResource } = useResourceStore();
  const { goals, fetchGoals, createGoal, updateGoal } = useGoalStore();
  const { projects, fetchProjects, createProject, updateProject } = useProjectStore();
  const { notes, fetchNotes, createNote, updateNote } = useNoteStore();
  const { openModal, closeModal } = useModalStore();

  // 현재 탭
  const [activeTab, setActiveTab] = useState<TabType>('area');

  // 편집 관련 state
  const [editingItem, setEditingItem] = useState<(AreaResource & { isNew?: boolean }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [itemType, setItemType] = useState<SecondBrainItemType>('area');
  const [isCreating, setIsCreating] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AreaResource | null>(null);

  // 추천 항목 추가 다이얼로그
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Preset[]>([]);

  // 연결된 목표/프로젝트/노트 ID
  const [linkedGoalIds, setLinkedGoalIds] = useState<string[]>([]);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>([]);

  // Capacitor: 마지막 방문 페이지 저장
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/areas-resources');
  }, []);

  useEffect(() => {
    if (appUser?.id) {
      fetchAreas(appUser.id);
      fetchResources(appUser.id);
      fetchGoals(appUser.id);
      fetchProjects(appUser.id);
      fetchNotes(appUser.id);
    }
  }, [appUser?.id, fetchAreas, fetchResources, fetchGoals, fetchProjects, fetchNotes]);

  // 편집 모달 상태 관리
  useEffect(() => {
    if (editDialogOpen) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [editDialogOpen, openModal, closeModal]);

  // 추천 모달 상태 관리
  useEffect(() => {
    if (presetDialogOpen) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [presetDialogOpen, openModal, closeModal]);

  // 현재 탭에 해당하는 아이템들
  const currentItems = activeTab === 'area' ? areas : resources;
  const currentPresets = activeTab === 'area' ? AREA_PRESETS : RESOURCE_PRESETS;

  // 새 항목 추가 핸들러
  const handleAdd = async () => {
    if (isCreating || !appUser?.id) return;

    setIsCreating(true);
    try {
      if (activeTab === 'area') {
        await createArea(appUser.id, {
          title: '새 영역',
          icon: 'lucide-MapPin',
          color: '#A8DADC',
          order_index: areas.length,
          is_pinned: false,
        });
      } else {
        await createResource(appUser.id, {
          title: '새 자원',
          icon: 'lucide-BookOpen',
          color: '#A8DADC',
          order_index: resources.length,
          is_pinned: false,
        });
      }
    } catch (error) {
      console.error('생성 실패:', error);
      alert('생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 편집 핸들러
  const handleEdit = (item: AreaResource) => {
    setEditingItem({ ...item, isNew: false });
    setItemType(item.status === 'archived' ? 'archive' : activeTab);

    // 연결된 항목들 설정
    const connectedGoalIds = goals.filter(g => g.area_id === item.id || g.resource_id === item.id).map(g => g.id);
    const connectedProjectIds = projects.filter(p => p.area_resource_id === item.id).map(p => p.id);
    const connectedNoteIds = notes.filter(n => n.area_resource_id === item.id).map(n => n.id);

    setLinkedGoalIds(connectedGoalIds);
    setLinkedProjectIds(connectedProjectIds);
    setLinkedNoteIds(connectedNoteIds);

    setEditDialogOpen(true);
  };

  // 상태 변경 핸들러
  const handleItemTypeChange = async (newType: SecondBrainItemType) => {
    setItemType(newType);
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.title.trim() || !appUser?.id) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      const originalType: SecondBrainItemType = editingItem.status === 'archived' ? 'archive' : activeTab;

      if (originalType === itemType) {
        // 같은 타입 내에서 수정
        if (activeTab === 'area') {
          await updateArea(appUser.id, editingItem.id, {
            title: editingItem.title,
            icon: editingItem.icon,
            color: editingItem.color,
          });
        } else {
          await updateResource(appUser.id, editingItem.id, {
            title: editingItem.title,
            icon: editingItem.icon,
            color: editingItem.color,
          });
        }
      } else {
        // 타입 변경
        if (itemType === 'resource' && activeTab === 'area') {
          // Area → Resource 변환
          const resourceData: CreateResourceInput = {
            title: editingItem.title,
            icon: editingItem.icon,
            color: editingItem.color,
            order_index: 0,
            is_pinned: false,
            status: 'resource',
          };
          await deleteArea(appUser.id, editingItem.id);
          await createResource(appUser.id, resourceData);
        } else if (itemType === 'area' && activeTab === 'resource') {
          // Resource → Area 변환
          const areaData: CreateAreaInput = {
            title: editingItem.title,
            icon: editingItem.icon,
            color: editingItem.color,
            order_index: 0,
            is_pinned: false,
            status: 'area',
          };
          await deleteResource(appUser.id, editingItem.id);
          await createArea(appUser.id, areaData);
        } else if (itemType === 'archive') {
          if (activeTab === 'area') {
            await archiveArea(appUser.id, editingItem.id);
          } else {
            await archiveResource(appUser.id, editingItem.id);
          }
        } else if ((itemType === 'area' || itemType === 'resource') && originalType === 'archive') {
          if (activeTab === 'area') {
            await unarchiveArea(appUser.id, editingItem.id);
          } else {
            await unarchiveResource(appUser.id, editingItem.id);
          }
        }
      }

      setEditDialogOpen(false);
      setEditingItem(null);
      await fetchAreas(appUser.id);
      await fetchResources(appUser.id);
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingItem(null);
  };

  // 삭제 핸들러
  const handleDeleteFromModal = () => {
    if (editingItem) {
      setEditDialogOpen(false);
      setItemToDelete(editingItem);
      setDeleteConfirmOpen(true);
    }
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!itemToDelete || !appUser?.id) return;

    try {
      if (activeTab === 'area') {
        await deleteArea(appUser.id, itemToDelete.id);
      } else {
        await deleteResource(appUser.id, itemToDelete.id);
      }
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      await fetchAreas(appUser.id);
      await fetchResources(appUser.id);
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  // 추천 항목 다이얼로그
  const handleOpenPresetDialog = () => {
    setSelectedPresets([]);
    setPresetDialogOpen(true);
  };

  const handleTogglePreset = (preset: Preset) => {
    if (selectedPresets.some((p) => p.title === preset.title)) {
      setSelectedPresets(selectedPresets.filter((p) => p.title !== preset.title));
    } else {
      setSelectedPresets([...selectedPresets, preset]);
    }
  };

  const handleAddPresets = async () => {
    if (selectedPresets.length === 0 || !appUser?.id) {
      alert('최소 1개 이상 선택해주세요.');
      return;
    }

    try {
      for (const [index, preset] of selectedPresets.entries()) {
        if (activeTab === 'area') {
          await createArea(appUser.id, {
            title: preset.title,
            icon: preset.icon,
            color: preset.color,
            order_index: areas.length + index,
            is_pinned: false,
          });
        } else {
          await createResource(appUser.id, {
            title: preset.title,
            icon: preset.icon,
            color: preset.color,
            order_index: resources.length + index,
            is_pinned: false,
          });
        }
      }

      setPresetDialogOpen(false);
      setSelectedPresets([]);
      await fetchAreas(appUser.id);
      await fetchResources(appUser.id);
    } catch (error) {
      console.error('추가 실패:', error);
      alert('추가에 실패했습니다.');
    }
  };

  const handleCancelPresets = () => {
    setPresetDialogOpen(false);
    setSelectedPresets([]);
  };

  // 목표/프로젝트/노트 생성 핸들러
  const handleCreateGoal = async (title: string): Promise<Goal> => {
    if (!appUser?.id || !editingItem) throw new Error('인증 필요');
    const newGoal = await createGoal(appUser.id, {
      title,
      icon: 'lucide-Target',
      color: editingItem.color,
      status: 'not_started',
      [activeTab === 'area' ? 'area_id' : 'resource_id']: editingItem.id,
    });
    return newGoal;
  };

  const handleCreateProject = async (title: string): Promise<Project> => {
    if (!appUser?.id || !editingItem) throw new Error('인증 필요');
    const newProject = await createProject(appUser.id, {
      title,
      icon: 'lucide-FolderOpen',
      color: editingItem.color,
      status: 'not_started',
      area_resource_id: editingItem.id,
      order_index: projects.length,
    });
    return newProject;
  };

  const handleCreateNote = async (title: string): Promise<Note> => {
    if (!appUser?.id || !editingItem) throw new Error('인증 필요');
    const newNote = await createNote(appUser.id, {
      title,
      content: '',
      area_resource_id: editingItem.id,
      is_pinned: false,
      note_category: 'none',
    });
    return newNote;
  };

  // 연결 즉시 저장 핸들러들
  const handleGoalImmediateSave = async (goalIds: string[]) => {
    if (!appUser?.id || !editingItem) return;
    const currentLinkedGoals = goals.filter(g => g.area_id === editingItem.id || g.resource_id === editingItem.id);
    const goalsToLink = goalIds.filter(id => !currentLinkedGoals.some(g => g.id === id));
    const goalsToUnlink = currentLinkedGoals.filter(g => !goalIds.includes(g.id));

    for (const goalId of goalsToLink) {
      await updateGoal(appUser.id, goalId, { [activeTab === 'area' ? 'area_id' : 'resource_id']: editingItem.id });
    }
    for (const goal of goalsToUnlink) {
      await updateGoal(appUser.id, goal.id, { area_id: undefined, resource_id: undefined });
    }
    await fetchGoals(appUser.id);
  };

  const handleProjectImmediateSave = async (projectIds: string[]) => {
    if (!appUser?.id || !editingItem) return;
    const currentLinkedProjects = projects.filter(p => p.area_resource_id === editingItem.id);
    const projectsToLink = projectIds.filter(id => !currentLinkedProjects.some(p => p.id === id));
    const projectsToUnlink = currentLinkedProjects.filter(p => !projectIds.includes(p.id));

    for (const projectId of projectsToLink) {
      await updateProject(appUser.id, projectId, { area_resource_id: editingItem.id });
    }
    for (const project of projectsToUnlink) {
      await updateProject(appUser.id, project.id, { area_resource_id: undefined });
    }
    await fetchProjects(appUser.id);
  };

  const handleNoteImmediateSave = async (noteIds: string[]) => {
    if (!appUser?.id || !editingItem) return;
    const currentLinkedNotes = notes.filter(n => n.area_resource_id === editingItem.id);
    const notesToLink = noteIds.filter(id => !currentLinkedNotes.some(n => n.id === id));
    const notesToUnlink = currentLinkedNotes.filter(n => !noteIds.includes(n.id));

    for (const noteId of notesToLink) {
      await updateNote(appUser.id, noteId, { area_resource_id: editingItem.id });
    }
    for (const note of notesToUnlink) {
      await updateNote(appUser.id, note.id, { area_resource_id: undefined });
    }
    await fetchNotes(appUser.id);
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
            <p className="text-sm text-base-content/70 mt-1">
              {activeTab === 'area'
                ? '내가 책임져야 하는 영역들을 관리하세요'
                : '관심 있는 주제와 자료를 관리하세요'}
            </p>
          </div>
        </div>

        {/* 탭 전환 */}
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="flex gap-2 p-1 bg-base-300 rounded-lg">
            <button
              onClick={() => setActiveTab('area')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-medium transition-all ${
                activeTab === 'area'
                  ? 'bg-primary text-primary-content'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              <Target className="w-4 h-4" />
              책임 ({areas.length})
            </button>
            <button
              onClick={() => setActiveTab('resource')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-medium transition-all ${
                activeTab === 'resource'
                  ? 'bg-primary text-primary-content'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              자원 ({resources.length})
            </button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {activeTab === 'area' ? '책임 영역' : '자원'} 목록 ({currentItems.length}개)
              </h2>
              <div className="flex gap-2">
                <button onClick={handleOpenPresetDialog} className="btn btn-ghost btn-sm rounded-full">
                  <Lightbulb className="w-4 h-4" />
                  추천 항목
                </button>
                <button
                  onClick={handleAdd}
                  className="btn btn-primary btn-sm rounded-full"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isCreating ? '생성 중...' : '추가'}
                </button>
              </div>
            </div>

            {currentItems.length === 0 ? (
              <div className="card bg-base-100">
                <div className="card-body text-center py-12">
                  <p className="text-base-content/60">
                    아직 {activeTab === 'area' ? '영역' : '자원'}이 없습니다. 새로 추가해보세요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {currentItems.map((item) => {
                  const IconComponent = getUnifiedIcon(item.icon as UnifiedIconKey);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleEdit(item)}
                      className="flex flex-col p-3 sm:p-4 md:p-3 lg:p-2.5 bg-base-100 rounded-lg aspect-square transition-all cursor-pointer hover:shadow-md group"
                    >
                      <div className="font-bold text-left text-xl sm:text-lg md:text-base lg:text-sm mb-5 sm:mb-4 md:mb-3 lg:mb-2 line-clamp-2">
                        {item.title}
                      </div>
                      <div className="flex items-end justify-between flex-1">
                        <div
                          className="w-16 h-16 sm:w-18 sm:h-18 md:w-16 md:h-16 lg:w-14 lg:h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{ backgroundColor: item.color }}
                        >
                          <IconComponent className="w-8 h-8 sm:w-9 sm:h-9 md:w-8 md:h-8 lg:w-7 lg:h-7 text-white" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                          className="btn btn-md sm:btn-md md:btn-md lg:btn-sm btn-circle bg-black text-white hover:bg-black/80 border-none"
                        >
                          <Pencil className="w-4.5 h-4.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-4 lg:h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 편집 다이얼로그 */}
        <AreaResourceEditModal
          open={editDialogOpen && !!editingItem}
          editingItem={editingItem!}
          itemType={itemType}
          pageType={activeTab}
          onCancel={handleCancelEdit}
          onSave={handleSaveEdit}
          onDelete={handleDeleteFromModal}
          onItemChange={setEditingItem}
          onItemTypeChange={handleItemTypeChange}
          goals={goals}
          projects={projects}
          notes={notes}
          linkedGoalIds={linkedGoalIds}
          linkedProjectIds={linkedProjectIds}
          linkedNoteIds={linkedNoteIds}
          onLinkedGoalsChange={setLinkedGoalIds}
          onLinkedProjectsChange={setLinkedProjectIds}
          onLinkedNotesChange={setLinkedNoteIds}
          onCreateGoal={handleCreateGoal}
          onCreateProject={handleCreateProject}
          onCreateNote={handleCreateNote}
          onGoalImmediateSave={handleGoalImmediateSave}
          onProjectImmediateSave={handleProjectImmediateSave}
          onNoteImmediateSave={handleNoteImmediateSave}
        />

        {/* 삭제 확인 다이얼로그 */}
        {deleteConfirmOpen && itemToDelete && (
          <dialog open className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">
                {activeTab === 'area' ? '영역' : '자원'} 삭제
              </h3>
              <p className="mb-6">
                <strong>{itemToDelete.title}</strong>을(를) 삭제하시겠습니까?
                <br />
                <span className="text-sm text-base-content/60">
                  이 작업은 되돌릴 수 없습니다.
                </span>
              </p>
              <div className="modal-action">
                <button onClick={handleCancelDelete} className="btn btn-ghost">
                  취소
                </button>
                <button onClick={handleConfirmDelete} className="btn btn-error">
                  삭제
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={handleCancelDelete} />
          </dialog>
        )}

        {/* 추천 항목 추가 다이얼로그 */}
        {presetDialogOpen && (
          <dialog open className="modal modal-open">
            <div className={`modal-box w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
              <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-200 z-10`}>
                <button onClick={handleCancelPresets} className="btn btn-primary btn-sm rounded-full">
                  취소
                </button>
                <h3 className="font-bold text-lg">
                  추천 {activeTab === 'area' ? '영역' : '자원'} 추가
                </h3>
                <button
                  onClick={handleAddPresets}
                  disabled={selectedPresets.length === 0}
                  className="btn btn-primary btn-sm rounded-full"
                >
                  {selectedPresets.length > 0 ? `${selectedPresets.length}개 추가` : '선택'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <p className="text-sm text-base-content/70 mb-6">
                    시작하기 좋은 {activeTab === 'area' ? '영역' : '자원'}들을 준비했어요.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {currentPresets.map((preset) => {
                      const isSelected = selectedPresets.some((p) => p.title === preset.title);
                      const IconComponent = getUnifiedIcon(preset.icon as UnifiedIconKey);

                      return (
                        <button
                          key={preset.title}
                          onClick={() => handleTogglePreset(preset)}
                          className={`card transition-all w-full ${
                            isSelected
                              ? 'bg-primary text-primary-content ring-2 ring-primary'
                              : 'bg-base-100'
                          }`}
                        >
                          <div className="card-body p-4">
                            <div className="flex items-start justify-between">
                              <IconComponent className="w-8 h-8" />
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-primary-content text-primary flex items-center justify-center">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <h3 className="font-semibold mt-2">{preset.title}</h3>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedPresets.length > 0 && (
                    <div className="alert alert-info mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">
                        {selectedPresets.length}개가 선택되었습니다
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-backdrop" onClick={handleCancelPresets} />
          </dialog>
        )}
      </div>
    </AuthGuard>
  );
}
