import { Todo as DatabaseTodo, ScheduleType, RecurrencePattern } from '@/types';

/**
 * Todo Domain Entity
 * 할일 도메인의 핵심 비즈니스 로직을 담당 (새로운 스키마 기반)
 */
export class Todo {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly title: string,
    public readonly completed: boolean,
    public readonly orderIndex: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly priority: string | null = null,
    public readonly icon: string | null = null,
    public readonly color: string | null = null,

    // 새로운 스케줄 관리 필드들
    public readonly scheduleType: ScheduleType,
    public readonly startTime: Date | null = null,
    public readonly endTime: Date | null = null,

    // 반복 일정 필드들
    public readonly recurrencePattern: RecurrencePattern,
    public readonly recurrenceEndDate: Date | null = null,
    public readonly recurrenceCount: number | null = null,
    public readonly recurrenceInterval: number,
    public readonly recurrenceDaysOfWeek: number[] | null = null,
    public readonly recurrenceDayOfMonth: number | null = null,
    public readonly parentTodoId: string | null = null,

    // 출발 정보 필드들
    public readonly departureLocation: string | null = null,
    public readonly departureTime: Date | null = null,

    // Second Brain 관계 필드들 (프로젝트/목표/영역/자원)
    public readonly projectId: string | null = null,
    public readonly goalId: string | null = null,
    public readonly areaId: string | null = null,
    public readonly resourceId: string | null = null,

    // 관계 할일 필드
    public readonly isRelationshipTask: boolean = false,

