import { useEffect, useState, useCallback } from 'react';
import { audioManager, SoundType } from '@/lib/audioManager';

interface AudioSettings {
  volume: number;
  enabled: boolean;
  isInitialized: boolean;
  isSupported: boolean;
}

export function useAudio() {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 70,
    enabled: true,
    isInitialized: false,
    isSupported: false,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize audio manager
  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioManager.initialize();
        const state = audioManager.getState();
        
        setSettings(prev => ({
          ...prev,
          isInitialized: state.isInitialized,
          isSupported: state.contextState !== null,
          volume: audioManager.getVolume(),
          enabled: audioManager.isEnabled(),
        }));
      } catch (error) {
        console.error('Failed to initialize audio:', error);
        setSettings(prev => ({
          ...prev,
          isSupported: false,
        }));
      }
    };

    initAudio();
  }, []);

  // Play sound with loading state
  const playSound = useCallback(async (
    soundType: SoundType | string,
    options?: { volume?: number; loop?: boolean }
  ) => {
    if (!settings.isSupported || !settings.enabled) {
      return;
    }

    try {
      setIsPlaying(true);
      await audioManager.playSound(soundType, options);
    } catch (error) {
      console.error(`Failed to play sound ${soundType}:`, error);
    } finally {
      // Reset playing state after a short delay
      setTimeout(() => setIsPlaying(false), 100);
    }
  }, [settings.isSupported, settings.enabled]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    audioManager.setVolume(volume);
    setSettings(prev => ({ ...prev, volume }));
  }, []);

  // Toggle audio enabled/disabled
  const setEnabled = useCallback((enabled: boolean) => {
    audioManager.setEnabled(enabled);
    setSettings(prev => ({ ...prev, enabled }));
  }, []);

  // Test sound playback
  const testSound = useCallback(async (soundType: SoundType | string): Promise<boolean> => {
    if (!settings.isSupported) return false;
    
    try {
      setIsPlaying(true);
      const result = await audioManager.testSound(soundType);
      return result;
    } catch (error) {
      console.error(`Failed to test sound ${soundType}:`, error);
      return false;
    } finally {
      setTimeout(() => setIsPlaying(false), 100);
    }
  }, [settings.isSupported]);

  // Get audio manager state for debugging
  const getState = useCallback(() => {
    return audioManager.getState();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy the singleton instance on unmount
      // as it may be used by other components
    };
  }, []);

  return {
    // State
    settings,
    isPlaying,

    // Actions
    playSound,
    setVolume,
    setEnabled,
    testSound,

    // Utilities
    getState,

    // Convenience methods
    playNotification: () => playSound('notification'),
    playSuccess: () => playSound('success'),
    playWarning: () => playSound('warning'),
    playBreak: () => playSound('break'),
    playFocus: () => playSound('focus'),
  };
}