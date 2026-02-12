'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, Laptop, Tv, Armchair, Pencil,
  Check, Plus, Trash2, X, Bell, BellOff,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { DEFAULT_CATEGORIES, ENVIRONMENT_CUSTOM_DATA_KEY } from '@/types/distraction';
import type { DistractionCategory, DistractionMethod, CustomEnvironmentData } from '@/types/distraction';
import { loadUserPreferencesWithJWT, saveUserPreferencesWithJWT } from '@/lib/supabase/preferences';

// 아이콘 매핑
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Smartphone, Laptop, Tv, Armchair, Pencil,
};

interface FocusEnvironmentSetupProps {
  userId: string | undefined;
  onClose: () => void;
}

/**
 * 집중 환경 설정 (설정 페이지)
 *
 * 기존 DistractionPlanView의 체크리스트를 설정 페이지에서 관리하도록 이전.
 * 라디오 → 체크박스 (복수 선택 가능)
 */
export function FocusEnvironmentSetup({ userId, onClose }: FocusEnvironmentSetupProps) {
  const { focusEnvironmentPrefs, setFocusEnvironmentPrefs } = useADHDStore();
  const [categories, setCategories] = useState<DistractionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingMethodCategoryId, setAddingMethodCategoryId] = useState<string | null>(null);
  const [newMethodText, setNewMethodText] = useState('');

  // 카테고리 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      let customData: CustomEnvironmentData | null = null;

      if (userId) {
        try {
          customData = await loadUserPreferencesWithJWT(userId, ENVIRONMENT_CUSTOM_DATA_KEY);
        } catch (e) {
          console.error('커스텀 데이터 로드 실패:', e);
        }
      }

      // 기본 카테고리 + 커스텀 병합
      const merged = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        isExpanded: false,
        methods: [
          ...cat.methods.map(m => ({
            ...m,
            isSelected: focusEnvironmentPrefs.selectedCheckItems.includes(m.id),
          })),
          // 해당 카테고리에 추가된 커스텀 방법
          ...(customData?.customMethods
            ?.find(cm => cm.categoryId === cat.id)
            ?.methods.map(m => ({
              id: m.id,
              categoryId: cat.id,
              text: m.text,
              isDefault: false,
              isSelected: focusEnvironmentPrefs.selectedCheckItems.includes(m.id),
            })) || []),
        ],
      }));

      // 커스텀 카테고리 추가
      const customCats = customData?.customCategories?.map(cc => ({
        id: cc.id,
        name: cc.name,
        iconName: 'Pencil',
        type: 'custom' as const,
        isDefault: false,
        isExpanded: false,
        methods: cc.methods.map(m => ({
          id: m.id,
          categoryId: cc.id,
          text: m.text,
          isDefault: false,
          isSelected: focusEnvironmentPrefs.selectedCheckItems.includes(m.id),
        })),
      })) || [];

      setCategories([...merged, ...customCats]);
      setIsLoading(false);
    };

    loadData();
  }, [userId, focusEnvironmentPrefs.selectedCheckItems]);

  // 선택 상태 토글 (체크박스)
  const toggleMethod = useCallback((methodId: string) => {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      methods: cat.methods.map(m =>
        m.id === methodId ? { ...m, isSelected: !m.isSelected } : m
      ),
    })));
  }, []);

  // 카테고리 펼침 토글
  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
    ));
  }, []);

  // 커스텀 카테고리 추가
  const addCustomCategory = useCallback(() => {
    if (!newCategoryName.trim()) return;
    const newCat: DistractionCategory = {
      id: `custom-${Date.now()}`,
      name: newCategoryName.trim(),
      iconName: 'Pencil',
      type: 'custom',
      isDefault: false,
      isExpanded: true,
      methods: [],
    };
    setCategories(prev => [...prev, newCat]);
    setNewCategoryName('');
  }, [newCategoryName]);

  // 커스텀 방법 추가
  const addCustomMethod = useCallback((categoryId: string) => {
    if (!newMethodText.trim()) return;
    const newMethod: DistractionMethod = {
      id: `method-${Date.now()}`,
      categoryId,
      text: newMethodText.trim(),
      isDefault: false,
      isSelected: true,
    };
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, methods: [...cat.methods, newMethod] }
        : cat
    ));
    setNewMethodText('');
    setAddingMethodCategoryId(null);
  }, [newMethodText]);

  // 커스텀 방법 삭제
  const deleteMethod = useCallback((categoryId: string, methodId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, methods: cat.methods.filter(m => m.id !== methodId) }
        : cat
    ));
  }, []);

  // 저장
  const handleSave = useCallback(async () => {
    // 선택된 항목 ID 수집
    const selectedIds = categories.flatMap(cat =>
      cat.methods.filter(m => m.isSelected).map(m => m.id)
    );

    // store 업데이트
    setFocusEnvironmentPrefs({ selectedCheckItems: selectedIds });

    // 커스텀 데이터 저장
    if (userId) {
      const customCategories = categories
        .filter(c => !c.isDefault)
        .map(c => ({
          id: c.id,
          name: c.name,
          methods: c.methods.map(m => ({ id: m.id, text: m.text })),
        }));

      const customMethods = categories
        .filter(c => c.isDefault)
        .map(c => ({
          categoryId: c.id,
          methods: c.methods
            .filter(m => !m.isDefault)
            .map(m => ({ id: m.id, text: m.text })),
        }))
        .filter(cm => cm.methods.length > 0);

      try {
        await saveUserPreferencesWithJWT(userId, ENVIRONMENT_CUSTOM_DATA_KEY, {
          customCategories,
          customMethods,
        });
      } catch (e) {
        console.error('환경 설정 저장 실패:', e);
      }
    }

    onClose();
  }, [categories, userId, setFocusEnvironmentPrefs, onClose]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">집중 환경 설정</h3>
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-base-content/60 mb-4">
        포커스 시작 전 방해 요소를 정리하세요. 여러 개 선택 가능합니다.
      </p>

      {/* 토스트 리마인더 토글 */}
      <div className="flex items-center justify-between p-3 bg-base-200 rounded-xl mb-4">
        <div className="flex items-center gap-2">
          {focusEnvironmentPrefs.showToastReminder ? (
            <Bell className="w-4 h-4 text-violet-500" />
          ) : (
            <BellOff className="w-4 h-4 text-base-content/40" />
          )}
          <span className="text-sm">포커스 시작 시 리마인더</span>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-sm toggle-primary"
          checked={focusEnvironmentPrefs.showToastReminder}
          onChange={(e) => setFocusEnvironmentPrefs({ showToastReminder: e.target.checked })}
        />
      </div>

      {/* 카테고리 목록 */}
      <div className="space-y-2 mb-4">
        {categories.map(cat => {
          const IconComp = ICON_MAP[cat.iconName] || Pencil;
          const selectedCount = cat.methods.filter(m => m.isSelected).length;

          return (
            <div key={cat.id} className="border border-base-300 rounded-xl overflow-hidden">
              {/* 카테고리 헤더 */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-base-200/50 transition-colors"
              >
                <IconComp className="w-5 h-5 text-base-content/60 flex-shrink-0" />
                <span className="text-sm font-medium flex-1 text-left">{cat.name}</span>
                {selectedCount > 0 && (
                  <span className="badge badge-xs badge-primary">{selectedCount}</span>
                )}
                {cat.isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-base-content/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-base-content/40" />
                )}
              </button>

              {/* 방법 목록 */}
              <AnimatePresence>
                {cat.isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-1.5 border-t border-base-300 pt-2">
                      {cat.methods.map(method => (
                        <label
                          key={method.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs checkbox-primary"
                            checked={method.isSelected}
                            onChange={() => toggleMethod(method.id)}
                          />
                          <span className="text-sm flex-1">{method.text}</span>
                          {!method.isDefault && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                deleteMethod(cat.id, method.id);
                              }}
                              className="btn btn-ghost btn-xs btn-circle text-error opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </label>
                      ))}

                      {/* 방법 추가 */}
                      {addingMethodCategoryId === cat.id ? (
                        <div className="flex items-center gap-2 px-2">
                          <input
                            autoFocus
                            type="text"
                            value={newMethodText}
                            onChange={(e) => setNewMethodText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addCustomMethod(cat.id);
                              if (e.key === 'Escape') setAddingMethodCategoryId(null);
                            }}
                            placeholder="새 방법 입력..."
                            className="input input-xs input-bordered flex-1"
                          />
                          <button
                            onClick={() => addCustomMethod(cat.id)}
                            className="btn btn-xs btn-primary"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingMethodCategoryId(cat.id);
                            setNewMethodText('');
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-base-content/50 hover:text-primary"
                        >
                          <Plus className="w-3 h-3" />
                          방법 추가
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* 커스텀 카테고리 추가 */}
      <div className="flex items-center gap-2 mb-6">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addCustomCategory();
          }}
          placeholder="새 카테고리 추가..."
          className="input input-sm input-bordered flex-1"
        />
        <button
          onClick={addCustomCategory}
          disabled={!newCategoryName.trim()}
          className="btn btn-sm btn-ghost"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        className="btn btn-primary w-full rounded-full"
      >
        저장
      </button>
    </div>
  );
}
