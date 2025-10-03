import {
  TimelineTask,
  TimelineTaskInsert,
  TimelineTaskUpdate,
  PomodoroSession,
  PomodoroSessionInsert,
  PomodoroSessionUpdate,
  TaskTemplate,
  TaskTemplateInsert,
  TaskTemplateUpdate,
  TaskStatus,
  TaskPriority,
} from "../../types";
import { supabase } from "../../lib/supabase";
import {
  createStore,
  createAsyncAction,
  createOptimisticUpdate,
  createRealtimeHelpers,
  createFilterHelpers,
  logStoreAction,
} from "../utils/storeUtils";
import type { BaseStoreState, FilterState } from "../types";

/**
 * 타임라인 스토어 상태 타입 정의
 */
interface TimelineStoreState extends BaseStoreState {
  // 데이터 상태
  tasks: TimelineTask[];
  sessions: PomodoroSession[];
  templates: TaskTemplate[];
  currentTask: TimelineTask | null;

  // API 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 필터 및 정렬 상태
  filters: FilterState & {
    status: TaskStatus | "all";
    priority: TaskPriority | "all";
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    showCompleted: boolean;
  };

  // 실시간 구독 상태
  isSubscribed: boolean;
  channel: any;

  // 통계 정보
  stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    plannedTasks: number;
    totalWorkTime: number; // in minutes
    totalSessions: number;
    completionRate: number;
    todayCompletedTasks: number;
    todayWorkTime: number;
  };

  // 포모도로 타이머 상태
  timerState: {
    isRunning: boolean;
    currentSession: PomodoroSession | null;
    timeRemaining: number; // in seconds
    currentPhase: "work" | "short-break" | "long-break";
    completedPomodoros: number;
  };

  // 액션들 - 작업 관리
  fetchTasks: () => Promise<void>;
  fetchTaskById: (id: string) => Promise<TimelineTask | null>;
  createTask: (data: TimelineTaskInsert) => Promise<TimelineTask | null>;
  updateTask: (
    id: string,
    data: TimelineTaskUpdate
  ) => Promise<TimelineTask | null>;
  deleteTask: (id: string) => Promise<boolean>;

  // 작업 상태 관리
  startTask: (id: string) => Promise<boolean>;
  completeTask: (id: string) => Promise<boolean>;
  cancelTask: (id: string) => Promise<boolean>;

  // 포모도로 세션 관리
  fetchSessions: (taskId?: string) => Promise<void>;
  createSession: (
    data: PomodoroSessionInsert
  ) => Promise<PomodoroSession | null>;
  updateSession: (
    id: string,
    data: PomodoroSessionUpdate
  ) => Promise<PomodoroSession | null>;
  completeSession: (id: string) => Promise<boolean>;

  // 포모도로 타이머 제어
  startTimer: (taskId: string) => Promise<boolean>;
  pauseTimer: () => void;
  stopTimer: () => Promise<boolean>;
  tickTimer: () => void;
  switchPhase: (phase: "work" | "short-break" | "long-break") => void;

  // 템플릿 관리
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: TaskTemplateInsert) => Promise<TaskTemplate | null>;
  updateTemplate: (
    id: string,
    data: TaskTemplateUpdate
  ) => Promise<TaskTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  createTaskFromTemplate: (
    templateId: string,
    customData?: Partial<TimelineTaskInsert>
  ) => Promise<TimelineTask | null>;

  // 필터링 및 검색
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: TaskStatus | "all") => void;
  setPriorityFilter: (priority: TaskPriority | "all") => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  setShowCompleted: (show: boolean) => void;
  setSortBy: (sortBy: string, sortOrder?: "asc" | "desc") => void;

  // 선택 상태 관리
  selectTask: (task: TimelineTask | null) => void;

  // 실시간 구독
  subscribe: () => void;
  unsubscribe: () => void;

  // 통계 및 유틸리티
  refreshStats: () => void;
  getFilteredTasks: () => TimelineTask[];
  getTasksForDate: (date: Date) => TimelineTask[];
  getTasksForWeek: (weekStart: Date) => TimelineTask[];
  getTasksByStatus: (status: TaskStatus) => TimelineTask[];
  getTasksByPriority: (priority: TaskPriority) => TimelineTask[];

  // 시간 관리 유틸리티
  calculateTaskDuration: (task: TimelineTask) => number; // in minutes
  getTotalWorkTimeForDate: (date: Date) => number;
  getCompletionRateForPeriod: (start: Date, end: Date) => number;

  // 스토어 초기화
  reset: () => void;
}

