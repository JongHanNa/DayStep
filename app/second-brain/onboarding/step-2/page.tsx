'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X } from 'lucide-react';
import type { CreateResourceInput } from '@/types/second-brain';

const RESOURCE_PRESETS = [
  { title: '독서', icon: '📚', color: '#FF6B6B', description: '읽고 싶은 책, 독서 노트' },
  { title: '프로그래밍', icon: '💻', color: '#4ECDC4', description: '코딩, 개발 자료' },
  { title: '영화', icon: '🎬', color: '#95E1D3', description: '영화 리뷰, 추천 목록' },
  { title: '여행', icon: '✈️', color: '#F38181', description: '여행지 정보, 계획' },
  { title: '요리', icon: '🍳', color: '#AA96DA', description: '레시피, 맛집 정보' },
  { title: '음악', icon: '🎵', color: '#DBAC6C', description: '플레이리스트, 음악 감상' },
];

export default function OnboardingStep2Page() {
  const router = useRouter();
  const { createResource } = useResourceStore();
  const { completeStep } = useOnboardingStore();

  const [selectedResources, setSelectedResources] = useState<typeof RESOURCE_PRESETS>([]);
  const [customResource, setCustomResource] = useState<string>('');

  const handleToggleResource = (resource: typeof RESOURCE_PRESETS[0]) => {
    if (selectedResources.some((r) => r.title === resource.title)) {
      setSelectedResources(selectedResources.filter((r) => r.title !== resource.title));
    } else {
      setSelectedResources([...selectedResources, resource]);
    }
  };

  const handleAddCustomResource = () => {
    if (!customResource.trim()) return;

    const newResource = {
      title: customResource,
      icon: '🔖',
      color: '#A8DADC',
      description: '',
    };

    setSelectedResources([...selectedResources, newResource]);
    setCustomResource('');
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
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">관심 자원 만들기</h1>
            <span className="text-sm text-base-content/50">2/5</span>
          </div>
          <p className="text-sm text-base-content/70">
            관심 있는 주제나 취미를 선택하세요 (책임 없음)
          </p>
          <progress className="progress progress-primary w-full mt-2" value="40" max="100" />
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 프리셋 자원 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">추천 주제</h2>
          <div className="grid grid-cols-2 gap-3">
            {RESOURCE_PRESETS.map((resource) => {
              const isSelected = selectedResources.some((r) => r.title === resource.title);
              return (
                <button
                  key={resource.title}
                  onClick={() => handleToggleResource(resource)}
                  className={`card transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-content ring-2 ring-primary'
                      : 'bg-base-200 hover:bg-base-300'
                  }`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-3xl">{resource.icon}</div>
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
          <div className="flex gap-2">
            <input
              type="text"
              value={customResource}
              onChange={(e) => setCustomResource(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomResource()}
              placeholder="예: 사진, 그림 그리기, 게임"
              className="input input-bordered flex-1"
            />
            <button onClick={handleAddCustomResource} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              추가
            </button>
          </div>
        </div>

        {/* 선택된 자원 목록 */}
        {selectedResources.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">선택된 자원 ({selectedResources.length}개)</h2>
            <div className="space-y-2">
              {selectedResources.map((resource) => (
                <div
                  key={resource.title}
                  className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{resource.icon}</div>
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
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 safe-area-bottom">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={() => router.push('/second-brain/onboarding/step-1')} className="btn btn-ghost flex-1">
            이전
          </button>
          <button
            onClick={handleNext}
            disabled={selectedResources.length === 0}
            className="btn btn-primary flex-1"
          >
            다음 ({selectedResources.length}개 선택)
          </button>
        </div>
      </div>
    </div>
  );
}
