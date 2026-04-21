import React, {useCallback, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActionSheetIOS,
  Alert,
  Platform,
  type TextInput,
} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {BottomSheetTextInput} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {Plus, X, Check} from 'lucide-react-native';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {ColorPalettePicker} from './ColorPalettePicker';
import {DEFAULT_COLOR_BY_KIND} from '@/lib/categoryColors';
import type {CategoryKind, CategoryItem} from '@/stores/cherishedPeopleStore';

interface EditableTagSectionProps {
  label: string;
  kind: CategoryKind;
  items: CategoryItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onAdd: (
    kind: CategoryKind,
    name: string,
    color: string,
  ) => Promise<CategoryItem | null>;
  onUpdate: (
    kind: CategoryKind,
    id: string,
    patch: {name?: string; color?: string},
  ) => Promise<boolean>;
  onDelete: (kind: CategoryKind, id: string) => Promise<boolean>;
  onChanged: () => void;
  affectedPersonCount?: (id: string) => number;
  onExpandRequest?: () => void;
}

export function EditableTagSection({
  label,
  kind,
  items,
  selectedIds,
  onToggle,
  onAdd,
  onUpdate,
  onDelete,
  onChanged,
  affectedPersonCount,
  onExpandRequest,
}: EditableTagSectionProps) {
  const {primaryColor} = useTheme();

  const [addingMode, setAddingMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(DEFAULT_COLOR_BY_KIND[kind]);
  const [busy, setBusy] = useState(false);
  const newNameRef = useRef<TextInput>(null);

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const editingNameRef = useRef<TextInput>(null);

  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  const openAddForm = useCallback(() => {
    setAddingMode(true);
    setNewName('');
    setNewColor(DEFAULT_COLOR_BY_KIND[kind]);
    onExpandRequest?.();
    requestAnimationFrame(() => {
      newNameRef.current?.setNativeProps({text: ''});
    });
  }, [kind, onExpandRequest]);

  const cancelAdd = useCallback(() => {
    setAddingMode(false);
    setNewName('');
  }, []);

  const confirmAdd = useCallback(async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    const created = await onAdd(kind, name, newColor);
    setBusy(false);
    if (created) {
      setAddingMode(false);
      setNewName('');
      onChanged();
    }
  }, [busy, newName, newColor, kind, onAdd, onChanged]);

  const startEditName = useCallback(
    (item: CategoryItem) => {
      if (Platform.OS === 'ios') {
        Alert.prompt(
          '이름 변경',
          undefined,
          [
            {text: '취소', style: 'cancel'},
            {
              text: '저장',
              onPress: async (value?: string) => {
                const next = (value ?? '').trim();
                if (!next || next === item.name) return;
                const ok = await onUpdate(kind, item.id, {name: next});
                if (ok) onChanged();
              },
            },
          ],
          'plain-text',
          item.name,
        );
      } else {
        setEditingNameId(item.id);
        setEditingNameValue(item.name);
        onExpandRequest?.();
      }
    },
    [kind, onUpdate, onChanged, onExpandRequest],
  );

  const commitInlineName = useCallback(async () => {
    if (!editingNameId) return;
    const next = editingNameValue.trim();
    const original = items.find(i => i.id === editingNameId);
    if (!next || !original || next === original.name) {
      setEditingNameId(null);
      return;
    }
    const ok = await onUpdate(kind, editingNameId, {name: next});
    setEditingNameId(null);
    if (ok) onChanged();
  }, [editingNameId, editingNameValue, items, kind, onUpdate, onChanged]);

  const startEditColor = useCallback(
    (item: CategoryItem) => {
      setEditingColorId(item.id);
      onExpandRequest?.();
    },
    [onExpandRequest],
  );

  const pickEditColor = useCallback(
    async (color: string) => {
      if (!editingColorId) return;
      const id = editingColorId;
      setEditingColorId(null);
      const ok = await onUpdate(kind, id, {color});
      if (ok) onChanged();
    },
    [editingColorId, kind, onUpdate, onChanged],
  );

  const confirmDelete = useCallback(
    (item: CategoryItem) => {
      const count = affectedPersonCount?.(item.id) ?? 0;
      const message =
        count > 0
          ? `이 카테고리는 ${count}명과 연결되어 있습니다.\n카테고리만 삭제되고 사람은 유지됩니다.`
          : '이 카테고리를 삭제하시겠습니까?';
      Alert.alert(item.name, message, [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const ok = await onDelete(kind, item.id);
            if (ok) onChanged();
          },
        },
      ]);
    },
    [affectedPersonCount, kind, onDelete, onChanged],
  );

  const openChipMenu = useCallback(
    (item: CategoryItem) => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: item.name,
          options: ['취소', '이름 변경', '색상 변경', '삭제'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        idx => {
          if (idx === 1) startEditName(item);
          else if (idx === 2) startEditColor(item);
          else if (idx === 3) confirmDelete(item);
        },
      );
    },
    [startEditName, startEditColor, confirmDelete],
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <AnimatedPressable
          onPress={openAddForm}
          hapticType="light"
          scaleValue={0.95}
          style={[styles.addBtn, {borderColor: hexWithOpacity(primaryColor, 0.3)}]}>
          <Plus size={12} color={primaryColor} />
          <Text style={[styles.addBtnText, {color: primaryColor}]}>추가</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.tagRow}>
        {items.map(item => {
          const isSelected = selectedIds.includes(item.id);
          const isInlineEditing = editingNameId === item.id;

          if (isInlineEditing) {
            return (
              <View
                key={item.id}
                style={[
                  styles.tag,
                  {backgroundColor: hexWithOpacity(item.color, 0.15)},
                  styles.inlineEditWrap,
                ]}>
                <BottomSheetTextInput
                  ref={editingNameRef as any}
                  defaultValue={editingNameValue}
                  onChangeText={setEditingNameValue}
                  autoFocus
                  onSubmitEditing={commitInlineName}
                  returnKeyType="done"
                  style={[styles.inlineInput, {color: item.color}]}
                />
                <AnimatedPressable
                  onPress={commitInlineName}
                  hapticType="light"
                  scaleValue={0.9}
                  style={styles.inlineInputBtn}>
                  <Check size={14} color={item.color} />
                </AnimatedPressable>
              </View>
            );
          }

          return (
            <AnimatedPressable
              key={item.id}
              onPress={() => onToggle(item.id)}
              onLongPress={() => openChipMenu(item)}
              hapticType="light"
              scaleValue={0.95}
              style={[
                styles.tag,
                isSelected
                  ? {backgroundColor: item.color}
                  : {backgroundColor: hexWithOpacity(item.color, 0.12)},
              ]}>
              <Text
                style={[
                  styles.tagText,
                  {color: isSelected ? '#FFFFFF' : item.color},
                ]}>
                {item.name}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {editingColorId && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          style={styles.subForm}>
          <View style={styles.subFormHeader}>
            <Text style={styles.subFormLabel}>색상 변경</Text>
            <AnimatedPressable
              onPress={() => setEditingColorId(null)}
              hapticType="light"
              scaleValue={0.9}
              style={styles.iconBtn}>
              <X size={14} color="#9CA3AF" />
            </AnimatedPressable>
          </View>
          <ColorPalettePicker
            selectedColor={items.find(i => i.id === editingColorId)?.color ?? DEFAULT_COLOR_BY_KIND[kind]}
            onSelect={pickEditColor}
          />
        </Animated.View>
      )}

      {addingMode && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          style={styles.subForm}>
          <BottomSheetTextInput
            ref={newNameRef as any}
            defaultValue={newName}
            onChangeText={setNewName}
            placeholder={`새 ${label} 이름`}
            placeholderTextColor="#9CA3AF"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={confirmAdd}
            style={styles.input}
          />
          <ColorPalettePicker selectedColor={newColor} onSelect={setNewColor} />
          <View style={styles.actionRow}>
            <AnimatedPressable
              onPress={cancelAdd}
              hapticType="light"
              scaleValue={0.96}
              style={[styles.actionBtn, styles.cancelBtn]}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={confirmAdd}
              hapticType="medium"
              scaleValue={0.96}
              disabled={!newName.trim() || busy}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: newName.trim() ? newColor : '#D1D5DB',
                },
              ]}>
              <Text style={styles.confirmBtnText}>
                {busy ? '추가 중...' : '추가'}
              </Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 2,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inlineEditWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  inlineInput: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 80,
    paddingVertical: 0,
  },
  inlineInputBtn: {
    padding: 2,
  },
  subForm: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  subFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subFormLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  iconBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#E5E7EB',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
