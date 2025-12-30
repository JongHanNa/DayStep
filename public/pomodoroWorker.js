// Pomodoro Timer Web Worker
// Handles background timer functionality even when tab is inactive

let timerId = null;
let startTime = null;         // performance.now() 기준 (Worker 내부용)
let currentDuration = 0;
let isRunning = false;
let isPaused = false;
let pausedTime = 0;           // performance.now() 기준 경과 시간 (Worker 내부용)

// DB 기준 절대 시간 변수 (경과/남은 시간 동기화용)
let dbStartTime = null;       // DB 원본 시작 시간 (ms timestamp)
let dbDuration = null;        // DB 원본 duration (ms)
let pausedAt = null;          // 일시정지 시점 (ms timestamp)

// Timer types
const TIMER_TYPES = {
  POMODORO: 'POMODORO',
  SHORT_BREAK: 'SHORT_BREAK',
  LONG_BREAK: 'LONG_BREAK'
};

// Default durations in milliseconds
const DEFAULT_DURATIONS = {
  [TIMER_TYPES.POMODORO]: 25 * 60 * 1000, // 25 minutes
  [TIMER_TYPES.SHORT_BREAK]: 5 * 60 * 1000, // 5 minutes
  [TIMER_TYPES.LONG_BREAK]: 15 * 60 * 1000 // 15 minutes
};

// Message handler
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'START_TIMER':
      startTimer(payload);
      break;
    case 'PAUSE_TIMER':
      pauseTimer();
      break;
    case 'RESUME_TIMER':
      resumeTimer();
      break;
    case 'STOP_TIMER':
      stopTimer();
      break;
    case 'GET_STATUS':
      sendStatus();
      break;
    case 'ADJUST_TIME':
      adjustTime(payload.delta);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
});

function startTimer({ duration, timerType = TIMER_TYPES.POMODORO, sessionId, startTime: dbStart }) {
  if (isRunning) {
    stopTimer();
  }

  // DB 기준 시간 설정 (경과/남은 시간 동기화의 핵심)
  if (dbStart) {
    // 세션 복원인 경우 - DB 시작 시간 사용
    dbStartTime = dbStart;
    dbDuration = duration;  // 이 경우 duration은 DB의 원본 duration
  } else {
    // 새 세션인 경우 - 현재 시간 사용
    dbStartTime = Date.now();
    dbDuration = duration || DEFAULT_DURATIONS[timerType];
  }

  // Worker 내부용 변수 설정
  currentDuration = dbDuration;
  startTime = performance.now();
  isRunning = true;
  isPaused = false;
  pausedTime = 0;
  pausedAt = null;

  // 초기 경과/남은 시간 계산
  const now = Date.now();
  const dbElapsed = now - dbStartTime;
  const remainingTime = Math.max(0, dbDuration - dbElapsed);

  // Send initial status
  self.postMessage({
    type: 'TIMER_STARTED',
    payload: {
      duration: dbDuration,
      remainingTime,
      elapsed: dbElapsed,
      timerType,
      sessionId,
      timestamp: now
    }
  });

  // Start the timer loop
  tick();
}

function pauseTimer() {
  if (!isRunning || isPaused) return;

  isPaused = true;
  pausedTime = performance.now() - startTime;
  pausedAt = Date.now();  // 일시정지 시점 기록 (DB 기준)

  // DB 기준 경과/남은 시간 계산
  const dbElapsed = pausedAt - dbStartTime;
  const remainingTime = Math.max(0, dbDuration - dbElapsed);

  self.postMessage({
    type: 'TIMER_PAUSED',
    payload: {
      remainingTime,
      elapsed: dbElapsed,
      duration: dbDuration,
      timestamp: pausedAt
    }
  });
}

