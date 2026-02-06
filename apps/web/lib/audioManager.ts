// Web Audio API based audio management system for Pomodoro notifications

import { soundGenerator } from './soundGenerator';

export interface AudioManagerOptions {
  volume?: number; // 0-100
  enableAudio?: boolean;
  preloadSounds?: boolean;
}

export interface SoundConfig {
  id: string;
  url: string;
  buffer?: AudioBuffer;
  volume?: number;
}

export type SoundType = 'notification' | 'success' | 'warning' | 'break' | 'focus';

class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private sounds: Map<string, SoundConfig> = new Map();
  private options: Required<AudioManagerOptions>;
  private isInitialized = false;

  // Default sound configurations
  private readonly defaultSounds: Record<SoundType, SoundConfig> = {
    notification: { id: 'notification', url: '/sounds/notification.mp3' },
    success: { id: 'success', url: '/sounds/success.mp3' },
    warning: { id: 'warning', url: '/sounds/warning.mp3' },
    break: { id: 'break', url: '/sounds/break.mp3' },
    focus: { id: 'focus', url: '/sounds/focus.mp3' },
  };

  constructor(options: AudioManagerOptions = {}) {
    this.options = {
      volume: options.volume ?? 70,
      enableAudio: options.enableAudio ?? true,
      preloadSounds: options.preloadSounds ?? true,
    };
  }

  /**
   * Initialize the Audio Context and preload sounds
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if Web Audio API is supported
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        console.warn('Web Audio API is not supported in this browser');
        return;
      }

      // Create Audio Context
      // @ts-ignore - webkitAudioContext for Safari compatibility
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain node for volume control
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.setVolume(this.options.volume);

      // Initialize default sounds
      Object.values(this.defaultSounds).forEach(sound => {
        this.sounds.set(sound.id, { ...sound });
      });

      // Preload sounds if enabled
      if (this.options.preloadSounds) {
        await this.preloadAllSounds();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
    }
  }

  /**
   * Preload all registered sounds
   */
  private async preloadAllSounds(): Promise<void> {
    const preloadPromises = Array.from(this.sounds.values()).map(sound => 
      this.preloadSound(sound.id)
    );

    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Some sounds failed to preload:', error);
    }
  }

  /**
   * Preload a specific sound
   */
  async preloadSound(soundId: string): Promise<void> {
    const sound = this.sounds.get(soundId);
    if (!sound || sound.buffer || !this.audioContext) return;

    try {
      const response = await fetch(sound.url);
      if (!response.ok) {
        console.warn(`Failed to fetch sound: ${sound.url}`);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      sound.buffer = audioBuffer;
      this.sounds.set(soundId, sound);
    } catch (error) {
      console.warn(`Failed to preload sound ${soundId}:`, error);
    }
  }

  /**
   * Play a sound by type or ID
   */
  async playSound(
    soundType: SoundType | string, 
    options: { volume?: number; loop?: boolean } = {}
  ): Promise<void> {
    if (!this.options.enableAudio || !this.audioContext || !this.masterGainNode) {
      return;
    }

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const sound = this.sounds.get(soundType);
    if (!sound) {
      console.warn(`Sound not found: ${soundType}`);
      // Try fallback generated sound
      await this.playFallbackSound(soundType as SoundType);
      return;
    }

    try {
      // Load buffer if not preloaded
      if (!sound.buffer) {
        await this.preloadSound(soundType);
      }

      if (!sound.buffer) {
        console.warn(`Failed to load sound buffer: ${soundType}, using fallback`);
        await this.playFallbackSound(soundType as SoundType);
        return;
      }

      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = sound.buffer;
      source.loop = options.loop ?? false;

      // Create gain node for individual sound volume
      const gainNode = this.audioContext.createGain();
      const volume = (options.volume ?? sound.volume ?? 100) / 100;
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

      // Connect nodes: source -> gain -> master gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.masterGainNode);

      // Play sound
      source.start(0);

      // Clean up source after playback
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };

    } catch (error) {
      console.error(`Failed to play sound ${soundType}:`, error);
      // Fallback to generated sound
      await this.playFallbackSound(soundType as SoundType);
    }
  }

  /**
   * Play fallback generated sound when audio files are not available
   */
  private async playFallbackSound(soundType: SoundType): Promise<void> {
    try {
      switch (soundType) {
        case 'notification':
          await soundGenerator.playNotificationBeep();
          break;
        case 'success':
          await soundGenerator.playSuccessChime();
          break;
        case 'warning':
          await soundGenerator.playWarningBuzz();
          break;
        case 'break':
          await soundGenerator.playBreakBell();
          break;
        case 'focus':
          await soundGenerator.playFocusTone();
          break;
        default:
          await soundGenerator.playNotificationBeep();
      }
    } catch (error) {
      console.error(`Failed to play fallback sound for ${soundType}:`, error);
    }
  }

  /**
   * Set master volume (0-100)
   */
  setVolume(volume: number): void {
    this.options.volume = Math.max(0, Math.min(100, volume));
    
    if (this.masterGainNode) {
      const gainValue = this.options.volume / 100;
      this.masterGainNode.gain.setValueAtTime(
        gainValue, 
        this.audioContext?.currentTime ?? 0
      );
    }
  }

  /**
   * Get current volume (0-100)
   */
  getVolume(): number {
    return this.options.volume;
  }

  /**
   * Enable or disable audio
   */
  setEnabled(enabled: boolean): void {
    this.options.enableAudio = enabled;
  }

  /**
   * Check if audio is enabled
   */
  isEnabled(): boolean {
    return this.options.enableAudio;
  }

  /**
   * Add custom sound
   */
  addSound(soundConfig: SoundConfig): void {
    this.sounds.set(soundConfig.id, soundConfig);
  }

  /**
   * Remove sound
   */
  removeSound(soundId: string): void {
    this.sounds.delete(soundId);
  }

  /**
   * Get all available sounds
   */
  getSounds(): SoundConfig[] {
    return Array.from(this.sounds.values());
  }

  /**
   * Test if a sound can be played
   */
  async testSound(soundType: SoundType | string): Promise<boolean> {
    try {
      await this.playSound(soundType, { volume: 30 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Destroy the audio manager and clean up resources
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.masterGainNode = null;
    this.sounds.clear();
    this.isInitialized = false;
  }

  /**
   * Get audio context state for debugging
   */
  getState(): {
    isInitialized: boolean;
    contextState: string | null;
    soundsLoaded: number;
    totalSounds: number;
  } {
    return {
      isInitialized: this.isInitialized,
      contextState: this.audioContext?.state ?? null,
      soundsLoaded: Array.from(this.sounds.values()).filter(s => s.buffer).length,
      totalSounds: this.sounds.size,
    };
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

// Export class for testing
export { AudioManager };

// Convenience functions
export const playNotificationSound = () => audioManager.playSound('notification');
export const playSuccessSound = () => audioManager.playSound('success');
export const playWarningSound = () => audioManager.playSound('warning');
export const playBreakSound = () => audioManager.playSound('break');
export const playFocusSound = () => audioManager.playSound('focus');