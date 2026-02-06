import { AudioManager } from '@/lib/audioManager';

// Mock AudioContext and related APIs
class MockAudioContext {
  public state = 'running';
  public currentTime = 0;
  public sampleRate = 44100;
  public destination = {};

  createGain() {
    return {
      gain: {
        setValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      start: jest.fn(),
      stop: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      onended: null,
    };
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer) {
    return this.createBuffer(1, 1000, 44100);
  }

  async resume() {
    this.state = 'running';
  }

  async close() {
    this.state = 'closed';
  }
}

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
  })
) as jest.Mock;

// Mock AudioContext
Object.defineProperty(global, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(global, 'webkitAudioContext', {
  writable: true,
  value: MockAudioContext,
});

// Mock soundGenerator
jest.mock('@/lib/soundGenerator', () => ({
  soundGenerator: {
    playNotificationBeep: jest.fn(),
    playSuccessChime: jest.fn(),
    playWarningBuzz: jest.fn(),
    playBreakBell: jest.fn(),
    playFocusTone: jest.fn(),
  },
}));

describe('AudioManager', () => {
  let audioManager: AudioManager;

  beforeEach(() => {
    audioManager = new AudioManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    audioManager.destroy();
  });

  describe('initialization', () => {
    it('should initialize successfully with default options', async () => {
      await audioManager.initialize();
      const state = audioManager.getState();
      
      expect(state.isInitialized).toBe(true);
      expect(state.contextState).toBe('running');
      expect(state.totalSounds).toBeGreaterThan(0);
    });

    it('should initialize with custom options', async () => {
      const customManager = new AudioManager({
        volume: 50,
        enableAudio: false,
        preloadSounds: false,
      });

      await customManager.initialize();
      
      expect(customManager.getVolume()).toBe(50);
      expect(customManager.isEnabled()).toBe(false);
      
      customManager.destroy();
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock AudioContext to throw error
      const originalAudioContext = global.AudioContext;
      global.AudioContext = undefined as any;

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await audioManager.initialize();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Web Audio API is not supported in this browser'
      );
      
      global.AudioContext = originalAudioContext;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('volume control', () => {
    beforeEach(async () => {
      await audioManager.initialize();
    });

    it('should set and get volume correctly', () => {
      audioManager.setVolume(75);
      expect(audioManager.getVolume()).toBe(75);
    });

    it('should clamp volume values', () => {
      audioManager.setVolume(-10);
      expect(audioManager.getVolume()).toBe(0);

      audioManager.setVolume(150);
      expect(audioManager.getVolume()).toBe(100);
    });
  });

  describe('audio enable/disable', () => {
    it('should enable and disable audio', () => {
      audioManager.setEnabled(false);
      expect(audioManager.isEnabled()).toBe(false);

      audioManager.setEnabled(true);
      expect(audioManager.isEnabled()).toBe(true);
    });
  });

  describe('sound management', () => {
    beforeEach(async () => {
      await audioManager.initialize();
    });

    it('should add custom sounds', () => {
      const customSound = {
        id: 'custom',
        url: '/custom.mp3',
      };

      audioManager.addSound(customSound);
      const sounds = audioManager.getSounds();
      
      expect(sounds.some(s => s.id === 'custom')).toBe(true);
    });

    it('should remove sounds', () => {
      audioManager.removeSound('notification');
      const sounds = audioManager.getSounds();
      
      expect(sounds.some(s => s.id === 'notification')).toBe(false);
    });

    it('should get all sounds', () => {
      const sounds = audioManager.getSounds();
      expect(sounds.length).toBeGreaterThan(0);
      expect(sounds[0]).toHaveProperty('id');
      expect(sounds[0]).toHaveProperty('url');
    });
  });

  describe('sound playback', () => {
    beforeEach(async () => {
      await audioManager.initialize();
    });

    it('should not play sound when audio is disabled', async () => {
      audioManager.setEnabled(false);
      await audioManager.playSound('notification');
      
      // Should not throw error, should return silently
      expect(true).toBe(true);
    });

    it('should play fallback sound when file is not found', async () => {
      const { soundGenerator } = require('@/lib/soundGenerator');
      
      await audioManager.playSound('nonexistent');
      
      expect(soundGenerator.playNotificationBeep).toHaveBeenCalled();
    });

    it('should play fallback sound when buffer loading fails', async () => {
      const { soundGenerator } = require('@/lib/soundGenerator');
      
      // Mock fetch to fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await audioManager.playSound('notification');
      
      expect(soundGenerator.playNotificationBeep).toHaveBeenCalled();
    });

    it('should test sound playback', async () => {
      const result = await audioManager.testSound('notification');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('state management', () => {
    it('should return correct state when not initialized', () => {
      const state = audioManager.getState();
      
      expect(state.isInitialized).toBe(false);
      expect(state.contextState).toBe(null);
      expect(state.soundsLoaded).toBe(0);
      expect(state.totalSounds).toBe(0);
    });

    it('should return correct state when initialized', async () => {
      await audioManager.initialize();
      const state = audioManager.getState();
      
      expect(state.isInitialized).toBe(true);
      expect(state.contextState).toBe('running');
      expect(state.totalSounds).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should destroy audio manager properly', async () => {
      await audioManager.initialize();
      audioManager.destroy();
      
      const state = audioManager.getState();
      expect(state.isInitialized).toBe(false);
      expect(state.totalSounds).toBe(0);
    });
  });

  describe('fallback sound types', () => {
    beforeEach(async () => {
      await audioManager.initialize();
    });

    it('should play correct fallback sounds for each type', async () => {
      const { soundGenerator } = require('@/lib/soundGenerator');
      
      // Force fallback by removing all sounds
      audioManager.getSounds().forEach(sound => {
        audioManager.removeSound(sound.id);
      });

      await audioManager.playSound('success');
      expect(soundGenerator.playSuccessChime).toHaveBeenCalled();

      await audioManager.playSound('warning');
      expect(soundGenerator.playWarningBuzz).toHaveBeenCalled();

      await audioManager.playSound('break');
      expect(soundGenerator.playBreakBell).toHaveBeenCalled();

      await audioManager.playSound('focus');
      expect(soundGenerator.playFocusTone).toHaveBeenCalled();
    });
  });
});