'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X } from 'lucide-react';
import type { CreateResourceInput } from '@/types/second-brain';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import OnboardingStepNav from '@/components/onboarding/OnboardingStepNav';

const RESOURCE_PRESETS = [
  { title: '독서', icon: 'lucide-Book', color: '#FF6B6B', description: '읽고 싶은 책, 독서 노트' },
  { title: '프로그래밍', icon: 'lucide-Laptop', color: '#4ECDC4', description: '코딩, 개발 자료' },
  { title: '영화', icon: 'lucide-Film', color: '#95E1D3', description: '영화 리뷰, 추천 목록' },
  { title: '여행', icon: 'lucide-Plane', color: '#F38181', description: '여행지 정보, 계획' },
  { title: '요리', icon: 'lucide-ChefHat', color: '#AA96DA', description: '레시피, 맛집 정보' },
  { title: '음악', icon: 'lucide-Music', color: '#DBAC6C', description: '플레이리스트, 음악 감상' },
];

type ResourcePreset = {
  title: string;
  icon: string;
  color: string;
  description: string;
};

export default function OnboardingStep2Page() {
  const router = useRouter();
  const { createResource, resources } = useResourceStore();
  const { completeStep, incrementCreatedCount } = useOnboardingStore();

  // 프리셋 자원
  const [resourcePresets] = useState<ResourcePreset[]>(RESOURCE_PRESETS);
  const [selectedResources, setSelectedResources] = useState<ResourcePreset[]>([]);

  // 커스텀 자원 추가 state
  const [customResourceModalOpen, setCustomResourceModalOpen] = useState(false);
  const [customIconBrowserOpen, setCustomIconBrowserOpen] = useState(false);
  const [newCustomResource, setNewCustomResource] = useState<ResourcePreset>({
    title: '',
    icon: 'lucide-MapPin',
    color: '#A8DADC',
    description: ''
  });

  const handleToggleResource = (resource: ResourcePreset) => {
    if (selectedResources.some((r) => r.title === resource.title)) {
      setSelectedResources(selectedResources.filter((r) => r.title !== resource.title));
    } else {
      setSelectedResources([...selectedResources, resource]);
    }
  };

  // 커스텀 자원 추가 핸들러
  const handleOpenCustomResourceModal = () => {
    setNewCustomResource({
      title: '',
      icon: 'lucide-MapPin',
      color: '#A8DADC',
      description: ''
    });
    setCustomResourceModalOpen(true);
  };

  const handleCustomIconChange = (iconKey: UnifiedIconKey) => {
    setNewCustomResource({ ...newCustomResource, icon: iconKey });
  };

  const handleCustomColorChange = (colorId: string) => {
    const color = getColorById(colorId).hex;
    setNewCustomResource({ ...newCustomResource, color });
  };

  const handleSaveCustomResource = () => {
    if (!newCustomResource.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    setSelectedResources([...selectedResources, newCustomResource]);
    setCustomResourceModalOpen(false);
  };

  const handleCancelCustomResource = () => {
    setCustomResourceModalOpen(false);
  };

  const handleRemoveResource = (title: string) => {
    setSelectedResources(selectedResources.filter((r) => r.title !== title));
  };

  const handleNext = async () => {
    if (selectedResources.length === 0) {
      alert('최소 1개 이상의 자원을 선택해주세요.');
      return;
    }

    try {
      // 선택한 자원들을 생성
      for (const [index, resource] of selectedResources.entries()) {
        const resourceData: CreateResourceInput = {
          title: resource.title,
          description: resource.description,
          icon: resource.icon,
          color: resource.color,
          order_index: index,
          is_archived: false,
        };
        await createResource(resourceData);
      }

      // 온보딩 2단계에서 생성한 자원 개수 업데이트
      incrementCreatedCount(2, selectedResources.length);

      // 온보딩 2단계 완료
      await completeStep(2);

      // 다음 단계로 이동
      router.push('/second-brain/onboarding/step-3');
    } catch (error) {
      console.error('자원 생성 실패:', error);
      alert('자원 생성에 실패했습니다.');
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
          <h1 className="text-2xl font-bold mb-2">관심 자원 만들기</h1>
          <p className="text-sm text-base-content/70">
            관심 있는 주제나 취미를 선택하세요 (책임 없음)
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 이미 생성된 자원 */}
        {resources.length > 0 && (
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title">이미 생성된 자원 ({resources.length}개)</h2>
              <div className="grid grid-cols-2 gap-2">
                {resources.map((resource) => {
                  const IconComponent = getUnifiedIcon(resource.icon as UnifiedIconKey).component;
                  return (
                    <div key={resource.id} className="flex items-center gap-2 p-2 bg-base-100 rounded">
                      <IconComponent className="w-5 h-5" />
                      <span className="text-sm font-medium">{resource.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 프리셋 자원 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">추천 주제</h2>
          <div className="grid grid-cols-2 gap-3">
            {resourcePresets.map((resource, index) => {
              const isSelected = selectedResources.some((r) => r.title === resource.title);
              const IconComponent = getUnifiedIcon(resource.icon as UnifiedIconKey).component;
              return (
                <button
                  key={resource.title}
                  onClick={() => handleToggleResource(resource)}
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
                    <h3 className="font-semibold mt-2">{resource.title}</h3>
                    <p className={`text-xs ${isSelected ? 'opacity-90' : 'text-base-content/60'}`}>
                      {resource.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 커스텀 자원 추가 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">직접 추가</h2>
          <button onClick={handleOpenCustomResourceModal} className="btn btn-outline w-full">
            <Plus className="w-4 h-4" />
            새 자원 추가하기
          </button>
        </div>

        {/* 선택된 자원 목록 */}
        {selectedResources.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">선택된 자원 ({selectedResources.length}개)</h2>
            <div className="space-y-2">
              {selectedResources.map((resource) => {
                const IconComponent = getUnifiedIcon(resource.icon as UnifiedIconKey).component;
                return (
                  <div
                    key={resource.title}
                    className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-6 h-6" />
                      <div>
                        <div className="font-medium">{resource.title}</div>
                        {resource.description && (
                          <div className="text-xs text-base-content/60">{resource.description}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveResource(resource.title)}
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
            disabled={selectedResources.length === 0}
            className="btn btn-primary flex-1"
          >
            저장하고 계속 ({selectedResources.length}개 선택)
          </button>
        </div>
      </div>

      {/* 커스텀 자원 추가 다이얼로그 */}
      {customResourceModalOpen && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">새 자원 추가</h3>

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
                  backgroundColor: newCustomResource.color + '20',
                  borderColor: newCustomResource.color,
                }}
              >
                {(() => {
                  const IconComponent = getUnifiedIcon(newCustomResource.icon as UnifiedIconKey).component;
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
                value={newCustomResource.title}
                onChange={(e) => setNewCustomResource({ ...newCustomResource, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 사진, 그림 그리기, 게임"
              />
            </div>

            {/* 설명 */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">설명</span>
              </label>
              <textarea
                value={newCustomResource.description}
                onChange={(e) => setNewCustomResource({ ...newCustomResource, description: e.target.value })}
                className="textarea textarea-bordered h-20"
                placeholder="예: 사진 촬영 및 편집"
              />
            </div>

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelCustomResource} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveCustomResource} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelCustomResource} />
        </dialog>
      )}

      {/* 커스텀 자원 추가용 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={customIconBrowserOpen}
        onClose={() => setCustomIconBrowserOpen(false)}
        onIconSelect={handleCustomIconChange}
        selectedIcon={newCustomResource.icon}
        selectedColor={newCustomResource.color}
        onColorSelect={handleCustomColorChange}
      />
    </div>
  );
}
