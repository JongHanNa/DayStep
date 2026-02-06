// Sound generator utility for creating notification sounds programmatically
// This can be used to generate basic tones when audio files are not available

export interface ToneConfig {
  frequency: number;
  duration: number; // in seconds
  volume?: number; // 0-1
  type?: OscillatorType;
}

export class SoundGenerator {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      // @ts-ignore
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Generate and play a simple tone
   */
  async playTone(config: ToneConfig): Promise<void> {
    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const {
      frequency,
      duration,
      volume = 0.3,
      type = 'sine'
    } = config;

    // Create oscillator and gain nodes
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Configure oscillator
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Configure gain (volume) with fade in/out
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Play sound
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);

    // Clean up
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  }

  /**
   * Generate a notification beep (high frequency, short duration)
   */
  async playNotificationBeep(): Promise<void> {
    await this.playTone({
      frequency: 800,
      duration: 0.2,
      volume: 0.3,
      type: 'sine'
    });
  }

  /**
   * Generate a success sound (ascending notes)
   */
  async playSuccessChime(): Promise<void> {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    for (let i = 0; i < notes.length; i++) {
      setTimeout(() => {
        this.playTone({
          frequency: notes[i],
          duration: 0.3,
          volume: 0.2,
          type: 'sine'
        });
      }, i * 100);
    }
  }

  /**
   * Generate a warning sound (low frequency, longer duration)
   */
  async playWarningBuzz(): Promise<void> {
    await this.playTone({
      frequency: 220,
      duration: 0.5,
      volume: 0.4,
      type: 'square'
    });
  }

  /**
   * Generate a gentle break sound (soft bell-like)
   */
  async playBreakBell(): Promise<void> {
    await this.playTone({
      frequency: 440,
      duration: 1.0,
      volume: 0.2,
      type: 'triangle'
    });
  }

  /**
   * Generate a focus sound (steady, calming tone)
   */
  async playFocusTone(): Promise<void> {
    await this.playTone({
      frequency: 369.99, // F#4
      duration: 0.8,
      volume: 0.25,
      type: 'sine'
    });
  }

  /**
   * Generate an audio buffer for a tone (can be used with AudioManager)
   */
  generateToneBuffer(config: ToneConfig): AudioBuffer | null {
    if (!this.audioContext) return null;

    const {
      frequency,
      duration,
      volume = 0.3,
      type = 'sine'
    } = config;

    const sampleRate = this.audioContext.sampleRate;
    const numberOfSamples = Math.floor(sampleRate * duration);
    const audioBuffer = this.audioContext.createBuffer(1, numberOfSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Generate waveform data
    for (let i = 0; i < numberOfSamples; i++) {
      const time = i / sampleRate;
      const angle = frequency * 2 * Math.PI * time;
      
      let sample = 0;
      switch (type) {
        case 'sine':
          sample = Math.sin(angle);
          break;
        case 'square':
          sample = Math.sin(angle) > 0 ? 1 : -1;
          break;
        case 'triangle':
          sample = (2 / Math.PI) * Math.asin(Math.sin(angle));
          break;
        case 'sawtooth':
          sample = (2 / Math.PI) * (angle % (2 * Math.PI) - Math.PI);
          break;
        default:
          sample = Math.sin(angle);
      }

      // Apply volume and envelope (fade in/out)
      const fadeInTime = 0.01;
      const fadeOutTime = 0.1;
      const totalTime = duration;
      
      let envelope = 1;
      if (time < fadeInTime) {
        envelope = time / fadeInTime;
      } else if (time > totalTime - fadeOutTime) {
        envelope = (totalTime - time) / fadeOutTime;
      }

      channelData[i] = sample * volume * envelope;
    }

    return audioBuffer;
  }
}

// Export singleton instance
export const soundGenerator = new SoundGenerator();