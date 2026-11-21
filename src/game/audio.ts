/**
 * Cozy 16-bit Web Audio API sound effects & music-box synthesizer.
 * Zero external audio dependencies; unlocks cleanly on first user interaction.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicTimer: number | null = null;
  private musicMode: 'none' | 'cozy' | 'balcony' = 'none';
  private stepIndex = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(value: boolean): void {
    this.muted = value;
    if (value) {
      this.stopMusicLoop();
    } else if (this.musicMode !== 'none') {
      this.startMusicLoop(this.musicMode);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  private playTone(
    freq: number,
    duration: number,
    options: {
      type?: OscillatorType;
      volume?: number;
      delay?: number;
      slideTo?: number;
      attack?: number;
    } = {}
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const {
      type = 'triangle',
      volume = 0.08,
      delay = 0,
      slideTo,
      attack = 0.01,
    } = options;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playFootstep(onStone = false): void {
    const base = onStone ? 165 : 120;
    const jitter = (Math.random() - 0.5) * 18;
    this.playTone(base + jitter, 0.055, {
      type: 'triangle',
      volume: 0.028,
      slideTo: base * 0.65,
      attack: 0.005,
    });
  }

  public playTextBlip(pitch: 'her' | 'him' | 'narrator' = 'narrator'): void {
    const base = pitch === 'her' ? 540 : pitch === 'him' ? 320 : 420;
    const jitter = (Math.random() - 0.5) * 35;
    this.playTone(base + jitter, 0.04, {
      type: 'sine',
      volume: 0.032,
      attack: 0.004,
    });
  }

  public playInteract(): void {
    this.playTone(523.25, 0.09, { type: 'triangle', volume: 0.065 });
    this.playTone(659.25, 0.12, { type: 'triangle', volume: 0.055, delay: 0.05 });
  }

  public playKeyFound(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, 0.24, {
        type: 'triangle',
        volume: 0.08,
        delay: i * 0.075,
        attack: 0.01,
      });
    });
  }

  public playLocked(): void {
    this.playTone(170, 0.08, { type: 'square', volume: 0.04 });
    this.playTone(140, 0.12, { type: 'square', volume: 0.035, delay: 0.08 });
  }

  public playChestOpen(): void {
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((n, i) => {
      this.playTone(n, 0.28, {
        type: 'sine',
        volume: 0.075,
        delay: i * 0.07,
      });
    });
  }

  public playKeypadDigit(digit: number): void {
    const freq = 440 + digit * 36;
    this.playTone(freq, 0.075, { type: 'sine', volume: 0.055 });
  }

  public playKeypadError(): void {
    this.playTone(220, 0.12, { type: 'sawtooth', volume: 0.045 });
    this.playTone(175, 0.2, { type: 'sawtooth', volume: 0.04, delay: 0.11 });
  }

  public playDoorUnlock(): void {
    // Magical celebratory twilight chime
    const chord = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    chord.forEach((freq, i) => {
      this.playTone(freq, 0.45, {
        type: 'sine',
        volume: 0.075,
        delay: i * 0.08,
        attack: 0.015,
      });
    });
  }

  public playHeartFloat(): void {
    this.playTone(880, 0.22, { type: 'sine', volume: 0.03, slideTo: 1046.5 });
  }

  public playPetBunny(): void {
    // Cheerful two-hop pastel bell chime
    this.playTone(659.25, 0.14, { type: 'sine', volume: 0.06, slideTo: 783.99 });
    this.playTone(880.0, 0.18, {
      type: 'triangle',
      volume: 0.06,
      delay: 0.075,
      slideTo: 1046.5,
    });
    this.playTone(1174.66, 0.22, {
      type: 'sine',
      volume: 0.045,
      delay: 0.16,
    });
  }

  public playPetCat(): void {
    // Cozy vibrating cat purr + gentle warm twilight chime
    const ctx = this.ensureContext();
    if (ctx) {
      const now = ctx.currentTime;
      const carrier = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const master = ctx.createGain();

      carrier.type = 'triangle';
      carrier.frequency.setValueAtTime(92, now);
      carrier.frequency.linearRampToValueAtTime(76, now + 0.52);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(24, now);
      lfoGain.gain.setValueAtTime(0.038, now);

      master.gain.setValueAtTime(0.001, now);
      master.gain.linearRampToValueAtTime(0.06, now + 0.08);
      master.gain.linearRampToValueAtTime(0.045, now + 0.36);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);

      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);
      carrier.connect(master);
      master.connect(ctx.destination);

      carrier.start(now);
      lfo.start(now);
      carrier.stop(now + 0.58);
      lfo.stop(now + 0.58);
    }

    this.playTone(587.33, 0.18, { type: 'sine', volume: 0.04, delay: 0.06 });
    this.playTone(783.99, 0.24, { type: 'sine', volume: 0.04, delay: 0.16 });
  }

  public setMusicMode(mode: 'none' | 'cozy' | 'balcony'): void {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    this.stopMusicLoop();
    if (!this.muted && mode !== 'none') {
      this.startMusicLoop(mode);
    }
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private startMusicLoop(mode: 'cozy' | 'balcony'): void {
    this.stopMusicLoop();
    this.stepIndex = 0;

    // Gentle To-the-Moon / Stardew inspired music-box arpeggios
    const cozyNotes = [
      392.0, 493.88, 587.33, 493.88,
      329.63, 493.88, 587.33, 659.25,
      349.23, 440.0, 523.25, 659.25,
      293.66, 440.0, 523.25, 587.33,
    ];

    const balconyMelody = [
      523.25, 659.25, 783.99, 987.77,
      880.0, 783.99, 659.25, 587.33,
      523.25, 659.25, 880.0, 1046.5,
      987.77, 880.0, 783.99, 659.25,
    ];

    const balconyBass = [
      261.63, 0, 196.0, 0,
      220.0, 0, 174.61, 0,
      174.61, 0, 220.0, 0,
      196.0, 0, 246.94, 0,
    ];

    const intervalMs = mode === 'balcony' ? 520 : 620;

    const tick = () => {
      if (this.muted) return;
      const idx = this.stepIndex % 16;
      if (mode === 'cozy') {
        const note = cozyNotes[idx];
        this.playTone(note, 0.55, {
          type: 'sine',
          volume: 0.022,
          attack: 0.03,
        });
      } else {
        const mel = balconyMelody[idx];
        this.playTone(mel, 0.72, {
          type: 'sine',
          volume: 0.032,
          attack: 0.025,
        });
        const bass = balconyBass[idx];
        if (bass > 0) {
          this.playTone(bass, 0.85, {
            type: 'triangle',
            volume: 0.022,
            attack: 0.04,
          });
        }
      }
      this.stepIndex++;
    };

    tick();
    this.musicTimer = window.setInterval(tick, intervalMs);
  }
}

export const soundEngine = new SoundEngine();
