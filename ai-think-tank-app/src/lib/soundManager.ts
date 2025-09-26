interface SoundConfig {
  url: string;
  cooldown?: number;
  requiresBlur?: boolean;
  requiresFocus?: boolean;
  volume?: number;
}

interface PlaybackState {
  lastPlayed: Map<string, number>;
  enabled: boolean;
  globalVolume: number;
}

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private config: Map<string, SoundConfig> = new Map();
  private state: PlaybackState = {
    lastPlayed: new Map(),
    enabled: true,
    globalVolume: 0.5
  };

  constructor() {
    this.config.set('message-send', {
      url: '/sounds/message-send.mp3',
      cooldown: 100,
      volume: 0.3
    });

    this.config.set('message-receive', {
      url: '/sounds/message-receive.mp3',
      cooldown: 2000,
      requiresBlur: true,
      volume: 0.4
    });

    this.config.set('mention', {
      url: '/sounds/mention.mp3',
      cooldown: 1000,
      volume: 0.6
    });

    this.config.set('reaction', {
      url: '/sounds/reaction.mp3',
      cooldown: 200,
      volume: 0.2
    });

    this.config.set('user-join', {
      url: '/sounds/user-join.mp3',
      cooldown: 500,
      volume: 0.3
    });

    this.config.set('user-leave', {
      url: '/sounds/user-leave.mp3',
      cooldown: 500,
      volume: 0.3
    });

    this.loadSettings();
    this.preloadSounds();
  }

  private loadSettings() {
    const saved = localStorage.getItem('soundSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.state.enabled = settings.enabled ?? true;
        this.state.globalVolume = settings.globalVolume ?? 0.5;
      } catch (e) {
        console.error('Failed to load sound settings:', e);
      }
    }
  }

  private saveSettings() {
    localStorage.setItem('soundSettings', JSON.stringify({
      enabled: this.state.enabled,
      globalVolume: this.state.globalVolume
    }));
  }

  private preloadSounds() {
    for (const [name, config] of this.config.entries()) {
      const audio = new Audio(config.url);
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    }
  }

  private isWindowFocused(): boolean {
    return document.hasFocus();
  }

  private checkCooldown(soundName: string, cooldown: number): boolean {
    const lastPlayed = this.state.lastPlayed.get(soundName) || 0;
    const now = Date.now();

    if (now - lastPlayed < cooldown) {
      return false;
    }

    this.state.lastPlayed.set(soundName, now);
    return true;
  }

  play(soundName: string, options?: { force?: boolean }) {
    if (!this.state.enabled && !options?.force) {
      return;
    }

    const config = this.config.get(soundName);
    if (!config) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    const isFocused = this.isWindowFocused();

    if (config.requiresBlur && isFocused && !options?.force) {
      return;
    }

    if (config.requiresFocus && !isFocused && !options?.force) {
      return;
    }

    const cooldown = config.cooldown || 0;
    if (!this.checkCooldown(soundName, cooldown)) {
      return;
    }

    const audio = this.sounds.get(soundName);
    if (!audio) {
      return;
    }

    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = (config.volume || 1) * this.state.globalVolume;

    clone.play().catch(e => {
      if (e.name !== 'NotAllowedError') {
        console.error(`Failed to play sound '${soundName}':`, e);
      }
    });
  }

  playMessageSend() {
    this.play('message-send');
  }

  playMessageReceive() {
    this.play('message-receive');
  }

  playMention() {
    this.play('mention');
  }

  playReaction() {
    this.play('reaction');
  }

  playUserJoin() {
    this.play('user-join');
  }

  playUserLeave() {
    this.play('user-leave');
  }

  setEnabled(enabled: boolean) {
    this.state.enabled = enabled;
    this.saveSettings();
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }

  setVolume(volume: number) {
    this.state.globalVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  getVolume(): number {
    return this.state.globalVolume;
  }

  testSound(soundName: string) {
    this.play(soundName, { force: true });
  }
}

export const soundManager = new SoundManager();