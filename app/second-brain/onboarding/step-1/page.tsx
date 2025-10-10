'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X, Pencil } from 'lucide-react';
import type { CreateAreaInput } from '@/types/second-brain';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import OnboardingStepNav from '@/components/onboarding/OnboardingStepNav';

const AREA_PRESETS = [
  { title: '직장', icon: 'lucide-Briefcase', color: '#DBAC6C', description: '업무 프로젝트 및 커리어 개발' },
  { title: '가족', icon: 'lucide-Users', color: '#FF6B6B', description: '가족 관계 및 행사' },
  { title: '건강', icon: 'lucide-Heart', color: '#4ECDC4', description: '운동, 식습관, 건강관리' },
  { title: '나', icon: 'lucide-Sparkles', color: '#C7B3E5', description: '나에 대한 생각, 발견, 성찰' },
  { title: '자기개발', icon: 'lucide-Book', color: '#F38181', description: '학습, 성장, 스킬 향상' },
  { title: '취미', icon: 'lucide-Palette', color: '#AA96DA', description: '여가 활동 및 관심사' },
];

type AreaPreset = {
  title: string;
  icon: string;
  color: string;
  description: string;
};

export default function OnboardingStep1Page() {
  const router = useRouter();
  const { createArea, areas } = useAreaStore();
  const { completeStep, incrementCreatedCount } = useOnboardingStore();

  // 프리셋 영역 (편집 가능하도록 state로 관리)
  const [areaPresets, setAreaPresets] = useState<AreaPreset[]>(AREA_PRESETS);
  const [selectedAreas, setSelectedAreas] = useState<AreaPreset[]>([]);

  // 편집 관련 state
  const [editingArea, setEditingArea] = useState<(AreaPreset & { index: number }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 커스텀 영역 추가 state
  const [customAreaModalOpen, setCustomAreaModalOpen] = useState(false);
  const [customIconBrowserOpen, setCustomIconBrowserOpen] = useState(false);
  const [newCustomArea, setNewCustomArea] = useState<AreaPreset>({
    title: '',
    icon: 'lucide-MapPin',
    color: '#A8DADC',
    description: ''
  });

  const handleToggleArea = (area: AreaPreset) => {
    if (selectedAreas.some((a) => a.title === area.title)) {
      setSelectedAreas(selectedAreas.filter((a) => a.title !== area.title));
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  // 편집 관련 핸들러
  const handleEditArea = (area: AreaPreset, index: number) => {
    setEditingArea({ ...area, index });
    setEditDialogOpen(true);
  };

  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingArea) {
      setEditingArea({ ...editingArea, icon: iconKey });
    }
  };

  const handleColorChange = (colorId: string) => {
    if (editingArea) {
      const color = getColorById(colorId).hex;
      setEditingArea({ ...editingArea, color });
    }
  };

  const handleSaveEdit = () => {
    if (!editingArea || !editingArea.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    // 1. areaPresets 업데이트
    const updatedPresets = [...areaPresets];
    const oldTitle = areaPresets[editingArea.index].title;
    updatedPresets[editingArea.index] = {
      title: editingArea.title,
      icon: editingArea.icon,
      color: editingArea.color,
      description: editingArea.description,
    };
    setAreaPresets(updatedPresets);

    // 2. 이미 선택된 경우 selectedAreas도 업데이트
    const selectedIndex = selectedAreas.findIndex((a) => a.title === oldTitle);
    if (selectedIndex !== -1) {
      const updatedSelected = [...selectedAreas];
      updatedSelected[selectedIndex] = updatedPresets[editingArea.index];
      setSelectedAreas(updatedSelected);
    }

    setEditDialogOpen(false);
    setEditingArea(null);
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingArea(null);
  };

  // 커스텀 영역 추가 핸들러
  const handleOpenCustomAreaModal = () => {
    setNewCustomArea({
      title: '',
      icon: 'lucide-MapPin',
      color: '#A8DADC',
      description: ''
    });
    setCustomAreaModalOpen(true);
  };

  const handleCustomIconChange = (iconKey: UnifiedIconKey) => {
    setNewCustomArea({ ...newCustomArea, icon: iconKey });
  };

  const handleCustomColorChange = (colorId: string) => {
    const color = getColorById(colorId).hex;
    setNewCustomArea({ ...newCustomArea, color });
  };

  const handleSaveCustomArea = () => {
    if (!newCustomArea.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    setSelectedAreas([...selectedAreas, newCustomArea]);
    setCustomAreaModalOpen(false);
  };

  const handleCancelCustomArea = () => {
    setCustomAreaModalOpen(false);
  };

  const handleRemoveArea = (title: string) => {
    setSelectedAreas(selectedAreas.filter((a) => a.title !== title));
  };

  const handleNext = async () => {
    if (selectedAreas.length === 0) {
      alert('최소 1개 이상의 영역을 선택해주세요.');
      return;
    }

    try {
      // 선택한 영역들을 생성
      for (const [index, area] of selectedAreas.entries()) {
        const areaData: CreateAreaInput = {
          title: area.title,
          description: area.description,
          icon: area.icon,
          color: area.color,
          order_index: index,
          is_archived: false,
        };
        await createArea(areaData);
      }

      // 온보딩 1단계에서 생성한 영역 개수 업데이트
      incrementCreatedCount(1, selectedAreas.length);

      // 온보딩 1단계 완료
      await completeStep(1);

      // 다음 단계로 이동
      router.push('/second-brain/onboarding/step-2');
    } catch (error) {
      console.error('영역 생성 실패:', error);
      alert('영역 생성에 실패했습니다.');
    }
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
          <h1 className="text-2xl font-bold mb-2">책임 영역 만들기</h1>
          <p className="text-sm text-base-content/70">
            지속적으로 관심을 가져야 하는 영역을 선택하세요
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 이미 생성된 영역 */}
        {areas.length > 0 && (
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title">이미 생성된 영역 ({areas.length}개)</h2>
              <div className="grid grid-cols-2 gap-2">
                {areas.map((area) => {
                  const IconComponent = getUnifiedIcon(area.icon as UnifiedIconKey).component;
                  return (
                    <div key={area.id} className="flex items-center gap-2 p-2 bg-base-100 rounded">
                      <IconComponent className="w-5 h-5" />
                      <span className="text-sm font-medium">{area.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 프리셋 영역 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">추천 영역</h2>
          <div className="grid grid-cols-2 gap-3">
            {areaPresets.map((area, index) => {
              const isSelected = selectedAreas.some((a) => a.title === area.title);
              const IconComponent = getUnifiedIcon(area.icon as UnifiedIconKey).component;
              return (
                <div key={area.title} className="relative">
                  <button
                    onClick={() => handleToggleArea(area)}
                    className={`card transition-all w-full ${
                      isSelected
                        ? 'bg-primary text-primary-content ring-2 ring-primary'
                        : 'bg-base-200 hover:bg-base-300'
                    }`}
                  >
                    <div className="card-body p-4">
                      <div className="flex items-start justify-between">
                        <IconComponent className="w-8 h-8" />
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary-content text-primary flex items-center justify-center">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold mt-2">{area.title}</h3>
                      <p className={`text-xs ${isSelected ? 'opacity-90' : 'text-base-content/60'}`}>
                        {area.description}
                      </p>
                    </div>
                  </button>
                  {/* 편집 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditArea(area, index);
                    }}
                    className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 z-10"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 커스텀 영역 추가 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">직접 추가</h2>
          <button onClick={handleOpenCustomAreaModal} className="btn btn-outline w-full">
            <Plus className="w-4 h-4" />
            새 영역 추가하기
          </button>
        </div>

        {/* 선택된 영역 목록 */}
        {selectedAreas.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">선택된 영역 ({selectedAreas.length}개)</h2>
            <div className="space-y-2">
              {selectedAreas.map((area) => {
                const IconComponent = getUnifiedIcon(area.icon as UnifiedIconKey).component;
                return (
                  <div
                    key={area.title}
                    className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-6 h-6" />
                      <div>
                        <div className="font-medium">{area.title}</div>
                        {area.description && (
                          <div className="text-xs text-base-content/60">{area.description}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveArea(area.title)}
                      className="btn btn-ghost btn-sm btn-circle"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
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
          <button
            onClick={handleNext}
            disabled={selectedAreas.length === 0}
            className="btn btn-primary flex-1"
          >
            저장하고 계속 ({selectedAreas.length}개 선택)
          </button>
        </div>
      </div>

      {/* 편집 다이얼로그 */}
      {editDialogOpen && editingArea && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">영역 편집</h3>

            {/* 아이콘 및 색상 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">아이콘 및 색상</span>
              </label>
              <button
                type="button"
                onClick={() => setIconBrowserOpen(true)}
                className="btn btn-outline w-full justify-start"
                style={{
                  backgroundColor: editingArea.color + '20',
                  borderColor: editingArea.color,
                }}
              >
                {(() => {
                  const IconComponent = getUnifiedIcon(editingArea.icon as UnifiedIconKey).component;
                  return <IconComponent className="w-6 h-6 mr-2" />;
                })()}
                <span>변경하기</span>
              </button>
            </div>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={editingArea.title}
                onChange={(e) => setEditingArea({ ...editingArea, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 직장"
              />
            </div>

            {/* 설명 */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">설명</span>
              </label>
              <textarea
                value={editingArea.description}
                onChange={(e) => setEditingArea({ ...editingArea, description: e.target.value })}
                className="textarea textarea-bordered h-20"
                placeholder="예: 업무 프로젝트 및 커리어 개발"
              />
            </div>

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelEdit} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveEdit} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

      {/* 커스텀 영역 추가 다이얼로그 */}
      {customAreaModalOpen && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">새 영역 추가</h3>

            {/* 아이콘 및 색상 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">아이콘 및 색상</span>
              </label>
              <button
                type="button"
                onClick={() => setCustomIconBrowserOpen(true)}
                className="btn btn-outline w-full justify-start"
                style={{
                  backgroundColor: newCustomArea.color + '20',
                  borderColor: newCustomArea.color,
                }}
              >
                {(() => {
                  const IconComponent = getUnifiedIcon(newCustomArea.icon as UnifiedIconKey).component;
                  return <IconComponent className="w-6 h-6 mr-2" />;
                })()}
                <span>변경하기</span>
              </button>
            </div>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={newCustomArea.title}
                onChange={(e) => setNewCustomArea({ ...newCustomArea, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 사회봉사"
              />
            </div>

            {/* 설명 */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">설명</span>
              </label>
              <textarea
                value={newCustomArea.description}
                onChange={(e) => setNewCustomArea({ ...newCustomArea, description: e.target.value })}
                className="textarea textarea-bordered h-20"
                placeholder="예: 봉사 활동 및 기부"
              />
            </div>

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelCustomArea} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveCustomArea} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelCustomArea} />
        </dialog>
      )}

      {/* 편집용 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingArea?.icon}
        selectedColor={editingArea?.color}
        onColorSelect={handleColorChange}
      />

      {/* 커스텀 영역 추가용 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={customIconBrowserOpen}
        onClose={() => setCustomIconBrowserOpen(false)}
        onIconSelect={handleCustomIconChange}
        selectedIcon={newCustomArea.icon}
        selectedColor={newCustomArea.color}
        onColorSelect={handleCustomColorChange}
      />
    </div>
  );
}
