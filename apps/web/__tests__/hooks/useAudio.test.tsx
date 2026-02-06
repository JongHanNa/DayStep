import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudio } from '@/hooks/useAudio';

// Mock audioManager
const mockAudioManager = {
  initialize: jest.fn(),
  getState: jest.fn(),
  getVolume: jest.fn(),
  isEnabled: jest.fn(),
  setVolume: jest.fn(),
  setEnabled: jest.fn(),
  playSound: jest.fn(),
  testSound: jest.fn(),
};

jest.mock('@/lib/audioManager', () => ({
  audioManager: mockAudioManager,
}));

describe('useAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockAudioManager.getState.mockReturnValue({
      isInitialized: true,
      contextState: 'running',
      soundsLoaded: 5,
      totalSounds: 5,
    });
    mockAudioManager.getVolume.mockReturnValue(70);
    mockAudioManager.isEnabled.mockReturnValue(true);
    mockAudioManager.playSound.mockResolvedValue(undefined);
    mockAudioManager.testSound.mockResolvedValue(true);
  });

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useAudio());

    expect(result.current.settings).toEqual({
      volume: 70,
      enabled: true,
      isInitialized: false,
      isSupported: false,
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it('should initialize audio manager on mount', async () => {
    renderHook(() => useAudio());

    await waitFor(() => {
      expect(mockAudioManager.initialize).toHaveBeenCalled();
    });
  });

  it('should update settings after initialization', async () => {
    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isInitialized).toBe(true);
      expect(result.current.settings.isSupported).toBe(true);
      expect(result.current.settings.volume).toBe(70);
      expect(result.current.settings.enabled).toBe(true);
    });
  });

  it('should handle initialization failure', async () => {
    mockAudioManager.initialize.mockRejectedValue(new Error('Init failed'));
    mockAudioManager.getState.mockReturnValue({
      isInitialized: false,
      contextState: null,
      soundsLoaded: 0,
      totalSounds: 0,
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize audio:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should play sound successfully', async () => {
    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(true);
    });

    await act(async () => {
      await result.current.playSound('notification');
    });

    expect(mockAudioManager.playSound).toHaveBeenCalledWith('notification', undefined);
  });

  it('should not play sound when not supported', async () => {
    mockAudioManager.getState.mockReturnValue({
      isInitialized: false,
      contextState: null,
      soundsLoaded: 0,
      totalSounds: 0,
    });

    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(false);
    });

    await act(async () => {
      await result.current.playSound('notification');
    });

    expect(mockAudioManager.playSound).not.toHaveBeenCalled();
  });

  it('should not play sound when disabled', async () => {
    mockAudioManager.isEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.enabled).toBe(false);
    });

    await act(async () => {
      await result.current.playSound('notification');
    });

    expect(mockAudioManager.playSound).not.toHaveBeenCalled();
  });

  it('should handle sound play errors gracefully', async () => {
    mockAudioManager.playSound.mockRejectedValue(new Error('Play failed'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(true);
    });

    await act(async () => {
      await result.current.playSound('notification');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to play sound notification:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should set volume correctly', async () => {
    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.setVolume(50);
    });

    expect(mockAudioManager.setVolume).toHaveBeenCalledWith(50);
  });

  it('should set enabled state correctly', async () => {
    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.setEnabled(false);
    });

    expect(mockAudioManager.setEnabled).toHaveBeenCalledWith(false);
  });

  it('should test sound successfully', async () => {
    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(true);
    });

    let testResult: boolean | undefined;

    await act(async () => {
      testResult = await result.current.testSound('notification');
    });

    expect(testResult).toBe(true);
    expect(mockAudioManager.testSound).toHaveBeenCalledWith('notification');
  });

  it('should return false when testing unsupported sound', async () => {
    mockAudioManager.getState.mockReturnValue({
      isInitialized: false,
      contextState: null,
      soundsLoaded: 0,
      totalSounds: 0,
    });

    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(false);
    });

    let testResult: boolean | undefined;

    await act(async () => {
      testResult = await result.current.testSound('notification');
    });

    expect(testResult).toBe(false);
  });

  it('should handle test sound errors gracefully', async () => {
    mockAudioManager.testSound.mockRejectedValue(new Error('Test failed'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(true);
    });

    let testResult: boolean | undefined;

    await act(async () => {
      testResult = await result.current.testSound('notification');
    });

    expect(testResult).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to test sound notification:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should provide convenience methods', async () => {
    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(true);
    });

    await act(async () => {
      await result.current.playNotification();
      await result.current.playSuccess();
      await result.current.playWarning();
      await result.current.playBreak();
      await result.current.playFocus();
    });

    expect(mockAudioManager.playSound).toHaveBeenCalledWith('notification', undefined);
    expect(mockAudioManager.playSound).toHaveBeenCalledWith('success', undefined);
    expect(mockAudioManager.playSound).toHaveBeenCalledWith('warning', undefined);
    expect(mockAudioManager.playSound).toHaveBeenCalledWith('break', undefined);
    expect(mockAudioManager.playSound).toHaveBeenCalledWith('focus', undefined);
  });

  it('should return state from audio manager', () => {
    const { result } = renderHook(() => useAudio());

    const state = result.current.getState();

    expect(mockAudioManager.getState).toHaveBeenCalled();
    expect(state).toEqual({
      isInitialized: true,
      contextState: 'running',
      soundsLoaded: 5,
      totalSounds: 5,
    });
  });

  it('should manage isPlaying state correctly', async () => {
    const { result } = renderHook(() => useAudio());

    await waitFor(() => {
      expect(result.current.settings.isSupported).toBe(true);
    });

    // Initially not playing
    expect(result.current.isPlaying).toBe(false);

    // Should set playing state during sound play
    await act(async () => {
      const playPromise = result.current.playSound('notification');
      // Check if playing is set to true during the call
      expect(result.current.isPlaying).toBe(true);
      await playPromise;
    });

    // Should reset after timeout
    await waitFor(() => {
      expect(result.current.isPlaying).toBe(false);
    }, { timeout: 200 });
  });
});