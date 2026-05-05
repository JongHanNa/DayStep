/**
 * ProjectCard — 프로젝트 카드
 * - 색상 바 제거 → 8px 도트
 * - 상태 뱃지 중립색 통일
 * - 상태 전환 버튼들 → NativeMenu 1개
 */
import React, {useMemo} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {NativeMenu} from '@/components/native/NativeMenu';
import {Edit3, Trash2, RefreshCw} from 'lucide-react-native';
import {resolveTodoIcon} from '@/lib/iconMap';
import {STATUS_LABELS, getStatusMenuItems} from './constants';
import type {Project, ProjectStatus} from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onStatusChange: (status: ProjectStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({
  project,
  onStatusChange,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const statusInfo = STATUS_LABELS[project.status] ?? STATUS_LABELS.not_started;
  const menuItems = useMemo(
    () => getStatusMenuItems(project.status),
    [project.status],
  );

  return (
    <View className="mx-4 mb-3">
      <AnimatedCard enterDelay={0}>
        {/* 헤더 */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            {/* 프로젝트 색상 도트 */}
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: project.color ?? '#A8DADC',
                marginRight: 8,
              }}
            />
            {project.icon && (() => {
              const IconComponent = resolveTodoIcon(project.icon);
              if (IconComponent) {
                return <IconComponent size={18} color="#6B7280" style={{marginRight: 8}} />;
              }
              return <Text className="text-lg mr-2">{project.icon}</Text>;
            })()}
            <Text
              className="text-base font-semibold text-gray-800 flex-1"
              numberOfLines={1}>
              {project.title}
            </Text>
          </View>
          <View
            className="px-2 py-0.5 rounded-full"
            style={{backgroundColor: statusInfo.bg}}>
            <Text
              className="text-xs font-medium"
              style={{color: statusInfo.color}}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* 설명 */}
        {project.description && (
          <Text className="text-sm text-gray-500 mb-3" numberOfLines={2}>
            {project.description}
          </Text>
        )}

        {/* 액션 바: NativeMenu + 편집/삭제 */}
        <View className="flex-row items-center justify-between border-t border-gray-100 pt-3 mt-1">
          <View className="flex-row items-center">
            {menuItems.length > 0 && (
              <NativeMenu
                systemIconName="arrow.triangle.2.circlepath"
                iconColor="#9CA3AF"
                size={32}
                menuItems={menuItems}
                onSelect={(key) => onStatusChange(key as ProjectStatus)}
                fallbackIcon={<RefreshCw size={16} color="#9CA3AF" />}
              />
            )}
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={onEdit}
              className="p-2"
              hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
              <Edit3 size={16} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              className="p-2 ml-1"
              hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
              <Trash2 size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedCard>
    </View>
  );
}
