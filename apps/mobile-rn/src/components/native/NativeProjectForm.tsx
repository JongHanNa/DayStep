/**
 * NativeProjectForm — 프로젝트 생성/편집 네이티브 시트 TS wrapper
 * iOS: SwiftUI NavigationView + Form + TextField + .sheet (외관 picker)
 * Android: TBD — 현재는 폴백(@gorhom/bottom-sheet) 경로 사용
 * 네이티브 미등록 시 null export → RN 폴백
 */
import React from 'react';
import {UIManager, requireNativeComponent} from 'react-native';

export interface NativeProjectFormProjectData {
  id?: string;
  title: string;
  description: string;
  color: string;
  icon: string; // lucide key
  status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | null;
}

export interface NativeProjectFormLinkedTodo {
  id: string;
  title: string;
  completed: boolean;
  dateLabel: string;
}

export interface NativeProjectFormStatusMenuItem {
  title: string;
  key: string;
}

interface NativeProjectFormProps {
  mode: 'create' | 'edit';
  primaryColor: string;
  projectData: string; // JSON of NativeProjectFormProjectData
  linkedTodosData: string; // JSON of NativeProjectFormLinkedTodo[]
  paletteColors: string; // JSON of string[]
  paletteIcons: string; // JSON of string[]
  statusMenuItemsData: string; // JSON of NativeProjectFormStatusMenuItem[]
  statusLabel: string;
  statusBadgeColor: string;
  statusBadgeBg: string;
  loadingTodos: boolean;
  onSave: (e: {nativeEvent: {title: string; description: string; color: string; icon: string}}) => void;
  onStatusChange: (e: {nativeEvent: {status: string}}) => void;
  onUnlinkTodo: (e: {nativeEvent: {todoId: string}}) => void;
  onClose: (e: {nativeEvent: {}}) => void;
  style?: any;
}

const hasNativeModule =
  UIManager.getViewManagerConfig('NativeProjectForm') != null;

const NativeProjectFormView = hasNativeModule
  ? requireNativeComponent<NativeProjectFormProps>('NativeProjectForm')
  : null;

function NativeProjectFormComponent(
  props: NativeProjectFormProps,
): React.ReactElement | null {
  if (!NativeProjectFormView) return null;
  return <NativeProjectFormView {...props} />;
}

/** null when native module not registered */
export const NativeProjectFormNative = hasNativeModule
  ? NativeProjectFormComponent
  : null;
