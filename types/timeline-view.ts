// Timeline View specific type definitions for main timeline component
import { Todo, TimelineTask } from './index';
import { TaskStatus, TaskPriority } from './timeline';

// Timeline view modes
export type TimelineViewMode = 'daily' | 'weekly' | 'monthly';

// Timeline item types that can be displayed
export type TimelineItemType = 'todo' | 'timeline-task' | 'calendar' | 'gap' | 'current-time' | 'remaining-time';

// Base timeline item interface
export interface BaseTimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  startTime: Date;
  endTime?: Date;
  isAllDay?: boolean;
  color?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Todo as timeline item
export interface TodoTimelineItem extends BaseTimelineItem {
  type: 'todo';
  data: Todo;
  isCompleted: boolean;
  priority?: 'low' | 'medium' | 'high';
}

// Timeline task as timeline item
export interface TimelineTaskItem extends BaseTimelineItem {
  type: 'timeline-task';
  data: TimelineTask;
  status: TaskStatus;
  priority: TaskPriority;
  plannedDuration?: number; // in minutes
}

// Calendar event as timeline item
export interface CalendarTimelineItem extends BaseTimelineItem {
  type: 'calendar';
  data: any; // CalendarEvent type from calendar types
  source: string;
  calendarName?: string;
  priority?: 'low' | 'medium' | 'high';
  description?: string;
}

// Union type for all timeline items
export type TimelineItem =
  | TodoTimelineItem
  | TimelineTaskItem
  | CalendarTimelineItem;

// Timeline group by time
export interface TimelineGroup {
  date: Date;
  items: TimelineItem[];
  isToday?: boolean;
  isCurrentWeek?: boolean;
  isCurrentMonth?: boolean;
}

// Timeline hour slot for daily view
export interface TimelineHourSlot {
  hour: number; // 0-23
  items: TimelineItem[];
}

// Timeline day data
export interface TimelineDayData {
  date: Date;
  hourSlots: TimelineHourSlot[];
  allDayItems: TimelineItem[];
  totalItems: number;
}

// Timeline week data
export interface TimelineWeekData {
  weekStart: Date;
  weekEnd: Date;
  days: TimelineDayData[];
  weekNumber: number;
  totalItems: number;
}

// Timeline month data
export interface TimelineMonthData {
  year: number;
  month: number; // 0-11
  weeks: TimelineWeekData[];
  totalItems: number;
}

// Timeline viewport info for virtualization
export interface TimelineViewport {
  startIndex: number;
  endIndex: number;
  visibleItemCount: number;
  totalItemCount: number;
  scrollOffset: number;
}

// Timeline filter options specific to view
export interface TimelineViewFilters {
  itemTypes: TimelineItemType[];
  dateRange: {
    start: Date;
    end: Date;
  };
  showCompleted: boolean;
  showCancelled: boolean;
  searchQuery?: string;
  priorities?: ('low' | 'medium' | 'high')[];
}

// Timeline sort options
export interface TimelineViewSortOptions {
  field: 'startTime' | 'title' | 'priority' | 'type' | 'createdAt';
  direction: 'asc' | 'desc';
}

// Timeline scroll position state
export interface TimelineScrollState {
  viewMode: TimelineViewMode;
  currentDate: Date;
  scrollPosition: number;
  focusedItemId?: string;
}

// Timeline item dimensions for virtualization
export interface TimelineItemDimensions {
  itemId: string;
  height: number;
  offsetTop: number;
}

// Timeline animation state
export interface TimelineAnimationState {
  expandedItems: Set<string>;
  highlightedItems: Set<string>;
  draggedItem?: string;
  dropTargetDate?: Date;
}