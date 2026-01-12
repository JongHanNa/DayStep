'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Target,
  Plus,
  Trash2,
  X,
  Smartphone,
  Laptop,
  Tv,
  Armchair,
  Pencil,
  type LucideIcon,
} from 'lucide-react';
import {
  DistractionCategory,
  DistractionMethod,
  EnvironmentSetup,
  CustomEnvironmentData,
  DEFAULT_CATEGORIES,
  ENVIRONMENT_CUSTOM_DATA_KEY,
} from '@/types/distraction';
import {
  loadUserPreferencesWithJWT,
  saveUserPreferencesWithJWT,
} from '@/lib/supabase/preferences';

// 아이콘 매핑
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Tv,
  Armchair,
  Pencil,
};

interface DistractionPlanViewProps {
  isLoading: boolean;
  userId?: string;
  onNext: (setup: EnvironmentSetup) => void;
  onSkip: () => void;
}

/**
 * 집중 환경 준비 화면 (v3)
 * - 계층적 구조: 카테고리(방해물/환경) → 방법(구체적 행동)
 * - 라디오 버튼으로 각 카테고리에서 1개 방법 선택
 * - 커스텀 카테고리/방법 추가/삭제
 * - 기본 항목은 편집/삭제 불가
 */
export default function DistractionPlanView({
  isLoading,
  userId,
  onNext,
  onSkip,
}: DistractionPlanViewProps) {
  // 카테고리 상태
  const [categories, setCategories] = useState<DistractionCategory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 추가 UI 상태
  const [addingMethodToCategoryId, setAddingMethodToCategoryId] = useState<string | null>(null);
  const [newMethodText, setNewMethodText] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 초기 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);

      // 기본 카테고리 초기화
      const defaultCategories: DistractionCategory[] = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        isExpanded: true,
        methods: cat.methods.map(m => ({ ...m, isSelected: false })),
      }));

      // 커스텀 데이터 로드
      if (userId) {
        try {
          const customData = await loadUserPreferencesWithJWT(
            userId,
            ENVIRONMENT_CUSTOM_DATA_KEY
          ) as CustomEnvironmentData | null;

          if (customData) {
            // 기본 카테고리에 커스텀 방법 추가
            const mergedCategories = defaultCategories.map(cat => {
              const customMethodsForCategory = customData.customMethods?.find(
                cm => cm.categoryId === cat.id
              );
              if (customMethodsForCategory) {
                const additionalMethods: DistractionMethod[] = customMethodsForCategory.methods.map(m => ({
                  id: m.id,
                  categoryId: cat.id,
                  text: m.text,
                  isDefault: false,
                  isSelected: false,
                }));
                return {
                  ...cat,
                  methods: [...cat.methods, ...additionalMethods],
                };
              }
              return cat;
            });

            // 커스텀 카테고리 추가
            const customCategories: DistractionCategory[] = (customData.customCategories || []).map(cc => ({
              id: cc.id,
              name: cc.name,
              iconName: 'Pencil',
              type: 'custom' as const,
              isDefault: false,
              isExpanded: true,
              methods: cc.methods.map(m => ({
                id: m.id,
                categoryId: cc.id,
                text: m.text,
                isDefault: false,
                isSelected: false,
              })),
            }));

            setCategories([...mergedCategories, ...customCategories]);
          } else {
            setCategories(defaultCategories);
          }
        } catch (error) {
          console.error('커스텀 데이터 로드 실패:', error);
          setCategories(defaultCategories);
        }
      } else {
        setCategories(defaultCategories);
      }

      setIsLoadingData(false);
    };

    loadData();
  }, [userId]);

  // 커스텀 데이터 저장
  const saveCustomData = useCallback(async (updatedCategories: DistractionCategory[]) => {
    if (!userId) return;

    const customCategories = updatedCategories
      .filter(cat => !cat.isDefault)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        methods: cat.methods.map(m => ({ id: m.id, text: m.text })),
      }));

    const customMethods = updatedCategories
      .filter(cat => cat.isDefault)
      .map(cat => ({
        categoryId: cat.id,
        methods: cat.methods
          .filter(m => !m.isDefault)
          .map(m => ({ id: m.id, text: m.text })),
      }))
      .filter(cm => cm.methods.length > 0);

    const customData: CustomEnvironmentData = {
      customCategories,
      customMethods,
    };

    await saveUserPreferencesWithJWT(userId, ENVIRONMENT_CUSTOM_DATA_KEY, customData);
  }, [userId]);

  // 카테고리 토글 (접기/펼치기)
  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
      )
    );
  }, []);

  // 방법 선택 (라디오 버튼)
  const selectMethod = useCallback((categoryId: string, methodId: string) => {
    setCategories(prev =>
      prev.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            methods: cat.methods.map(m => ({
              ...m,
              isSelected: m.id === methodId ? !m.isSelected : false,
            })),
          };
        }
        return cat;
      })
    );
  }, []);

  // 커스텀 방법 추가
  const handleAddMethod = async (categoryId: string) => {
    if (!newMethodText.trim() || !userId) return;

    setIsSaving(true);
    try {
      const newMethod: DistractionMethod = {
        id: `method-${Date.now()}`,
        categoryId,
        text: newMethodText.trim(),
        isDefault: false,
        isSelected: false,
      };

      const updatedCategories = categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            methods: [...cat.methods, newMethod],
          };
        }
        return cat;
      });

      await saveCustomData(updatedCategories);
      setCategories(updatedCategories);
      setNewMethodText('');
      setAddingMethodToCategoryId(null);
    } catch (error) {
      console.error('방법 추가 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 커스텀 방법 삭제
  const handleDeleteMethod = async (categoryId: string, methodId: string) => {
    if (!userId) return;

    setIsSaving(true);
    try {
      const updatedCategories = categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            methods: cat.methods.filter(m => m.id !== methodId),
          };
        }
        return cat;
      });

      await saveCustomData(updatedCategories);
      setCategories(updatedCategories);
    } catch (error) {
      console.error('방법 삭제 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 커스텀 카테고리 추가
  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !userId) return;

    setIsSaving(true);
    try {
      const newCategory: DistractionCategory = {
        id: `category-${Date.now()}`,
        name: newCategoryName.trim(),
        iconName: 'Pencil',
        type: 'custom',
        isDefault: false,
        isExpanded: true,
        methods: [],
      };

      const updatedCategories = [...categories, newCategory];
      await saveCustomData(updatedCategories);
      setCategories(updatedCategories);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (error) {
      console.error('카테고리 추가 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 커스텀 카테고리 삭제
  const handleDeleteCategory = async (categoryId: string) => {
    if (!userId) return;

    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    if (!categoryToDelete || categoryToDelete.isDefault) return;

    setIsSaving(true);
    try {
      const updatedCategories = categories.filter(cat => cat.id !== categoryId);
      await saveCustomData(updatedCategories);
      setCategories(updatedCategories);
    } catch (error) {
      console.error('카테고리 삭제 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 완료 핸들러
  const handleComplete = () => {
    const selectedMethods = categories.flatMap(cat =>
      cat.methods
        .filter(m => m.isSelected)
        .map(m => ({
          categoryId: cat.id,
          categoryName: cat.name,
          methodId: m.id,
          methodText: m.text,
        }))
    );

    const setup: EnvironmentSetup = {
      selectedMethods,
      completedAt: new Date().toISOString(),
    };
    onNext(setup);
  };

  // 선택된 방법 수
  const selectedCount = categories.reduce(
    (acc, cat) => acc + cat.methods.filter(m => m.isSelected).length,
    0
  );
  const canProceed = selectedCount > 0;

  // 아이콘 렌더링
  const renderIcon = (iconName: string, className: string = 'w-5 h-5') => {
    const IconComponent = CATEGORY_ICON_MAP[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full px-4 py-6"
    >
      {/* 헤더 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Target className="w-7 h-7 text-primary" />
          <h2 className="text-xl font-bold">집중 환경 준비</h2>
        </div>
        <p className="text-sm text-base-content/60">
          시작 전에 방해 요소를 치워요
        </p>
      </div>

      {/* 카테고리 목록 */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {categories.map((category) => (
          <motion.div
            key={category.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-base-200 rounded-xl overflow-hidden"
          >
            {/* 카테고리 헤더 */}
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex-1 flex items-center gap-3"
              >
                {/* 아이콘 */}
                <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center">
                  {renderIcon(category.iconName, 'w-5 h-5 text-base-content')}
                </div>

                {/* 카테고리 이름 */}
                <span className="flex-1 text-left font-medium">
                  {category.name}
                </span>

                {/* 접기/펼치기 아이콘 */}
                {category.isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-base-content/50" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-base-content/50" />
                )}
              </button>

              {/* 삭제 버튼 (커스텀 카테고리만) */}
              {!category.isDefault && (
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  disabled={isSaving}
                  className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-error"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 방법 목록 */}
            <AnimatePresence>
              {category.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4"
                >
                  <div className="space-y-2 pl-4 border-l-2 border-base-300 ml-5">
                    {category.methods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center gap-3"
                      >
                        {/* 라디오 버튼 */}
                        <button
                          onClick={() => selectMethod(category.id, method.id)}
                          className={`flex-1 flex items-center gap-3 p-3 rounded-lg transition-all ${
                            method.isSelected
                              ? 'bg-primary/10 border border-primary'
                              : 'bg-base-100 hover:bg-base-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              method.isSelected
                                ? 'border-primary bg-primary'
                                : 'border-base-300'
                            }`}
                          >
                            {method.isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary-content" />
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              method.isSelected
                                ? 'text-primary font-medium'
                                : 'text-base-content'
                            }`}
                          >
                            {method.text}
                          </span>
                        </button>

                        {/* 삭제 버튼 (커스텀 방법만) */}
                        {!method.isDefault && (
                          <button
                            onClick={() => handleDeleteMethod(category.id, method.id)}
                            disabled={isSaving}
                            className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-error"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* 방법 추가 UI */}
                    {addingMethodToCategoryId === category.id ? (
                      <div className="flex items-center gap-2 p-2">
                        <input
                          type="text"
                          value={newMethodText}
                          onChange={(e) => setNewMethodText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newMethodText.trim()) {
                              handleAddMethod(category.id);
                            } else if (e.key === 'Escape') {
                              setAddingMethodToCategoryId(null);
                              setNewMethodText('');
                            }
                          }}
                          placeholder="새 방법 입력..."
                          className="flex-1 input input-sm input-bordered"
                          autoFocus
                          disabled={isSaving}
                        />
                        <button
                          onClick={() => handleAddMethod(category.id)}
                          disabled={!newMethodText.trim() || isSaving}
                          className="btn btn-primary btn-sm"
                        >
                          {isSaving ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            '추가'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setAddingMethodToCategoryId(null);
                            setNewMethodText('');
                          }}
                          className="btn btn-ghost btn-circle btn-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingMethodToCategoryId(category.id)}
                        className="flex items-center gap-2 p-2 text-base-content/50 hover:text-primary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">방법 추가하기</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* 카테고리 추가 UI */}
        <AnimatePresence>
          {isAddingCategory ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-4 rounded-xl bg-base-200 border-2 border-dashed border-base-300"
            >
              <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-base-content/50" />
              </div>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    handleAddCategory();
                  } else if (e.key === 'Escape') {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }
                }}
                placeholder="방해물/환경 이름 입력..."
                className="flex-1 input input-sm input-bordered"
                autoFocus
                disabled={isSaving}
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || isSaving}
                className="btn btn-primary btn-sm"
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  '추가'
                )}
              </button>
              <button
                onClick={() => {
                  setIsAddingCategory(false);
                  setNewCategoryName('');
                }}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setIsAddingCategory(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-base-300 text-base-content/50 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm">방해물/환경 추가하기</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 선택 상태 표시 */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-3"
        >
          <span className="text-sm text-primary font-medium">
            {selectedCount}개 준비 완료
          </span>
        </motion.div>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onSkip}
          className="btn btn-ghost flex-1"
        >
          건너뛰기
        </button>
        <button
          onClick={handleComplete}
          disabled={!canProceed || isLoading}
          className="btn btn-primary flex-1"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              준비 완료
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
