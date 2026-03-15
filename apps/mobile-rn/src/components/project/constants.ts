/**
 * Project constants — 상태 필터, 라벨, 유틸
 */
import type {ProjectStatus} from '@/types/project';
import type {Todo} from '@daystep/shared-core';
import {format} from 'date-fns';

export const STATUS_FILTERS: {key: ProjectStatus | 'all'; label: string}[] = [
  {key: 'all', label: '전체'},
  {key: 'not_started', label: '시작안함'},
  {key: 'in_progress', label: '진행중'},
  {key: 'on_hold', label: '중단'},
  {key: 'completed', label: '완료'},
];

/** 색상 통일: 모든 상태 중립 회색, 완료만 시맨틱 초록 */
export const STATUS_LABELS: Record<ProjectStatus, {label: string; color: string; bg: string}> = {
  not_started: {label: '시작안함', color: '#6B7280', bg: '#F3F4F6'},
  in_progress: {label: '진행중', color: '#6B7280', bg: '#F3F4F6'},
  on_hold: {label: '중단', color: '#6B7280', bg: '#F3F4F6'},
  completed: {label: '완료', color: '#22C55E', bg: '#F0FDF4'},
};

export function formatTodoDate(todo: Todo): string {
  if (!todo.start_time) {
    return todo.schedule_type === 'anytime' ? '언제든지' : '';
  }
  const date = new Date(todo.start_time);
  const dateStr = format(date, 'M/d');
  if (todo.schedule_type === 'anytime') return `${dateStr} · 언제든지`;
  if (todo.schedule_type === 'all_day') return dateStr;
  return `${dateStr} ${format(date, 'HH:mm')}`;
}

/** 상태별 LiquidGlassMenu 메뉴 아이템 생성 */
export function getStatusMenuItems(currentStatus: ProjectStatus) {
  const items: {title: string; key: ProjectStatus}[] = [];

  switch (currentStatus) {
    case 'not_started':
      items.push({title: '시작하기', key: 'in_progress'});
      break;
    case 'in_progress':
      items.push(
        {title: '시작안함으로', key: 'not_started'},
        {title: '중단', key: 'on_hold'},
        {title: '완료', key: 'completed'},
      );
      break;
    case 'on_hold':
      items.push(
        {title: '재개', key: 'in_progress'},
        {title: '완료', key: 'completed'},
      );
      break;
    case 'completed':
      items.push({title: '다시 진행', key: 'in_progress'});
      break;
  }

  return items;
}
