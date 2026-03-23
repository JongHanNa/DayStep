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
import {View, Text, StyleSheet, ScrollView, ActionSheetIOS} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useLimitCheck} from '@/hooks/useLimitCheck';
import {LimitReachedModal} from '@/components/subscription/LimitReachedModal';
import {supabase} from '@/lib/supabase';
import {hexWithOpacity} from '@/lib/todoUtils';
import type {CherishedPerson} from '@/stores/cherishedPeopleStore';

export interface AddPersonBottomSheetRef {
  open: (prefillName?: string) => void;
  openEdit: (person: CherishedPerson) => void;
  close: () => void;
}

interface AddPersonBottomSheetProps {
  onPersonAdded: (person: CherishedPerson) => void;
  onPersonUpdated?: () => void;
  onPersonDeleted?: () => void;
  addPerson: (userId: string, data: {name: string; nickname?: string}) => Promise<CherishedPerson | null>;
  updatePerson: (userId: string, personId: string, data: Partial<{name: string; nickname: string}>) => Promise<boolean>;
  deletePerson: (userId: string, personId: string) => Promise<boolean>;
  userId: string | undefined;
}

interface TagItem {
  id: string;
  name: string;
  color?: string;
}

export const AddPersonBottomSheet = forwardRef<
  AddPersonBottomSheetRef,
  AddPersonBottomSheetProps
>(function AddPersonBottomSheet(
  {onPersonAdded, onPersonUpdated, onPersonDeleted, addPerson, updatePerson, deletePerson, userId},
  ref,
) {
  const {primaryColor} = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [saving, setSaving] = useState(false);
  const {checkLimit, isLimitReached, limitedEntity, currentCount, maxCount, closeLimitModal} = useLimitCheck();

  // 모드
  const [editingPerson, setEditingPerson] = useState<CherishedPerson | null>(null);
  const isEditMode = !!editingPerson;

  // 폼 상태
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');

  // 태그 데이터
  const [allRelationships, setAllRelationships] = useState<TagItem[]>([]);
  const [allRoles, setAllRoles] = useState<TagItem[]>([]);
  const [allDepartments, setAllDepartments] = useState<TagItem[]>([]);

  const [selectedRelIds, setSelectedRelIds] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  const snapPoints = useMemo(() => [isEditMode ? '75%' : '35%'], [isEditMode]);

  // 마스터 데이터 로드
  const loadTagData = useCallback(async () => {
    if (!userId) return;
    try {
      const [{data: rels}, {data: roleList}, {data: depts}] = await Promise.all([
        supabase.from('relationships').select('id, name, color').eq('user_id', userId).eq('is_active', true).order('name'),
        supabase.from('roles').select('id, name').eq('user_id', userId).eq('is_active', true).order('name'),
        supabase.from('departments').select('id, name').eq('user_id', userId),
      ]);
      if (rels) setAllRelationships(rels);
      if (roleList) setAllRoles(roleList);
      if (depts) setAllDepartments(depts);
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
      setEditingPerson(null);
      setName(prefillName?.trim() ?? '');
      setNickname('');
      setSelectedRelIds([]);
      setSelectedRoleIds([]);
      setSelectedDeptIds([]);
      setSaving(false);
      bottomSheetRef.current?.present();
    },
    openEdit: (person: CherishedPerson) => {
      setEditingPerson(person);
      setName(person.name);
      setNickname(person.nickname ?? '');
      setSaving(false);
      loadTagData();
      loadPersonTags(person.id);
      bottomSheetRef.current?.present();
    },
    close: () => {
      bottomSheetRef.current?.dismiss();
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

  const renderTagSection = (
    label: string,
    items: TagItem[],
    selected: string[],
    setSelected: (ids: string[]) => void,
  ) => {
    if (items.length === 0) return null;
    return (
      <View style={s.tagSection}>
        <Text style={s.tagLabel}>{label}</Text>
        <View style={s.tagRow}>
          {items.map(item => {
            const isSelected = selected.includes(item.id);
            return (
              <AnimatedPressable
                key={item.id}
                onPress={() => toggleTag(item.id, selected, setSelected)}
                hapticType="light"
                scaleValue={0.95}
                style={[
                  s.tag,
                  isSelected
                    ? {backgroundColor: primaryColor}
                    : {backgroundColor: '#F3F4F6'},
                ]}>
                <Text style={[
                  s.tagText,
                  {color: isSelected ? 'white' : '#6B7280'},
                ]}>
                  {item.name}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={false}
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
              value={name}
              onChangeText={setName}
              placeholder="이름"
              placeholderTextColor="#9CA3AF"
              style={s.input}
            />

            {/* 별명 */}
            <Text style={s.fieldLabel}>별명 (선택)</Text>
            <BottomSheetTextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="나만의 별명"
              placeholderTextColor="#9CA3AF"
              style={s.input}
            />

            {/* 관계 태그 */}
            {renderTagSection('관계', allRelationships, selectedRelIds, setSelectedRelIds)}

            {/* 역할 태그 */}
            {renderTagSection('역할/직분', allRoles, selectedRoleIds, setSelectedRoleIds)}

            {/* 부서 태그 */}
            {renderTagSection('부서/소속', allDepartments, selectedDeptIds, setSelectedDeptIds)}

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
              value={name}
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
  tagSection: {
    marginBottom: 16,
  },
  tagLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
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
