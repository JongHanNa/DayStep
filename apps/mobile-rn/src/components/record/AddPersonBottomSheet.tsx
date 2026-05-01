/**
 * AddPersonBottomSheet — 사람 추가/편집 바텀시트
 * 추가 모드: 이름만 입력
 * 편집 모드: 이름, 별명, 관계, 역할, 부서 태그 편집 + 삭제
 */
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {View, Text, StyleSheet, ActionSheetIOS, Modal, type TextInput} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {NativeAddPersonNative} from '@/components/native/NativeAddPerson';
import {useTheme} from '@/theme';
import {useLimitCheck} from '@/hooks/useLimitCheck';
import {LimitReachedModal} from '@/components/subscription/LimitReachedModal';
import {supabase} from '@/lib/supabase';
import {hexWithOpacity} from '@/lib/todoUtils';
import {CATEGORY_COLOR_PRESETS, DEFAULT_COLOR_BY_KIND} from '@/lib/categoryColors';
import {
  useCherishedPeopleStore,
  type CherishedPerson,
  type CategoryKind,
  type CategoryItem,
} from '@/stores/cherishedPeopleStore';
import {EditableTagSection} from './EditableTagSection';

export interface AddPersonBottomSheetRef {
  open: (prefillName?: string) => void;
  openEdit: (person: CherishedPerson) => void;
  close: () => void;
}

interface AddPersonBottomSheetProps {
  onPersonAdded: (person: CherishedPerson) => void;
  onPersonUpdated?: () => void;
  onPersonDeleted?: () => void;
  onCategoriesChanged?: () => void;
  addPerson: (userId: string, data: {name: string; nickname?: string}) => Promise<CherishedPerson | null>;
  updatePerson: (userId: string, personId: string, data: Partial<{name: string; nickname: string}>) => Promise<boolean>;
  deletePerson: (userId: string, personId: string) => Promise<boolean>;
  userId: string | undefined;
  affectedPersonCount?: (kind: CategoryKind, categoryId: string) => number;
}

export const AddPersonBottomSheet = forwardRef<
  AddPersonBottomSheetRef,
  AddPersonBottomSheetProps
