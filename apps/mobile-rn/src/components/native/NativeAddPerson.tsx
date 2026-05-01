/**
 * NativeAddPerson — 사람 추가/편집 네이티브 시트 TS wrapper
 * iOS: SwiftUI NavigationView + Form + chip 토글 + .sheet (카테고리 add/rename/recolor)
 * Android: TBD — 폴백 사용
 */
import React from 'react';
import {UIManager, requireNativeComponent} from 'react-native';

export interface NativeAddPersonPersonData {
  id?: string;
  name: string;
  nickname: string;
}

export interface NativeAddPersonCategory {
  id: string;
  name: string;
  color: string;
}

interface NativeAddPersonProps {
  mode: 'create' | 'edit';
  primaryColor: string;
  personData: string;                  // JSON of NativeAddPersonPersonData
  relationships: string;               // JSON of Category[]
  roles: string;
  departments: string;
  selectedRelationshipIds: string;     // JSON of string[]
  selectedRoleIds: string;
  selectedDepartmentIds: string;
  defaultColorByKind: string;          // JSON of {relationship,role,department: hex}
  paletteColors: string;               // JSON of string[]
  /** Android: 시트 표시 여부. iOS 미사용. */
  isOpen?: boolean;

  onSave: (e: {nativeEvent: {
    name: string;
    nickname: string;
    selectedRelationshipIds: string[];
    selectedRoleIds: string[];
    selectedDepartmentIds: string[];
  }}) => void;
  onDelete: (e: {nativeEvent: {}}) => void;
  onClose: (e: {nativeEvent: {}}) => void;
  onCategoryAdd: (e: {nativeEvent: {kind: string; name: string; color: string}}) => void;
  onCategoryRename: (e: {nativeEvent: {kind: string; id: string; name: string}}) => void;
  onCategoryRecolor: (e: {nativeEvent: {kind: string; id: string; color: string}}) => void;
  onCategoryDelete: (e: {nativeEvent: {kind: string; id: string}}) => void;
  style?: any;
}

const hasNativeModule =
  UIManager.getViewManagerConfig('NativeAddPerson') != null;

const NativeAddPersonView = hasNativeModule
  ? requireNativeComponent<NativeAddPersonProps>('NativeAddPerson')
  : null;

function NativeAddPersonComponent(
  props: NativeAddPersonProps,
): React.ReactElement | null {
  if (!NativeAddPersonView) return null;
  return <NativeAddPersonView {...props} />;
}

export const NativeAddPersonNative = hasNativeModule
  ? NativeAddPersonComponent
  : null;
