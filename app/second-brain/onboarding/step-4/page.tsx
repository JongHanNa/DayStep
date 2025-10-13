'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { CreateProjectInput, CreateNoteInput, NoteType } from '@/types/second-brain';
import OnboardingStepNav from '@/components/onboarding/OnboardingStepNav';

export default function OnboardingStep4Page() {
  const router = useRouter();
  const { createProject, projects } = useProjectStore();
  const { goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { createNote } = useNoteStore();
  const { completeStep, incrementCreatedCount } = useOnboardingStore();

  const [selectedProjects, setSelectedProjects] = useState<Array<{
    title: string;
    goalId?: string;
    status: 'not_started' | 'active' | 'on_hold' | 'completed' | 'archived';
    paraSelection?: string; // 'area-{id}' | 'resource-{id}' | ''
    startDate?: string;
    targetEndDate?: string;
    notes: Array<{
      title: string;
      content: string;
      memoType: NoteType;
      paraSelection?: string;
      isPinned: boolean;
    }>;
  }>>([]);

  const [newProject, setNewProject] = useState({
    title: '',
    goalId: '',
    status: 'not_started' as 'not_started' | 'active' | 'on_hold' | 'completed' | 'archived',
    paraSelection: '',
    startDate: '',
    targetEndDate: '',
    notes: [] as Array<{
      title: string;
      content: string;
      memoType: NoteType;
      paraSelection?: string;
      isPinned: boolean;
    }>,
  });

  const [showNoteSection, setShowNoteSection] = useState(false);

  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    memoType: 'note' as NoteType,
    paraSelection: '',
    isPinned: false,
  });

  useEffect(() => {
    fetchGoals();
    fetchAreas();
    fetchResources();
  }, [fetchGoals, fetchAreas, fetchResources]);

  const handleAddNote = () => {
    if (!newNote.title.trim()) {
      alert('노트 제목을 입력해주세요.');
      return;
    }

    setNewProject({
      ...newProject,
      notes: [...newProject.notes, newNote],
    });
    setNewNote({
      title: '',
      content: '',
      memoType: 'note',
      paraSelection: '',
      isPinned: false,
    });
  };

  const handleRemoveNote = (noteIndex: number) => {
    setNewProject({
      ...newProject,
      notes: newProject.notes.filter((_, i) => i !== noteIndex),
    });
  };

  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      alert('프로젝트 제목을 입력해주세요.');
      return;
    }

    setSelectedProjects([...selectedProjects, newProject]);
    setNewProject({
      title: '',
      goalId: '',
      status: 'not_started',
      paraSelection: '',
      startDate: '',
      targetEndDate: '',
      notes: [],
    });
    setShowNoteSection(false);
  };

  const handleRemoveProject = (index: number) => {
    setSelectedProjects(selectedProjects.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (selectedProjects.length === 0) {
      // 프로젝트 없이 건너뛰기 허용
      await completeStep(4);
      router.push('/second-brain/onboarding/step-5');
      return;
    }

    try {
      // 프로젝트들을 생성
      for (const [index, project] of selectedProjects.entries()) {
        // paraSelection에서 area_id 또는 resource_id 추출
        let area_id: string | undefined;
        let resource_id: string | undefined;

        if (project.paraSelection) {
          if (project.paraSelection.startsWith('area-')) {
            area_id = project.paraSelection.replace('area-', '');
          } else if (project.paraSelection.startsWith('resource-')) {
            resource_id = project.paraSelection.replace('resource-', '');
          }
        }

        const projectData: CreateProjectInput = {
          title: project.title,
          goal_id: project.goalId || undefined,
          area_id,
          resource_id,
          status: project.status,
          start_date: project.startDate || undefined,
          target_end_date: project.targetEndDate || undefined,
          icon: '📁',
          color: '#95E1D3',
          order_index: index,
        };
        const createdProject = await createProject(projectData);

        // 프로젝트에 연결된 노트들 생성
        for (const note of project.notes) {
          // 노트의 paraSelection 파싱
          let note_area_id: string | undefined;
          let note_resource_id: string | undefined;

          if (note.paraSelection) {
            if (note.paraSelection.startsWith('area-')) {
              note_area_id = note.paraSelection.replace('area-', '');
            } else if (note.paraSelection.startsWith('resource-')) {
              note_resource_id = note.paraSelection.replace('resource-', '');
            }
          }

          const noteData: CreateNoteInput = {
            title: note.title,
            content: note.content,
            memo_type: note.memoType,
            project_id: createdProject.id,
            area_id: note_area_id,
            resource_id: note_resource_id,
            is_pinned: note.isPinned,
            tags: [],
          };
          await createNote(noteData);
        }
      }

      // 온보딩 4단계에서 생성한 프로젝트 개수 업데이트
      incrementCreatedCount(4, selectedProjects.length);

      // 온보딩 4단계 완료
      await completeStep(4);

      // 다음 단계로 이동
      router.push('/second-brain/onboarding/step-5');
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    }
  };

  const handleSkip = async () => {
    await completeStep(4);
    router.push('/second-brain/onboarding/step-5');
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* 스텝 네비게이션 */}
      <div className="sticky top-0 z-10">
        <OnboardingStepNav />
      </div>

      {/* 페이지 헤더 */}
      <div className="bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-2">프로젝트 설정하기</h1>
          <p className="text-sm text-base-content/70">
            진행 중인 프로젝트를 추가하세요
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 이미 생성된 프로젝트 */}
        {projects.length > 0 && (
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title">이미 생성된 프로젝트 ({projects.length}개)</h2>
              <div className="space-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center gap-2 p-2 bg-base-100 rounded">
                    <span>{project.icon}</span>
                    <span className="text-sm font-medium">{project.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <strong>프로젝트란?</strong> 두 단계 이상의 할일로 구성된 묶음입니다.
            <br />
            예: 앱 출시하기, 마라톤 완주, 자격증 합격
          </div>
        </div>

        {/* 프로젝트 추가 폼 */}
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <h2 className="card-title">새 프로젝트 추가</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">프로젝트 제목</span>
              </label>
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="예: DayStep 앱 출시하기"
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">연결할 목표 (선택)</span>
              </label>
              <select
                value={newProject.goalId}
                onChange={(e) => setNewProject({ ...newProject, goalId: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.icon} {goal.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">진행상황</span>
              </label>
              <select
                value={newProject.status}
                onChange={(e) => setNewProject({ ...newProject, status: e.target.value as 'not_started' | 'active' | 'on_hold' | 'completed' | 'archived' })}
                className="select select-bordered"
              >
                <option value="not_started">시작안함</option>
                <option value="active">진행중</option>
                <option value="on_hold">중단</option>
                <option value="completed">완료</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">연결할 영역/자원 (선택)</span>
              </label>
              <select
                value={newProject.paraSelection}
                onChange={(e) => setNewProject({ ...newProject, paraSelection: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                <optgroup label="영역">
                  {areas.map((area) => (
                    <option key={area.id} value={`area-${area.id}`}>
                      {area.icon} {area.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="자원">
                  {resources.map((resource) => (
                    <option key={resource.id} value={`resource-${resource.id}`}>
                      {resource.icon} {resource.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">시작일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">종료일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={newProject.targetEndDate}
                  onChange={(e) => setNewProject({ ...newProject, targetEndDate: e.target.value })}
                  className="input input-bordered"
                />
              </div>
            </div>

            {/* 노트 섹션 */}
            <div className="border-t border-base-300 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setShowNoteSection(!showNoteSection)}
                className="flex items-center gap-2 text-sm font-medium mb-2"
              >
                {showNoteSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                노트 추가 (선택) {newProject.notes.length > 0 && `(${newProject.notes.length}개)`}
              </button>

              {showNoteSection && (
                <div className="space-y-4 p-4 bg-base-100 rounded-lg">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">노트 제목</span>
                    </label>
                    <input
                      type="text"
                      value={newNote.title}
                      onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                      placeholder="예: 기획 초안"
                      className="input input-bordered input-sm"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">노트 내용</span>
                    </label>
                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      placeholder="노트 내용을 입력하세요"
                      className="textarea textarea-bordered textarea-sm h-16"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">분류</span>
                      </label>
                      <select
                        value={newNote.memoType}
                        onChange={(e) => setNewNote({ ...newNote, memoType: e.target.value as NoteType })}
                        className="select select-bordered select-sm"
                      >
                        <option value="work_in_progress">중간 작업물</option>
                        <option value="read_later">나중에 보기</option>
                        <option value="reference">레퍼런스</option>
                        <option value="note">일반 노트</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">연결할 영역/자원 (선택)</span>
                      </label>
                      <select
                        value={newNote.paraSelection}
                        onChange={(e) => setNewNote({ ...newNote, paraSelection: e.target.value })}
                        className="select select-bordered select-sm"
                      >
                        <option value="">선택 안 함</option>
                        <optgroup label="영역">
                          {areas.map((area) => (
                            <option key={area.id} value={`area-${area.id}`}>
                              {area.icon} {area.title}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="자원">
                          {resources.map((resource) => (
                            <option key={resource.id} value={`resource-${resource.id}`}>
                              {resource.icon} {resource.title}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        checked={newNote.isPinned}
                        onChange={(e) => setNewNote({ ...newNote, isPinned: e.target.checked })}
                        className="checkbox checkbox-sm"
                      />
                      <span className="label-text">고정하기</span>
                    </label>
                  </div>

                  <button onClick={handleAddNote} className="btn btn-sm btn-ghost w-full">
                    <Plus className="w-3 h-3" />
                    노트 추가
                  </button>

                  {/* 추가된 노트 목록 */}
                  {newProject.notes.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-sm font-medium">추가된 노트 ({newProject.notes.length}개)</p>
                      {newProject.notes.map((note, index) => {
                        const memoTypeLabels = {
                          work_in_progress: '중간 작업물',
                          read_later: '나중에 보기',
                          reference: '레퍼런스',
                          note: '일반 노트',
                        };

                        return (
                          <div key={index} className="p-2 bg-base-200 rounded flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{note.title}</p>
                                <span className="badge badge-xs">{memoTypeLabels[note.memoType]}</span>
                                {note.isPinned && <span className="badge badge-xs badge-accent">고정</span>}
                              </div>
                              {note.content && (
                                <p className="text-xs text-base-content/70 mt-1 line-clamp-2">{note.content}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveNote(index)}
                              className="btn btn-ghost btn-xs btn-circle"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleAddProject} className="btn btn-primary mt-4">
              <Plus className="w-4 h-4" />
              프로젝트 추가
            </button>
          </div>
        </div>

        {/* 추가된 프로젝트 목록 */}
        {selectedProjects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">추가된 프로젝트 ({selectedProjects.length}개)</h2>
            <div className="space-y-3">
              {selectedProjects.map((project, index) => {
                const statusLabels = {
                  not_started: '시작안함',
                  active: '진행중',
                  on_hold: '중단',
                  completed: '완료',
                  archived: '보관',
                };

                // paraSelection 파싱
                let paraLabel: string | null = null;
                if (project.paraSelection) {
                  if (project.paraSelection.startsWith('area-')) {
                    const areaId = project.paraSelection.replace('area-', '');
                    const area = areas.find((a) => a.id === areaId);
                    if (area) paraLabel = `영역: ${area.title}`;
                  } else if (project.paraSelection.startsWith('resource-')) {
                    const resourceId = project.paraSelection.replace('resource-', '');
                    const resource = resources.find((r) => r.id === resourceId);
                    if (resource) paraLabel = `자원: ${resource.title}`;
                  }
                }

                return (
                  <div key={index} className="card bg-base-200">
                    <div className="card-body p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{project.title}</h3>
                            <span className="badge badge-sm badge-primary">
                              {statusLabels[project.status]}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {project.goalId && (
                              <span className="badge badge-sm badge-accent">
                                목표: {goals.find((g) => g.id === project.goalId)?.title}
                              </span>
                            )}
                            {paraLabel && (
                              <span className="badge badge-sm">
                                {paraLabel}
                              </span>
                            )}
                            {project.startDate && (
                              <span className="badge badge-sm badge-ghost">
                                시작: {new Date(project.startDate).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                            {project.targetEndDate && (
                              <span className="badge badge-sm badge-ghost">
                                종료: {new Date(project.targetEndDate).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                            {project.notes.length > 0 && (
                              <span className="badge badge-sm badge-info">
                                노트 {project.notes.length}개
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveProject(index)}
                          className="btn btn-ghost btn-sm btn-circle"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedProjects.length === 0 && (
          <div className="text-center py-8">
            <p className="text-base-content/50">아직 추가된 프로젝트가 없습니다</p>
            <p className="text-sm text-base-content/30 mt-2">
              프로젝트 없이도 건너뛸 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 safe-area-bottom">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            onClick={() => router.push('/second-brain/start')}
            className="btn btn-ghost"
          >
            나가기
          </button>
          {selectedProjects.length === 0 ? (
            <button onClick={handleSkip} className="btn btn-primary flex-1">
              건너뛰고 계속
            </button>
          ) : (
            <button onClick={handleNext} className="btn btn-primary flex-1">
              저장하고 계속 ({selectedProjects.length}개)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