/**
 * 타임라인 스토어 생성
 */
export const useTimelineStore = createStore<TimelineStoreState>(
  (set, get) => ({
    // 초기 상태
    initialized: false,
    version: 1,
    tasks: [],
    sessions: [],
    templates: [],
    currentTask: null,
    loading: false,
    error: null,
    lastUpdated: null,
    filters: {
      searchQuery: "",
      sortBy: "planned_start_time",
      sortOrder: "asc",
      filters: {},
      status: "all",
      priority: "all",
      dateRange: {
        start: null,
        end: null,
      },
      showCompleted: true,
    },
    isSubscribed: false,
    channel: null,
    stats: {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      plannedTasks: 0,
      totalWorkTime: 0,
      totalSessions: 0,
      completionRate: 0,
      todayCompletedTasks: 0,
      todayWorkTime: 0,
    },
    timerState: {
      isRunning: false,
      currentSession: null,
      timeRemaining: 1500, // 25 minutes default
      currentPhase: "work",
      completedPomodoros: 0,
    },

    /**
     * 작업 목록 조회
     */
    fetchTasks: createAsyncAction(async () => {
      logStoreAction("TimelineStore", "fetchTasks");

      const { data, error } = await supabase
        .from("timeline_tasks")
        .select("*")
        .order("planned_start_time", { ascending: true });

      if (error) {
        throw error;
      }

      set((state: any) => {
        state.tasks = data;
        state.refreshStats();
      });
    }),

    /**
     * 특정 작업 조회
     */
    fetchTaskById: async (id: string) => {
      logStoreAction("TimelineStore", "fetchTaskById", { id });

      try {
        const { data, error } = await supabase
          .from("timeline_tasks")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }

        return data;
      } catch (error) {
        console.error("작업 조회 오류:", error);
        return null;
      }
    },

    /**
     * 새 작업 생성
     */
    createTask: createAsyncAction(async (data: TimelineTaskInsert) => {
      logStoreAction("TimelineStore", "createTask", data);

      // 낙관적 업데이트
      const tempId = `temp-${Date.now()}`;
      const optimisticTask: TimelineTask = {
        id: tempId,
        user_id: data.user_id,
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        planned_start_time: data.planned_start_time || null,
        planned_end_time: data.planned_end_time || null,
        actual_start_time: null,
        actual_end_time: null,
        status: data.status || "planned",
        priority: data.priority || "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state: any) => {
        state.tasks.push(optimisticTask);
        state.refreshStats();
      });

      try {
        const { data: created, error } = await supabase
          .from("timeline_tasks")
          .insert([data])
          .select()
          .single();

        if (error) {
          throw error;
        }

        set((state: any) => {
          // 낙관적 업데이트 제거하고 실제 데이터로 교체
          state.tasks = state.tasks.filter((t: any) => t.id !== tempId);
          state.tasks.push(created);
          state.refreshStats();
        });

        return created;
      } catch (error) {
        // 낙관적 업데이트 롤백
        set((state: any) => {
          state.tasks = state.tasks.filter((t: any) => t.id !== tempId);
          state.refreshStats();
        });
        throw error;
      }
    }),

    /**
     * 작업 업데이트
     */
    updateTask: createAsyncAction(
      async (id: string, data: TimelineTaskUpdate) => {
        logStoreAction("TimelineStore", "updateTask", { id, data });

        // 원본 데이터 백업
        const originalTasks = [...get().tasks];

        // 낙관적 업데이트
        set((state: any) => {
          const index = state.tasks.findIndex((t: any) => t.id === id);
          if (index !== -1) {
            state.tasks[index] = { ...state.tasks[index], ...data };
          }
          state.refreshStats();
        });

        try {
          const { data: updated, error } = await supabase
            .from("timeline_tasks")
            .update(data)
            .eq("id", id)
            .select()
            .single();

          if (error) {
            throw error;
          }

          set((state: any) => {
            const index = state.tasks.findIndex((t: any) => t.id === id);
            if (index !== -1) {
              state.tasks[index] = updated;
            }
            state.refreshStats();
          });

          return updated;
        } catch (error) {
          // 낙관적 업데이트 롤백
          set((state: any) => {
            state.tasks = originalTasks;
            state.refreshStats();
          });
          throw error;
        }
      }
    ),

    /**
     * 작업 삭제
     */
    deleteTask: createAsyncAction(async (id: string) => {
      logStoreAction("TimelineStore", "deleteTask", { id });

      // 원본 데이터 백업
      const originalTasks = [...get().tasks];

      // 낙관적 업데이트
      set((state: any) => {
        state.tasks = state.tasks.filter((t: any) => t.id !== id);
        state.refreshStats();
      });

      try {
        const { error } = await supabase
          .from("timeline_tasks")
          .delete()
          .eq("id", id);

        if (error) {
          throw error;
        }

        return true;
      } catch (error) {
        // 낙관적 업데이트 롤백
        set((state: any) => {
          state.tasks = originalTasks;
          state.refreshStats();
        });
        throw error;
      }
    }),

    /**
     * 작업 시작
     */
    startTask: async (id: string) => {
      const now = new Date().toISOString();
      const result = await get().updateTask(id, {
        status: "in-progress",
        actual_start_time: now,
      });

      if (result) {
        set((state: any) => {
          state.currentTask = result;
        });
        return true;
      }
      return false;
    },

    /**
     * 작업 완료
     */
    completeTask: async (id: string) => {
      const now = new Date().toISOString();
      const result = await get().updateTask(id, {
        status: "completed",
        actual_end_time: now,
      });

      if (result) {
        set((state: any) => {
          if (state.currentTask?.id === id) {
            state.currentTask = null;
          }
        });
        return true;
      }
      return false;
    },

    /**
     * 작업 취소
     */
    cancelTask: async (id: string) => {
      const result = await get().updateTask(id, {
        status: "cancelled",
      });

      if (result) {
        set((state: any) => {
          if (state.currentTask?.id === id) {
            state.currentTask = null;
          }
        });
        return true;
      }
      return false;
    },

    /**
     * 포모도로 세션 목록 조회
     */
    fetchSessions: createAsyncAction(async (taskId?: string) => {
      logStoreAction("TimelineStore", "fetchSessions", { taskId });

      let query = supabase
        .from("pomodoro_sessions")
        .select("*")
        .order("start_time", { ascending: false });

      if (taskId) {
        query = query.eq("task_id", taskId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      set((state: any) => {
        state.sessions = data;
        state.refreshStats();
      });
    }),

    /**
     * 새 포모도로 세션 생성
     */
    createSession: createAsyncAction(async (data: PomodoroSessionInsert) => {
      logStoreAction("TimelineStore", "createSession", data);

      const { data: created, error } = await supabase
        .from("pomodoro_sessions")
        .insert([data])
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state: any) => {
        state.sessions.unshift(created);
        state.refreshStats();
      });

      return created;
    }),

    /**
     * 포모도로 세션 업데이트
     */
    updateSession: createAsyncAction(
      async (id: string, data: PomodoroSessionUpdate) => {
        logStoreAction("TimelineStore", "updateSession", { id, data });

        const { data: updated, error } = await supabase
          .from("pomodoro_sessions")
          .update(data)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        set((state: any) => {
          const index = state.sessions.findIndex((s: any) => s.id === id);
          if (index !== -1) {
            state.sessions[index] = updated;
          }
          state.refreshStats();
        });

        return updated;
      }
    ),

    /**
     * 포모도로 세션 완료
     */
    completeSession: async (id: string) => {
      const now = new Date().toISOString();
      const session = get().sessions.find((s: any) => s.id === id);

      if (!session) return false;

      const duration = session.start_time
        ? Math.floor(
            (new Date(now).getTime() - new Date(session.start_time).getTime()) /
              60000
          )
        : 25; // default 25 minutes

      const result = await get().updateSession(id, {
        end_time: now,
        duration,
        is_completed: true,
      });

      return !!result;
    },

    /**
     * 포모도로 타이머 시작
     */
    startTimer: async (taskId: string) => {
      const task = get().tasks.find((t: any) => t.id === taskId);
      if (!task) return false;

      // 새 세션 생성
      const session = await get().createSession({
        task_id: taskId,
        user_id: task.user_id,
        start_time: new Date().toISOString(),
      });

      if (!session) return false;

      set((state: any) => {
        state.timerState.isRunning = true;
        state.timerState.currentSession = session;
        state.timerState.timeRemaining = 1500; // 25 minutes
        state.timerState.currentPhase = "work";
        state.currentTask = task;
      });

      // 작업 상태를 진행중으로 변경
      await get().startTask(taskId);

      return true;
    },

    /**
     * 포모도로 타이머 일시정지
     */
    pauseTimer: () => {
      set((state: any) => {
        state.timerState.isRunning = false;
      });
    },

    /**
     * 포모도로 타이머 중지
     */
    stopTimer: async () => {
      const { currentSession } = get().timerState;

      if (currentSession) {
        await get().completeSession(currentSession.id);
      }

      set((state: any) => {
        state.timerState.isRunning = false;
        state.timerState.currentSession = null;
        state.timerState.timeRemaining = 1500;
        state.timerState.currentPhase = "work";
      });

      return true;
    },

    /**
     * 타이머 틱 (1초마다 호출)
     */
    tickTimer: () => {
      set((state: any) => {
        if (state.timerState.isRunning && state.timerState.timeRemaining > 0) {
          state.timerState.timeRemaining -= 1;

          // 시간이 다 되면 자동으로 다음 단계로
          if (state.timerState.timeRemaining === 0) {
            if (state.timerState.currentPhase === "work") {
              state.timerState.completedPomodoros += 1;
              // 4번째 포모도로 후에는 긴 휴식
              const nextPhase =
                state.timerState.completedPomodoros % 4 === 0
                  ? "long-break"
                  : "short-break";
              state.timerState.currentPhase = nextPhase;
              state.timerState.timeRemaining =
                nextPhase === "long-break" ? 900 : 300; // 15분 또는 5분
            } else {
              state.timerState.currentPhase = "work";
              state.timerState.timeRemaining = 1500; // 25분
            }
          }
        }
      });
    },

    /**
     * 타이머 단계 전환
     */
    switchPhase: (phase: "work" | "short-break" | "long-break") => {
      set((state: any) => {
        state.timerState.currentPhase = phase;
        state.timerState.timeRemaining =
          phase === "work" ? 1500 : phase === "short-break" ? 300 : 900;
      });
    },

    /**
     * 템플릿 목록 조회
     */
    fetchTemplates: createAsyncAction(async () => {
      logStoreAction("TimelineStore", "fetchTemplates");

      const { data, error } = await supabase
        .from("task_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      set((state: any) => {
        state.templates = data;
      });
    }),

    /**
     * 새 템플릿 생성
     */
    createTemplate: createAsyncAction(async (data: TaskTemplateInsert) => {
      logStoreAction("TimelineStore", "createTemplate", data);

      const { data: created, error } = await supabase
        .from("task_templates")
        .insert([data])
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state: any) => {
        state.templates.unshift(created);
      });

      return created;
    }),

    /**
     * 템플릿 업데이트
     */
    updateTemplate: createAsyncAction(
      async (id: string, data: TaskTemplateUpdate) => {
        logStoreAction("TimelineStore", "updateTemplate", { id, data });

        const { data: updated, error } = await supabase
          .from("task_templates")
          .update(data)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        set((state: any) => {
          const index = state.templates.findIndex((t: any) => t.id === id);
          if (index !== -1) {
            state.templates[index] = updated;
          }
        });

        return updated;
      }
    ),

    /**
     * 템플릿 삭제
     */
    deleteTemplate: createAsyncAction(async (id: string) => {
      logStoreAction("TimelineStore", "deleteTemplate", { id });

      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      set((state: any) => {
        state.templates = state.templates.filter((t: any) => t.id !== id);
      });

      return true;
    }),

    /**
     * 템플릿으로부터 작업 생성
     */
    createTaskFromTemplate: async (
      templateId: string,
      customData?: Partial<TimelineTaskInsert>
    ) => {
      const template = get().templates.find((t: any) => t.id === templateId);
      if (!template) return null;

      const taskData: TimelineTaskInsert = {
        user_id: template.user_id,
        title: template.title,
        description: template.description,
        ...customData,
      };

      return get().createTask(taskData);
    },

    // 필터링 관련 액션들
    setSearchQuery: (query: string) => {
      set((state: any) => {
        state.filters.searchQuery = query;
      });
    },

    setStatusFilter: (status: TaskStatus | "all") => {
      set((state: any) => {
        state.filters.status = status;
      });
    },

    setPriorityFilter: (priority: TaskPriority | "all") => {
      set((state: any) => {
        state.filters.priority = priority;
      });
    },


    setDateRange: (start: Date | null, end: Date | null) => {
      set((state: any) => {
        state.filters.dateRange = { start, end };
      });
    },

    setShowCompleted: (show: boolean) => {
      set((state: any) => {
        state.filters.showCompleted = show;
      });
    },

    setSortBy: (sortBy: string, sortOrder: "asc" | "desc" = "asc") => {
      set((state: any) => {
        state.filters.sortBy = sortBy;
        state.filters.sortOrder = sortOrder;
      });
    },

    /**
     * 작업 선택
     */
    selectTask: (task: TimelineTask | null) => {
      set((state: any) => {
        state.currentTask = task;
      });
    },

    /**
     * 실시간 구독 시작
     */
    subscribe: () => {
      if (get().isSubscribed) return;

      logStoreAction("TimelineStore", "subscribe");

      const realtimeHelpers = createRealtimeHelpers();

      const channel = supabase
        .channel("timeline")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "timeline_tasks" },
          (payload) => {
            set((state: any) => {
              realtimeHelpers.handleInsert(state, payload.new);
              state.refreshStats();
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "timeline_tasks" },
          (payload) => {
            set((state: any) => {
              realtimeHelpers.handleUpdate(state, payload.new);
              state.refreshStats();
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "timeline_tasks" },
          (payload) => {
            set((state: any) => {
              realtimeHelpers.handleDelete(state, (payload.old as any).id);
              state.refreshStats();
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "pomodoro_sessions" },
          (payload) => {
            set((state: any) => {
              state.sessions.unshift(payload.new);
              state.refreshStats();
            });
          }
        )
        .subscribe();

      set((state: any) => {
        state.isSubscribed = true;
        state.channel = channel;
      });
    },

    /**
     * 실시간 구독 해제
     */
    unsubscribe: () => {
      if (!get().isSubscribed) return;

      logStoreAction("TimelineStore", "unsubscribe");

      const { channel } = get();
      if (channel) {
        supabase.removeChannel(channel);
      }

      set((state: any) => {
        state.isSubscribed = false;
        state.channel = null;
      });
    },

    /**
     * 통계 새로고침
     */
    refreshStats: () => {
      const { tasks, sessions } = get();

      const completedTasks = tasks.filter(
        (t: any) => t.status === "completed"
      ).length;
      const inProgressTasks = tasks.filter(
        (t: any) => t.status === "in-progress"
      ).length;
      const plannedTasks = tasks.filter(
        (t: any) => t.status === "planned"
      ).length;
      const totalTasks = tasks.length;

      // 총 작업 시간 계산 (완료된 세션들)
      const totalWorkTime = sessions
        .filter((s: any) => s.is_completed && s.duration)
        .reduce((sum: number, s: any) => sum + s.duration, 0);

      // 오늘 완료된 작업과 작업 시간
      const today = new Date().toDateString();
      const todayCompletedTasks = tasks.filter(
        (t: any) =>
          t.status === "completed" &&
          t.actual_end_time &&
          new Date(t.actual_end_time).toDateString() === today
      ).length;

      const todayWorkTime = sessions
        .filter(
          (s: any) =>
            s.is_completed &&
            s.end_time &&
            new Date(s.end_time).toDateString() === today
        )
        .reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

      const stats = {
        totalTasks,
        completedTasks,
        inProgressTasks,
        plannedTasks,
        totalWorkTime,
        totalSessions: sessions.length,
        completionRate:
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        todayCompletedTasks,
        todayWorkTime,
      };

      set((state: any) => {
        state.stats = stats;
      });
    },

    /**
     * 필터링된 작업 목록 반환
     */
    getFilteredTasks: () => {
      const { tasks, filters } = get();
      const filterHelpers = createFilterHelpers<TimelineTask>();

      let filteredTasks = tasks;

      // 상태 필터링
      if (filters.status !== "all") {
        filteredTasks = filteredTasks.filter(
          (t: any) => t.status === filters.status
        );
      }

      // 우선순위 필터링
      if (filters.priority !== "all") {
        filteredTasks = filteredTasks.filter(
          (t: any) => t.priority === filters.priority
        );
      }


      // 날짜 범위 필터링
      if (filters.dateRange.start || filters.dateRange.end) {
        filteredTasks = filteredTasks.filter((t: any) => {
          const taskDate = t.planned_start_time
            ? new Date(t.planned_start_time)
            : null;
          if (!taskDate) return false;

          if (filters.dateRange.start && taskDate < filters.dateRange.start)
            return false;
          if (filters.dateRange.end && taskDate > filters.dateRange.end)
            return false;

          return true;
        });
      }

      // 완료된 작업 표시/숨김
      if (!filters.showCompleted) {
        filteredTasks = filteredTasks.filter(
          (t: any) => t.status !== "completed"
        );
      }

      return filterHelpers.filterData(filteredTasks, {
        searchQuery: filters.searchQuery,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });
    },

    /**
     * 특정 날짜의 작업 목록 반환
     */
    getTasksForDate: (date: Date) => {
      const dateStr = date.toDateString();
      return get().tasks.filter((t: any) => {
        const taskDate = t.planned_start_time
          ? new Date(t.planned_start_time)
          : null;
        return taskDate && taskDate.toDateString() === dateStr;
      });
    },

    /**
     * 특정 주의 작업 목록 반환
     */
    getTasksForWeek: (weekStart: Date) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      return get().tasks.filter((t: any) => {
        const taskDate = t.planned_start_time
          ? new Date(t.planned_start_time)
          : null;
        return taskDate && taskDate >= weekStart && taskDate < weekEnd;
      });
    },

    /**
     * 상태별 작업 목록 반환
     */
    getTasksByStatus: (status: TaskStatus) => {
      return get().tasks.filter((t: any) => t.status === status);
    },

    /**
     * 우선순위별 작업 목록 반환
     */
    getTasksByPriority: (priority: TaskPriority) => {
      return get().tasks.filter((t: any) => t.priority === priority);
    },

    /**
     * 작업 소요 시간 계산
     */
    calculateTaskDuration: (task: TimelineTask) => {
      if (task.actual_start_time && task.actual_end_time) {
        const start = new Date(task.actual_start_time);
        const end = new Date(task.actual_end_time);
        return Math.floor((end.getTime() - start.getTime()) / 60000); // minutes
      }
      return 0;
    },

    /**
     * 특정 날짜의 총 작업 시간 반환
     */
    getTotalWorkTimeForDate: (date: Date) => {
      const dateStr = date.toDateString();
      return get()
        .sessions.filter(
          (s: any) =>
            s.is_completed &&
            s.end_time &&
            new Date(s.end_time).toDateString() === dateStr
        )
        .reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
    },

    /**
     * 기간별 완료율 계산
     */
    getCompletionRateForPeriod: (start: Date, end: Date) => {
      const tasksInPeriod = get().tasks.filter((t: any) => {
        const taskDate = t.planned_start_time
          ? new Date(t.planned_start_time)
          : null;
        return taskDate && taskDate >= start && taskDate <= end;
      });

      if (tasksInPeriod.length === 0) return 0;

      const completedTasks = tasksInPeriod.filter(
        (t: any) => t.status === "completed"
      ).length;
      return (completedTasks / tasksInPeriod.length) * 100;
    },

    /**
     * 스토어 초기화
     */
    reset: () => {
      get().unsubscribe();

      set((state: any) => {
        state.tasks = [];
        state.sessions = [];
        state.templates = [];
        state.currentTask = null;
        state.loading = false;
        state.error = null;
        state.lastUpdated = null;
        state.filters = {
          searchQuery: "",
          sortBy: "planned_start_time",
          sortOrder: "asc",
          filters: {},
          status: "all",
          priority: "all",
          dateRange: {
            start: null,
            end: null,
          },
          showCompleted: true,
        };
        state.stats = {
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          plannedTasks: 0,
          totalWorkTime: 0,
          totalSessions: 0,
          completionRate: 0,
          todayCompletedTasks: 0,
          todayWorkTime: 0,
        };
        state.timerState = {
          isRunning: false,
          currentSession: null,
          timeRemaining: 1500,
          currentPhase: "work",
          completedPomodoros: 0,
        };
      });
    },
  }),
  {
    name: "timeline-store",
    devtools: true,
    persist: {
      name: "daystep-timeline",
      version: 1,
      blacklist: [
        "loading",
        "error",
        "isSubscribed",
        "timerState",
        "currentTask",
      ],
    },
  }
);