function resumeTimer() {
  if (!isRunning || !isPaused) return;

  isPaused = false;

  // 일시정지 동안의 시간을 dbStartTime에 더해서 보정
  const now = Date.now();
  const pausedDuration = now - pausedAt;
  dbStartTime += pausedDuration;  // 시작 시간을 미뤄서 경과 시간 유지

  // Worker 내부용 변수도 보정
  startTime = performance.now() - pausedTime;
  pausedAt = null;

  // DB 기준 경과/남은 시간 계산
  const dbElapsed = now - dbStartTime;
  const remainingTime = Math.max(0, dbDuration - dbElapsed);

  self.postMessage({
    type: 'TIMER_RESUMED',
    payload: {
      remainingTime,
      elapsed: dbElapsed,
      duration: dbDuration,
      timestamp: now
    }
  });

  tick();
}

function stopTimer() {
  isRunning = false;
  isPaused = false;
  pausedTime = 0;
  startTime = null;
  dbStartTime = null;
  dbDuration = null;
  pausedAt = null;

  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }

  self.postMessage({
    type: 'TIMER_STOPPED',
    payload: {
      timestamp: Date.now()
    }
  });
}

function tick() {
  if (!isRunning || isPaused) return;

  const now = Date.now();
  // DB 기준 경과 시간 (절대 시간)
  const dbElapsed = now - dbStartTime;
  const remainingTime = Math.max(0, dbDuration - dbElapsed);

  // Send progress update
  self.postMessage({
    type: 'TIMER_TICK',
    payload: {
      remainingTime,
      elapsed: dbElapsed,             // DB 기준 경과 시간
      progress: dbElapsed / dbDuration,
      duration: dbDuration,           // 항상 DB duration
      timestamp: now
    }
  });

  // Check if timer is complete
  if (remainingTime <= 0) {
    completeTimer();
    return;
  }

  // Schedule next tick (using setTimeout for better accuracy than setInterval)
  timerId = setTimeout(tick, 100); // Update every 100ms for smooth UI
}

function completeTimer() {
  isRunning = false;
  isPaused = false;

  self.postMessage({
    type: 'TIMER_COMPLETED',
    payload: {
      timestamp: Date.now(),
      duration: dbDuration
    }
  });

  // Reset state
  startTime = null;
  currentDuration = 0;
  pausedTime = 0;
  dbStartTime = null;
  dbDuration = null;
  pausedAt = null;
}

function adjustTime(delta) {
  if (!isRunning) return;

  // DB duration 조정 (최소 1분 = 60000ms 보장)
  dbDuration = Math.max(60000, dbDuration + delta);
  currentDuration = dbDuration;

  // 현재 경과/남은 시간 계산 (DB 기준)
  const now = Date.now();
  let dbElapsed;

  if (isPaused && pausedAt) {
    dbElapsed = pausedAt - dbStartTime;
  } else {
    dbElapsed = now - dbStartTime;
  }

  const remainingTime = Math.max(0, dbDuration - dbElapsed);

  self.postMessage({
    type: 'TIME_ADJUSTED',
    payload: {
      duration: dbDuration,
      remainingTime,
      elapsed: dbElapsed,
      delta,
      timestamp: now
    }
  });
}

function sendStatus() {
  const now = Date.now();
  let remainingTime = 0;
  let elapsed = 0;
  let progress = 0;

  if (isRunning && dbStartTime) {
    if (isPaused && pausedAt) {
      // 일시정지 상태: 일시정지 시점 기준
      elapsed = pausedAt - dbStartTime;
    } else {
      // 실행 중: 현재 시간 기준
      elapsed = now - dbStartTime;
    }
    remainingTime = Math.max(0, dbDuration - elapsed);
    progress = elapsed / dbDuration;
  }

  self.postMessage({
    type: 'TIMER_STATUS',
    payload: {
      isRunning,
      isPaused,
      remainingTime,
      elapsed,
      progress,
      duration: dbDuration || currentDuration,
      timestamp: now
    }
  });
}

// Error handling
self.addEventListener('error', (error) => {
  self.postMessage({
    type: 'WORKER_ERROR',
    payload: {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno,
      timestamp: Date.now()
    }
  });
});

// Initial ready message
self.postMessage({
  type: 'WORKER_READY',
  payload: {
    timestamp: Date.now(),
    defaultDurations: DEFAULT_DURATIONS,
    timerTypes: TIMER_TYPES
  }
});