    // 소중한 사람 연결 필드
    public readonly joyfulPeopleIds: string[] = [],
    public readonly shamefulPeopleIds: string[] = []
  ) {}

  /**
   * 데이터베이스 할일 데이터로부터 Todo 엔티티 생성
   * Performance optimized version with safer type handling
   */
  static fromDatabase(data: DatabaseTodo | any): Todo {
    // Improved field mapping with better type safety and null checks
    const record = data as any;
    const scheduleType = record.scheduleType ?? record.schedule_type;
    const startTime = record.startTime ?? record.start_time;
    const endTime = record.endTime ?? record.end_time;
    const createdAt = record.createdAt ?? record.created_at;
    const updatedAt = record.updatedAt ?? record.updated_at;
    const recurrencePattern = record.recurrencePattern ?? record.recurrence_pattern;
    const recurrenceEndDate = record.recurrenceEndDate ?? record.recurrence_end_date;
    const recurrenceCount = record.recurrenceCount ?? record.recurrence_count;
    const recurrenceInterval = record.recurrenceInterval ?? record.recurrence_interval ?? 1;
    const recurrenceDaysOfWeek = record.recurrenceDaysOfWeek ?? record.recurrence_days_of_week;
    const recurrenceDayOfMonth = record.recurrenceDayOfMonth ?? record.recurrence_day_of_month;
    const parentTodoId = record.parentTodoId ?? record.parent_todo_id;
    const userId = record.userId ?? record.user_id;
    const orderIndex = record.orderIndex ?? record.order_index ?? 0;

    // 출발 정보 필드들
    const departureLocation = record.departureLocation ?? record.departure_location;
    const departureTime = record.departureTime ?? record.departure_time;

    // Second Brain 관계 필드들
    // project_ids 배열을 projectId (첫 번째 프로젝트)로 변환
    const projectIds = record.projectIds ?? record.project_ids ?? [];
    const projectId = Array.isArray(projectIds) && projectIds.length > 0 ? projectIds[0] : (record.projectId ?? record.project_id ?? null);
    const goalId = record.goalId ?? record.goal_id;
    const areaId = record.areaId ?? record.area_id;
    const resourceId = record.resourceId ?? record.resource_id;

    // 관계 할일 필드
    const isRelationshipTask = record.isRelationshipTask ?? record.is_relationship_task ?? false;

    // 소중한 사람 연결 필드
    const joyfulPeopleIds = record.joyfulPeopleIds ?? record.joyful_people_ids ?? [];
    const shamefulPeopleIds = record.shamefulPeopleIds ?? record.shameful_people_ids ?? [];

    // title 필드
    const title = data.title;

    return new Todo(
      data.id,
      userId || '',
      title,
      data.completed,
      orderIndex || 0,
      new Date(createdAt || new Date()),
      new Date(updatedAt || new Date()),
      data.priority,
      data.icon,
      data.color,

      // 새로운 스케줄 필드들
      scheduleType,
      startTime ? new Date(startTime) : null,
      endTime ? new Date(endTime) : null,

      // 반복 일정 필드들
      recurrencePattern,
      recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      recurrenceCount || null,
      recurrenceInterval || 1,
      Array.isArray(recurrenceDaysOfWeek)
        ? recurrenceDaysOfWeek as number[]
        : null,
      recurrenceDayOfMonth,
      parentTodoId,

      // 출발 정보 필드들
      departureLocation || null,
      departureTime ? new Date(departureTime) : null,

      // Second Brain 관계 필드들
      projectId || null,
      goalId || null,
      areaId || null,
      resourceId || null,

      // 관계 할일 필드
      isRelationshipTask,

      // 소중한 사람 연결 필드
      joyfulPeopleIds || [],
      shamefulPeopleIds || []
    );
  }

  /**
   * 새로운 할일 생성을 위한 데이터 반환
   */
  static create(
    userId: string,
    title: string,
    scheduleType: ScheduleType,
    options: {
      orderIndex?: number;
      priority?: string;
      startTime?: Date;
      endTime?: Date;
      recurrencePattern?: RecurrencePattern;
      recurrenceEndDate?: Date;
      recurrenceCount?: number;
      recurrenceInterval?: number;
      recurrenceDaysOfWeek?: number[];
      recurrenceDayOfMonth?: number;
      parentTodoId?: string;
    } = {}
  ): {
    user_id: string;
    title: string;
    completed: boolean;
    order_index: number;
    schedule_type: ScheduleType;
    start_time?: string;
    end_time?: string;
    priority?: string;
    recurrence_pattern: RecurrencePattern;
    recurrence_end_date?: string;
    recurrence_count?: number;
    recurrence_interval: number;
    recurrence_days_of_week?: number[];
    recurrence_day_of_month?: number;
    parent_todo_id?: string;
  } {
    // 비즈니스 규칙 검증
    if (!title.trim()) {
      throw new Error('할일 내용은 필수입니다.');
    }

    if (title.length > 500) {
      throw new Error('할일 내용은 500자를 초과할 수 없습니다.');
    }

    if ((options.orderIndex ?? 0) < 0) {
      throw new Error('순서는 0 이상이어야 합니다.');
    }

    // 시간 지정 일정인데 시작 시간이 없으면 에러
    if (scheduleType === 'timed' && !options.startTime) {
      throw new Error('시간 지정 일정은 시작 시간이 필요합니다.');
    }


    // 종료 시간이 시작 시간보다 빠르면 에러
    if (options.startTime && options.endTime && options.endTime <= options.startTime) {
      throw new Error('종료 시간은 시작 시간보다 늦어야 합니다.');
    }

    return {
      user_id: userId,
      title: title.trim(),
      completed: false,
      order_index: options.orderIndex ?? 0,
      priority: options.priority,
      
      // 스케줄 정보
      schedule_type: scheduleType,
      start_time: options.startTime?.toISOString(),
      end_time: options.endTime?.toISOString(),
      
      // 반복 정보
      recurrence_pattern: options.recurrencePattern ?? 'none',
      recurrence_end_date: options.recurrenceEndDate?.toISOString().split('T')[0], // Date only
      recurrence_count: options.recurrenceCount,
      recurrence_interval: options.recurrenceInterval ?? 1,
      recurrence_days_of_week: options.recurrenceDaysOfWeek,
      recurrence_day_of_month: options.recurrenceDayOfMonth,
      parent_todo_id: options.parentTodoId,
    };
  }

  // ========== 스케줄 타입 체크 메서드들 ==========
  
  /**
   * 종일 일정 여부 확인
   */
  isAllDay(): boolean {
    return this.scheduleType === 'all_day';
  }

  /**
   * 시간 지정 일정 여부 확인
   */
  isTimed(): boolean {
    return this.scheduleType === 'timed';
  }

  /**
   * 언제든지 할일 여부 확인
   */
  isAnytime(): boolean {
    return this.scheduleType === 'anytime';
  }


  // ========== 반복 일정 체크 메서드들 ==========
  
  /**
   * 반복 일정 여부 확인
   */
  isRecurring(): boolean {
    return this.recurrencePattern !== 'none';
  }

  /**
   * 매일 반복 여부 확인
   */
  isDailyRecurring(): boolean {
    return this.recurrencePattern === 'daily';
  }

  /**
   * 매주 반복 여부 확인
   */
  isWeeklyRecurring(): boolean {
    return this.recurrencePattern === 'weekly';
  }

  /**
   * 매월 반복 여부 확인
   */
  isMonthlyRecurring(): boolean {
    return this.recurrencePattern === 'monthly';
  }

  /**
   * 커스텀 반복 여부 확인
   */
  isCustomRecurring(): boolean {
    return this.recurrencePattern === 'custom';
  }

  // ========== 시간 계산 메서드들 ==========
  
  /**
   * 일정 지속 시간 계산 (밀리초)
   */
  getDuration(): number | null {
    if (!this.isTimed() || !this.startTime || !this.endTime) {
      return null;
    }
    return this.endTime.getTime() - this.startTime.getTime();
  }

  /**
   * 일정 지속 시간 (분 단위)
   */
  getDurationInMinutes(): number | null {
    const duration = this.getDuration();
    return duration ? Math.round(duration / (1000 * 60)) : null;
  }

  /**
   * 일정 지속 시간 (시간 단위)
   */
  getDurationInHours(): number | null {
    const duration = this.getDuration();
    return duration ? Math.round(duration / (1000 * 60 * 60) * 10) / 10 : null;
  }

  // ========== 포맷팅 메서드들 ==========
  
  /**
   * 시작 시간 포맷팅
   */
  getFormattedStartTime(): string | null {
    if (!this.startTime) return null;
    return this.startTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * 종료 시간 포맷팅
   */
  getFormattedEndTime(): string | null {
    if (!this.endTime) return null;
    return this.endTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * 시간 범위 포맷팅
   */
  getFormattedTimeRange(): string | null {
    const start = this.getFormattedStartTime();
    const end = this.getFormattedEndTime();
    
    if (start && end) {
      return `${start} - ${end}`;
    } else if (start) {
      return start;
    }
    return null;
  }

  /**
   * 반복 패턴 설명 생성
   */
  getRecurrenceDescription(): string {
    if (!this.isRecurring()) {
      return '반복 없음';
    }

    const interval = this.recurrenceInterval;
    let base = '';

    switch (this.recurrencePattern) {
      case 'daily':
        base = interval === 1 ? '매일' : `${interval}일마다`;
        break;
      case 'weekly':
        if (this.recurrenceDaysOfWeek && this.recurrenceDaysOfWeek.length > 0) {
          const days = this.recurrenceDaysOfWeek.map(day => {
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            return dayNames[day % 7];
          }).join(', ');
          base = interval === 1 ? `매주 ${days}요일` : `${interval}주마다 ${days}요일`;
        } else {
          base = interval === 1 ? '매주' : `${interval}주마다`;
        }
        break;
      case 'monthly':
        if (this.recurrenceDayOfMonth) {
          base = interval === 1 
            ? `매월 ${this.recurrenceDayOfMonth}일` 
            : `${interval}개월마다 ${this.recurrenceDayOfMonth}일`;
        } else {
          base = interval === 1 ? '매월' : `${interval}개월마다`;
        }
        break;
      case 'custom':
        base = '사용자 정의';
        break;
    }

    // 종료 조건 추가
    if (this.recurrenceEndDate) {
      const endDate = this.recurrenceEndDate.toLocaleDateString('ko-KR');
      base += ` (${endDate}까지)`;
    } else if (this.recurrenceCount) {
      base += ` (${this.recurrenceCount}회)`;
    }

    return base;
  }

  // ========== 기존 비즈니스 로직 메서드들 ==========
  
  /**
   * 할일 완료 상태 토글
   */
  toggle(): Todo {
    return new Todo(
      this.id,
      this.userId,
      this.title,
      !this.completed,
      this.orderIndex,
      this.createdAt,
      new Date(), // 업데이트 시간 갱신
      this.priority,
      this.icon,
      this.color,
      this.scheduleType,
      this.startTime,
      this.endTime,
      this.recurrencePattern,
      this.recurrenceEndDate,
      this.recurrenceCount,
      this.recurrenceInterval,
      this.recurrenceDaysOfWeek,
      this.recurrenceDayOfMonth,
      this.parentTodoId,
      this.departureLocation,
      this.departureTime,
      this.projectId,
      this.goalId,
      this.areaId,
      this.resourceId,
      this.isRelationshipTask
    );
  }

  /**
   * 할일 내용 수정
   */
  updateContent(title: string): Todo {
    // 비즈니스 규칙 검증
    if (!title.trim()) {
      throw new Error('할일 내용은 필수입니다.');
    }

    if (title.length > 500) {
      throw new Error('할일 내용은 500자를 초과할 수 없습니다.');
    }

    if (title.trim() === this.title) {
      return this; // 내용이 같으면 변경 없음
    }

    return new Todo(
      this.id,
      this.userId,
      title.trim(),
      this.completed,
      this.orderIndex,
      this.createdAt,
      new Date(),
      this.priority,
      this.icon,
      this.color,
      this.scheduleType,
      this.startTime,
      this.endTime,
      this.recurrencePattern,
      this.recurrenceEndDate,
      this.recurrenceCount,
      this.recurrenceInterval,
      this.recurrenceDaysOfWeek,
      this.recurrenceDayOfMonth,
      this.parentTodoId,
      this.departureLocation,
      this.departureTime,
      this.projectId,
      this.goalId,
      this.areaId,
      this.resourceId,
      this.isRelationshipTask
    );
  }

  // ========== 계산된 속성들 ==========
  
  /**
   * 할일 생성 후 경과 일수
   */
  get daysSinceCreated(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 할일 상태 아이콘
   */
  get statusIcon(): string {
    if (this.completed) return '✅';
    if (this.isAllDay()) return '📅';
    if (this.isTimed()) return '⏰';
    return '⭕';
  }

  /**
   * 반복 일정 아이콘
   */
  get recurrenceIcon(): string {
    if (!this.isRecurring()) return '';
    return '🔄';
  }

  /**
   * 데이터베이스 형식으로 변환
   */
  toDatabase(): any {
    return {
      id: this.id,
      user_id: this.userId,
      title: this.title,
      completed: this.completed,
      order_index: this.orderIndex,
      priority: this.priority,
      icon: this.icon,
      color: this.color,

      // 새로운 스케줄 필드들
      schedule_type: this.scheduleType,
      start_time: this.startTime?.toISOString() || null,
      end_time: this.endTime?.toISOString() || null,

      // 출발 정보 필드들
      departure_location: this.departureLocation,
      departure_time: this.departureTime?.toISOString() || null,

      // 반복 필드들
      recurrence_pattern: this.recurrencePattern,
      recurrence_end_date: this.recurrenceEndDate?.toISOString().split('T')[0] || null,
      recurrence_count: this.recurrenceCount,
      recurrence_interval: this.recurrenceInterval,
      recurrence_days_of_week: this.recurrenceDaysOfWeek,
      recurrence_day_of_month: this.recurrenceDayOfMonth,
      parent_todo_id: this.parentTodoId,

      // Second Brain 관계 필드들 (DB에는 project_id만 존재)
      project_id: this.projectId,

      // 관계 태그
      is_relationship_task: this.isRelationshipTask,

      // 소중한 사람 연결 필드
      joyful_people_ids: this.joyfulPeopleIds,
      shameful_people_ids: this.shamefulPeopleIds,

      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }

}