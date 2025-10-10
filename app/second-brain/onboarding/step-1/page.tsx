'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X } from 'lucide-react';
import type { CreateAreaInput } from '@/types/second-brain';

const AREA_PRESETS = [
  { title: '직장', icon: '💼', color: '#DBAC6C', description: '업무 프로젝트 및 커리어 개발' },
  { title: '가족', icon: '👨‍👩‍👧‍👦', color: '#FF6B6B', description: '가족 관계 및 행사' },
  { title: '건강', icon: '💪', color: '#4ECDC4', description: '운동, 식습관, 건강관리' },
  { title: '재테크', icon: '💰', color: '#95E1D3', description: '저축, 투자, 자산관리' },
  { title: '자기개발', icon: '📚', color: '#F38181', description: '학습, 성장, 스킬 향상' },
  { title: '취미', icon: '🎨', color: '#AA96DA', description: '여가 활동 및 관심사' },
];

export default function OnboardingStep1Page() {
  const router = useRouter();
  const { createArea } = useAreaStore();
  const { completeStep } = useOnboardingStore();

  const [selectedAreas, setSelectedAreas] = useState<typeof AREA_PRESETS>([]);
  const [customArea, setCustomArea] = useState<string>('');

  const handleToggleArea = (area: typeof AREA_PRESETS[0]) => {
    if (selectedAreas.some((a) => a.title === area.title)) {
      setSelectedAreas(selectedAreas.filter((a) => a.title !== area.title));
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  const handleAddCustomArea = () => {
    if (!customArea.trim()) return;

    const newArea = {
      title: customArea,
      icon: '📌',
      color: '#A8DADC',
      description: '',
    };

    setSelectedAreas([...selectedAreas, newArea]);
    setCustomArea('');
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
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">책임 영역 만들기</h1>
            <span className="text-sm text-base-content/50">1/5</span>
          </div>
          <p className="text-sm text-base-content/70">
            지속적으로 관심을 가져야 하는 영역을 선택하세요
          </p>
          <progress className="progress progress-primary w-full mt-2" value="20" max="100" />
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 프리셋 영역 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">추천 영역</h2>
          <div className="grid grid-cols-2 gap-3">
            {AREA_PRESETS.map((area) => {
              const isSelected = selectedAreas.some((a) => a.title === area.title);
              return (
                <button
                  key={area.title}
                  onClick={() => handleToggleArea(area)}
                  className={`card transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-content ring-2 ring-primary'
                      : 'bg-base-200 hover:bg-base-300'
                  }`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-3xl">{area.icon}</div>
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
              );
            })}
          </div>
        </div>

        {/* 커스텀 영역 추가 */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">직접 추가</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomArea()}
              placeholder="예: 사회봉사, 커뮤니티 활동"
              className="input input-bordered flex-1"
            />
            <button onClick={handleAddCustomArea} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              추가
            </button>
          </div>
        </div>

        {/* 선택된 영역 목록 */}
        {selectedAreas.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">선택된 영역 ({selectedAreas.length}개)</h2>
            <div className="space-y-2">
              {selectedAreas.map((area) => (
                <div
                  key={area.title}
                  className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{area.icon}</div>
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
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 safe-area-bottom">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={() => router.push('/second-brain/start')} className="btn btn-ghost flex-1">
            이전
          </button>
          <button
            onClick={handleNext}
            disabled={selectedAreas.length === 0}
            className="btn btn-primary flex-1"
          >
            다음 ({selectedAreas.length}개 선택)
          </button>
        </div>
      </div>
    </div>
  );
}