>(function AddPersonBottomSheet(
  {
    onPersonAdded,
    onPersonUpdated,
    onPersonDeleted,
    onCategoriesChanged,
    addPerson,
    updatePerson,
    deletePerson,
    userId,
    affectedPersonCount,
  },
  ref,
) {
  const {primaryColor} = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const nameRef = useRef<TextInput>(null);
  const nicknameRef = useRef<TextInput>(null);
  const [saving, setSaving] = useState(false);
  const hasNative = NativeAddPersonNative != null;
  const [nativeVisible, setNativeVisible] = useState(false);
  const {checkLimit, isLimitReached, limitedEntity, currentCount, maxCount, closeLimitModal} = useLimitCheck();
  const addCategory = useCherishedPeopleStore(state => state.addCategory);
  const updateCategory = useCherishedPeopleStore(state => state.updateCategory);
  const deleteCategory = useCherishedPeopleStore(state => state.deleteCategory);

  // 모드
  const [editingPerson, setEditingPerson] = useState<CherishedPerson | null>(null);
  const isEditMode = !!editingPerson;

  // 폼 상태
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');

  // 태그 데이터
  const [allRelationships, setAllRelationships] = useState<CategoryItem[]>([]);
  const [allRoles, setAllRoles] = useState<CategoryItem[]>([]);
  const [allDepartments, setAllDepartments] = useState<CategoryItem[]>([]);

  const [selectedRelIds, setSelectedRelIds] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  const snapPoints = useMemo(() => [isEditMode ? '92%' : '35%'], [isEditMode]);

  // 마스터 데이터 로드
  const loadTagData = useCallback(async () => {
    if (!userId) return;
    try {
      const [{data: rels}, {data: roleList}, {data: depts}] = await Promise.all([
        supabase.from('relationships').select('id, name, color').eq('user_id', userId).eq('is_active', true).order('name'),
        supabase.from('roles').select('id, name, color').eq('user_id', userId).eq('is_active', true).order('name'),
        supabase.from('departments').select('id, name, color').eq('user_id', userId).eq('is_active', true).order('name'),
      ]);
      if (rels) setAllRelationships(rels as CategoryItem[]);
      if (roleList) setAllRoles(roleList as CategoryItem[]);
      if (depts) setAllDepartments(depts as CategoryItem[]);
    } catch (err) {
      console.error('[AddPersonBottomSheet] Failed to load tags:', err);
    }
  }, [userId]);

  // 편집 시 기존 태그 로드
  const loadPersonTags = useCallback(async (personId: string) => {
    if (!userId) return;
    try {
      const [{data: relLinks}, {data: roleLinks}, {data: deptLinks}] = await Promise.all([
        supabase.from('person_relationships').select('relationship_id').eq('user_id', userId).eq('person_id', personId),
        supabase.from('person_roles').select('role_id').eq('user_id', userId).eq('person_id', personId),
        supabase.from('person_departments').select('department_id').eq('user_id', userId).eq('person_id', personId),
      ]);
      if (relLinks) setSelectedRelIds(relLinks.map(l => l.relationship_id));
      if (roleLinks) setSelectedRoleIds(roleLinks.map(l => l.role_id));
      if (deptLinks) setSelectedDeptIds(deptLinks.map(l => l.department_id));
    } catch (err) {
      console.error('[AddPersonBottomSheet] Failed to load person tags:', err);
    }
  }, [userId]);

  useImperativeHandle(ref, () => ({
    open: (prefillName?: string) => {
      const initial = prefillName?.trim() ?? '';
      setEditingPerson(null);
      setName(initial);
      setNickname('');
      setSelectedRelIds([]);
      setSelectedRoleIds([]);
      setSelectedDeptIds([]);
      setSaving(false);
      if (hasNative) {
        setNativeVisible(true);
      } else {
        bottomSheetRef.current?.present();
        requestAnimationFrame(() => {
          nameRef.current?.setNativeProps({text: initial});
          nicknameRef.current?.setNativeProps({text: ''});
        });
      }
    },
    openEdit: (person: CherishedPerson) => {
      setEditingPerson(person);
      setName(person.name);
      setNickname(person.nickname ?? '');
      setSaving(false);
      loadTagData();
      loadPersonTags(person.id);
      if (hasNative) {
        setNativeVisible(true);
      } else {
        bottomSheetRef.current?.present();
        requestAnimationFrame(() => {
          nameRef.current?.setNativeProps({text: person.name});
          nicknameRef.current?.setNativeProps({text: person.nickname ?? ''});
        });
      }
    },
    close: () => {
      if (hasNative) {
        setNativeVisible(false);
      } else {
        bottomSheetRef.current?.dismiss();
      }
    },
  }));

  // 편집 모드 열릴 때 태그 데이터 로드
  useEffect(() => {
    if (isEditMode) {
      loadTagData();
    }
  }, [isEditMode, loadTagData]);

  const toggleTag = useCallback((id: string, selected: string[], setSelected: (ids: string[]) => void) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  }, []);

  // 저장
  const handleConfirm = useCallback(async () => {
    if (!userId || !name.trim() || saving) return;

    setSaving(true);

    if (isEditMode && editingPerson) {
      try {
        // 이름/별명 업데이트
        await updatePerson(userId, editingPerson.id, {
          name: name.trim(),
          nickname: nickname.trim() || undefined,
        });

        // 관계 업데이트: DELETE all → INSERT selected
        await supabase.from('person_relationships')
          .delete()
          .eq('user_id', userId)
          .eq('person_id', editingPerson.id);
        if (selectedRelIds.length > 0) {
          await supabase.from('person_relationships').insert(
            selectedRelIds.map(rid => ({user_id: userId, person_id: editingPerson.id, relationship_id: rid})),
          );
        }

        // 역할 업데이트
        await supabase.from('person_roles')
          .delete()
          .eq('user_id', userId)
          .eq('person_id', editingPerson.id);
        if (selectedRoleIds.length > 0) {
          await supabase.from('person_roles').insert(
            selectedRoleIds.map(rid => ({user_id: userId, person_id: editingPerson.id, role_id: rid})),
          );
        }

        // 부서 업데이트
        await supabase.from('person_departments')
          .delete()
          .eq('user_id', userId)
          .eq('person_id', editingPerson.id);
        if (selectedDeptIds.length > 0) {
          await supabase.from('person_departments').insert(
            selectedDeptIds.map(did => ({user_id: userId, person_id: editingPerson.id, department_id: did})),
          );
        }

        bottomSheetRef.current?.dismiss();
        onPersonUpdated?.();
      } catch (err) {
        console.error('[AddPersonBottomSheet] Save failed:', err);
      }
    } else {
      // 새로 추가
      const allowed = await checkLimit('cherished_people');
      if (!allowed) {
        setSaving(false);
        return;
      }
      const person = await addPerson(userId, {name: name.trim(), nickname: nickname.trim() || undefined});
      if (person) {
        bottomSheetRef.current?.dismiss();
        onPersonAdded(person);
      }
    }

    setSaving(false);
  }, [userId, name, nickname, saving, isEditMode, editingPerson, selectedRelIds, selectedRoleIds, selectedDeptIds, updatePerson, addPerson, checkLimit, onPersonAdded, onPersonUpdated]);

  // 삭제
  const handleDelete = useCallback(() => {
    if (!editingPerson || !userId) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['취소', '삭제'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 0,
        title: editingPerson.name,
        message: '이 사람과 관련된 모든 기록이 함께 삭제됩니다.',
      },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          const success = await deletePerson(userId, editingPerson.id);
          if (success) {
            bottomSheetRef.current?.dismiss();
            onPersonDeleted?.();
          }
        }
      },
    );
  }, [editingPerson, userId, deletePerson, onPersonDeleted]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0}
      />
    ),
    [],
  );

  const handleCategoryChanged = useCallback(() => {
    loadTagData();
    onCategoriesChanged?.();
  }, [loadTagData, onCategoriesChanged]);

  // snapPoints가 단일 값이므로 expand는 no-op.
  // 카테고리 추가 폼이 펼쳐지면 BottomSheetScrollView가 알아서 스크롤 처리.
  const expandSheet = useCallback(() => {}, []);

  const toggleSelectedFor = useCallback(
    (kind: CategoryKind, id: string) => {
      if (kind === 'relationship') {
        toggleTag(id, selectedRelIds, setSelectedRelIds);
      } else if (kind === 'role') {
        toggleTag(id, selectedRoleIds, setSelectedRoleIds);
      } else {
        toggleTag(id, selectedDeptIds, setSelectedDeptIds);
      }
    },
    [toggleTag, selectedRelIds, selectedRoleIds, selectedDeptIds],
  );

  const countAffected = useCallback(
    (kind: CategoryKind, categoryId: string) =>
      affectedPersonCount?.(kind, categoryId) ?? 0,
    [affectedPersonCount],
  );

  const onAddCategory = useCallback(
    (kind: CategoryKind, name: string, color: string) => {
      if (!userId) return Promise.resolve(null);
      return addCategory(userId, kind, {name, color});
    },
    [addCategory, userId],
  );

  const onUpdateCategory = useCallback(
    (kind: CategoryKind, id: string, patch: {name?: string; color?: string}) => {
      if (!userId) return Promise.resolve(false);
      return updateCategory(userId, kind, id, patch);
    },
    [updateCategory, userId],
  );

  const onDeleteCategory = useCallback(
    (kind: CategoryKind, id: string) => {
      if (!userId) return Promise.resolve(false);
      // 선택 상태에서도 제거
      if (kind === 'relationship') {
        setSelectedRelIds(ids => ids.filter(x => x !== id));
      } else if (kind === 'role') {
        setSelectedRoleIds(ids => ids.filter(x => x !== id));
      } else {
        setSelectedDeptIds(ids => ids.filter(x => x !== id));
      }
      return deleteCategory(userId, kind, id);
    },
    [deleteCategory, userId],
  );

  // ─── Native (iOS) 경로 ───────────────────────
  const nativePersonDataJson = useMemo(
    () =>
      JSON.stringify({
        id: editingPerson?.id,
        name,
        nickname,
      }),
    [editingPerson?.id, name, nickname],
  );
  const nativeRelationshipsJson = useMemo(
    () => JSON.stringify(allRelationships),
    [allRelationships],
  );
  const nativeRolesJson = useMemo(() => JSON.stringify(allRoles), [allRoles]);
  const nativeDepartmentsJson = useMemo(
    () => JSON.stringify(allDepartments),
    [allDepartments],
  );
  const nativeSelectedRelIdsJson = useMemo(
    () => JSON.stringify(selectedRelIds),
    [selectedRelIds],
  );
  const nativeSelectedRoleIdsJson = useMemo(
    () => JSON.stringify(selectedRoleIds),
    [selectedRoleIds],
  );
  const nativeSelectedDeptIdsJson = useMemo(
    () => JSON.stringify(selectedDeptIds),
    [selectedDeptIds],
  );
  const nativeDefaultColorJson = useMemo(
    () => JSON.stringify(DEFAULT_COLOR_BY_KIND),
    [],
  );
  const nativePaletteJson = useMemo(
    () => JSON.stringify(CATEGORY_COLOR_PRESETS),
    [],
  );

  const handleNativeSave = useCallback(
    async (e: {
      nativeEvent: {
        name: string;
        nickname: string;
        selectedRelationshipIds: string[];
        selectedRoleIds: string[];
        selectedDepartmentIds: string[];
      };
    }) => {
      if (!userId || saving) return;
      const n = e.nativeEvent.name.trim();
      if (!n) return;
      const nn = e.nativeEvent.nickname.trim();
      const rIds = e.nativeEvent.selectedRelationshipIds;
      const roleIds = e.nativeEvent.selectedRoleIds;
      const dIds = e.nativeEvent.selectedDepartmentIds;

      setSaving(true);

      if (isEditMode && editingPerson) {
        try {
          await updatePerson(userId, editingPerson.id, {
            name: n,
            nickname: nn || undefined,
          });

          await supabase
            .from('person_relationships')
            .delete()
            .eq('user_id', userId)
            .eq('person_id', editingPerson.id);
          if (rIds.length > 0) {
            await supabase.from('person_relationships').insert(
              rIds.map(rid => ({
                user_id: userId,
                person_id: editingPerson.id,
                relationship_id: rid,
              })),
            );
          }

          await supabase
            .from('person_roles')
            .delete()
            .eq('user_id', userId)
            .eq('person_id', editingPerson.id);
          if (roleIds.length > 0) {
            await supabase.from('person_roles').insert(
              roleIds.map(rid => ({
                user_id: userId,
                person_id: editingPerson.id,
                role_id: rid,
              })),
            );
          }

          await supabase
            .from('person_departments')
            .delete()
            .eq('user_id', userId)
            .eq('person_id', editingPerson.id);
          if (dIds.length > 0) {
            await supabase.from('person_departments').insert(
              dIds.map(did => ({
                user_id: userId,
                person_id: editingPerson.id,
                department_id: did,
              })),
            );
          }

          // JS state 동기화 (다음 openEdit prefetch 정합성)
          setSelectedRelIds(rIds);
          setSelectedRoleIds(roleIds);
          setSelectedDeptIds(dIds);

          setNativeVisible(false);
          onPersonUpdated?.();
        } catch (err) {
          console.error('[AddPersonBottomSheet/native] Save failed:', err);
        }
      } else {
        const allowed = await checkLimit('cherished_people');
        if (!allowed) {
          setSaving(false);
          return;
        }
        const person = await addPerson(userId, {
          name: n,
          nickname: nn || undefined,
        });
        if (person) {
          setNativeVisible(false);
          onPersonAdded(person);
        }
      }
      setSaving(false);
    },
    [
      userId,
      saving,
      isEditMode,
      editingPerson,
      updatePerson,
      addPerson,
      checkLimit,
      onPersonAdded,
      onPersonUpdated,
    ],
  );

  const handleNativeCategoryAdd = useCallback(
    async (e: {nativeEvent: {kind: string; name: string; color: string}}) => {
      const r = await onAddCategory(
        e.nativeEvent.kind as CategoryKind,
        e.nativeEvent.name,
        e.nativeEvent.color,
      );
      if (r) handleCategoryChanged();
    },
    [onAddCategory, handleCategoryChanged],
  );

  const handleNativeCategoryRename = useCallback(
    async (e: {nativeEvent: {kind: string; id: string; name: string}}) => {
      const ok = await onUpdateCategory(
        e.nativeEvent.kind as CategoryKind,
        e.nativeEvent.id,
        {name: e.nativeEvent.name},
      );
      if (ok) handleCategoryChanged();
    },
    [onUpdateCategory, handleCategoryChanged],
  );

  const handleNativeCategoryRecolor = useCallback(
    async (e: {nativeEvent: {kind: string; id: string; color: string}}) => {
      const ok = await onUpdateCategory(
        e.nativeEvent.kind as CategoryKind,
        e.nativeEvent.id,
        {color: e.nativeEvent.color},
      );
      if (ok) handleCategoryChanged();
    },
    [onUpdateCategory, handleCategoryChanged],
  );

  const handleNativeCategoryDelete = useCallback(
    async (e: {nativeEvent: {kind: string; id: string}}) => {
      const ok = await onDeleteCategory(
        e.nativeEvent.kind as CategoryKind,
        e.nativeEvent.id,
      );
      if (ok) handleCategoryChanged();
    },
    [onDeleteCategory, handleCategoryChanged],
  );

  if (hasNative && NativeAddPersonNative) {
    return (
      <>
        <Modal
          visible={nativeVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setNativeVisible(false)}>
          <NativeAddPersonNative
            mode={isEditMode ? 'edit' : 'create'}
            primaryColor={primaryColor}
            personData={nativePersonDataJson}
            relationships={nativeRelationshipsJson}
            roles={nativeRolesJson}
            departments={nativeDepartmentsJson}
            selectedRelationshipIds={nativeSelectedRelIdsJson}
            selectedRoleIds={nativeSelectedRoleIdsJson}
            selectedDepartmentIds={nativeSelectedDeptIdsJson}
            defaultColorByKind={nativeDefaultColorJson}
            paletteColors={nativePaletteJson}
            onSave={handleNativeSave}
            onDelete={handleDelete}
            onClose={() => setNativeVisible(false)}
            onCategoryAdd={handleNativeCategoryAdd}
            onCategoryRename={handleNativeCategoryRename}
            onCategoryRecolor={handleNativeCategoryRecolor}
            onCategoryDelete={handleNativeCategoryDelete}
            style={{flex: 1}}
          />
        </Modal>
        <LimitReachedModal
          visible={isLimitReached}
          onClose={closeLimitModal}
          entityType={limitedEntity}
          currentCount={currentCount}
          maxCount={maxCount}
        />
      </>
    );
  }

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={s.handleIndicator}>
        {isEditMode ? (
          <BottomSheetScrollView contentContainerStyle={s.sheet}>
            {/* 헤더 */}
            <View style={s.editHeader}>
              <Text style={s.title}>정보 수정</Text>
              <AnimatedPressable onPress={handleDelete} hapticType="light" scaleValue={0.95}>
                <Text style={s.deleteText}>삭제</Text>
              </AnimatedPressable>
            </View>

            {/* 이름 */}
            <Text style={s.fieldLabel}>이름</Text>
            <BottomSheetTextInput
              ref={nameRef as any}
              defaultValue={name}
              onChangeText={setName}
              placeholder="이름"
              placeholderTextColor="#9CA3AF"
              style={s.input}
            />

            {/* 별명 */}
            <Text style={s.fieldLabel}>별명 (선택)</Text>
            <BottomSheetTextInput
              ref={nicknameRef as any}
              defaultValue={nickname}
              onChangeText={setNickname}
              placeholder="나만의 별명"
              placeholderTextColor="#9CA3AF"
              style={s.input}
            />

            {/* 관계 태그 */}
            <EditableTagSection
              label="관계"
              kind="relationship"
              items={allRelationships}
              selectedIds={selectedRelIds}
              onToggle={id => toggleSelectedFor('relationship', id)}
              onAdd={onAddCategory}
              onUpdate={onUpdateCategory}
              onDelete={onDeleteCategory}
              onChanged={handleCategoryChanged}
              affectedPersonCount={id => countAffected('relationship', id)}
              onExpandRequest={expandSheet}
            />

            {/* 역할 태그 */}
            <EditableTagSection
              label="역할/직분"
              kind="role"
              items={allRoles}
              selectedIds={selectedRoleIds}
              onToggle={id => toggleSelectedFor('role', id)}
              onAdd={onAddCategory}
              onUpdate={onUpdateCategory}
              onDelete={onDeleteCategory}
              onChanged={handleCategoryChanged}
              affectedPersonCount={id => countAffected('role', id)}
              onExpandRequest={expandSheet}
            />

            {/* 부서 태그 */}
            <EditableTagSection
              label="부서/소속"
              kind="department"
              items={allDepartments}
              selectedIds={selectedDeptIds}
              onToggle={id => toggleSelectedFor('department', id)}
              onAdd={onAddCategory}
              onUpdate={onUpdateCategory}
              onDelete={onDeleteCategory}
              onChanged={handleCategoryChanged}
              affectedPersonCount={id => countAffected('department', id)}
              onExpandRequest={expandSheet}
            />

            {/* 저장 버튼 */}
            <AnimatedPressable
              onPress={handleConfirm}
              hapticType="medium"
              scaleValue={0.96}
              style={[
                s.confirmBtn,
                {backgroundColor: name.trim() ? primaryColor : '#D1D5DB'},
              ]}>
              <Text style={s.confirmBtnText}>
                {saving ? '저장 중...' : '저장'}
              </Text>
            </AnimatedPressable>
          </BottomSheetScrollView>
        ) : (
          <View style={s.sheet}>
            <Text style={s.title}>새 사람 추가</Text>
            <Text style={s.subtitle}>소중한 분의 이름을 입력하세요</Text>

            <BottomSheetTextInput
              ref={nameRef as any}
              defaultValue={name}
              onChangeText={setName}
              placeholder="이름"
              placeholderTextColor="#9CA3AF"
              autoFocus
              style={s.input}
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />

            <AnimatedPressable
              onPress={handleConfirm}
              hapticType="medium"
              scaleValue={0.96}
              style={[
                s.confirmBtn,
                {backgroundColor: name.trim() ? primaryColor : '#D1D5DB'},
              ]}>
              <Text style={s.confirmBtnText}>
                {saving ? '추가 중...' : '추가'}
              </Text>
            </AnimatedPressable>
          </View>
        )}
      </BottomSheetModal>

      <LimitReachedModal
        visible={isLimitReached}
        onClose={closeLimitModal}
        entityType={limitedEntity}
        currentCount={currentCount}
        maxCount={maxCount}
      />
    </>
  );
});

const s = StyleSheet.create({
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 36,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
    marginBottom: 16,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
