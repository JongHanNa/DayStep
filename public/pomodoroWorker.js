// Pomodoro Timer Web Worker
// Handles background timer functionality even when tab is inactive

let timerId = null;
let startTime = null;
let currentDuration = 0;
let isRunning = false;
let isPaused = false;
let pausedTime = 0;

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
    default:
      console.warn('Unknown message type:', type);
  }
});

function startTimer({ duration, timerType = TIMER_TYPES.POMODORO, sessionId }) {
  if (isRunning) {
    stopTimer();
  }

  currentDuration = duration || DEFAULT_DURATIONS[timerType];
  startTime = performance.now();
  isRunning = true;
  isPaused = false;
  pausedTime = 0;

  // Send initial status
  self.postMessage({
    type: 'TIMER_STARTED',
    payload: {
      duration: currentDuration,
      timerType,
      sessionId,
      timestamp: Date.now()
    }
  });

  // Start the timer loop
  tick();
}

function pauseTimer() {
  if (!isRunning || isPaused) return;

  isPaused = true;
  pausedTime = performance.now() - startTime;

  self.postMessage({
    type: 'TIMER_PAUSED',
    payload: {
      remainingTime: Math.max(0, currentDuration - pausedTime),
      timestamp: Date.now()
    }
  });
}

function resumeTimer() {
  if (!isRunning || !isPaused) return;

  isPaused = false;
  startTime = performance.now() - pausedTime;

  self.postMessage({
    type: 'TIMER_RESUMED',
    payload: {
      remainingTime: Math.max(0, currentDuration - pausedTime),
      timestamp: Date.now()
    }
  });

  tick();
}

function stopTimer() {
  isRunning = false;
  isPaused = false;
  pausedTime = 0;
  startTime = null;

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

  const now = performance.now();
  const elapsed = now - startTime;
  const remainingTime = Math.max(0, currentDuration - elapsed);

  // Send progress update
  self.postMessage({
    type: 'TIMER_TICK',
    payload: {
      remainingTime,
      elapsed,
      progress: elapsed / currentDuration,
      timestamp: Date.now()
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
      duration: currentDuration
    }
  });

  // Reset state
  startTime = null;
  currentDuration = 0;
  pausedTime = 0;
}

function sendStatus() {
  const now = performance.now();
  let remainingTime = 0;
  let elapsed = 0;
  let progress = 0;

  if (isRunning && startTime) {
    if (isPaused) {
      elapsed = pausedTime;
    } else {
      elapsed = now - startTime;
    }
    remainingTime = Math.max(0, currentDuration - elapsed);
    progress = elapsed / currentDuration;
  }

  self.postMessage({
    type: 'TIMER_STATUS',
    payload: {
      isRunning,
      isPaused,
      remainingTime,
      elapsed,
      progress,
      duration: currentDuration,
      timestamp: Date.now()
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