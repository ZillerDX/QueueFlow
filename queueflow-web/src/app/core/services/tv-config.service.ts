import { Injectable, signal, inject } from '@angular/core';
import { TranslationService } from './translation.service';

export type TvLayoutMode = 'bento' | 'focused' | 'split' | 'ticker';
export type TvVoiceMode = 'th' | 'en' | 'both';
export type TvLangMode = 'th' | 'en';

export interface TvDisplayConfig {
  layout: TvLayoutMode;
  lang: TvLangMode;
  voiceMode: TvVoiceMode;
}

const STORAGE_KEY = 'queueflow-tv-config';

@Injectable({
  providedIn: 'root'
})
export class TvConfigService {
  private i18n = inject(TranslationService);
  private audioCtx: AudioContext | null = null;

  public isModalOpen = signal<boolean>(false);
  public isTestingVoice = signal<boolean>(false);

  public config = signal<TvDisplayConfig>({
    layout: 'bento',
    lang: 'th',
    voiceMode: 'both'
  });

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config.set({
          layout: parsed.layout || 'bento',
          lang: parsed.lang || 'th',
          voiceMode: parsed.voiceMode || 'both'
        });
      } else {
        // Default: match current language or th
        this.config.set({
          layout: 'bento',
          lang: this.i18n.currentLang() === 'en' ? 'en' : 'th',
          voiceMode: 'both'
        });
      }
    } catch {
      // Fallback
    }
  }

  public saveConfig(partial: Partial<TvDisplayConfig>): void {
    const updated = { ...this.config(), ...partial };
    this.config.set(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage guard
    }
  }

  public openModal(): void {
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
  }

  public getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playBankChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const playTone = (freq: number, start: number, dur: number, gainVal: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };

      // Bank triple chime chord: D5 (587.33Hz) -> A5 (880Hz) -> D6 (1174.66Hz)
      playTone(587.33, now, 0.45, 0.35);
      playTone(880.00, now + 0.20, 0.75, 0.38);
      playTone(1174.66, now + 0.40, 1.10, 0.32);
    } catch (e) {
      console.warn('Bank chime error:', e);
    }
  }

  public testVoiceAnnouncement(sampleTicket = 'A-01', sampleCounter = 1): void {
    if (this.isTestingVoice()) return;
    this.isTestingVoice.set(true);

    this.playBankChime();

    setTimeout(() => {
      this.speakAnnouncement(sampleTicket, sampleCounter, this.config().voiceMode, () => {
        this.isTestingVoice.set(false);
      });
    }, 850);
  }

  public speakAnnouncement(
    ticketNumber: string,
    counterNumber: number | string,
    voiceMode: TvVoiceMode,
    onComplete: () => void
  ): void {
    if (!('speechSynthesis' in window)) {
      onComplete();
      return;
    }

    window.speechSynthesis.cancel();

    const thaiPhonetic = this.toThaiSpokenTicket(ticketNumber);
    const thaiMessage = `ขอเชิญหมายเลข${thaiPhonetic} ที่ช่องบริการ${counterNumber}ครับ`;
    const englishMessage = `Calling ticket ${ticketNumber.replace(/[-_]/g, ' ')}, to counter ${counterNumber}`;

    const voices = window.speechSynthesis.getVoices();

    const createThaiUtterance = () => {
      const u = new SpeechSynthesisUtterance(thaiMessage);
      u.lang = 'th-TH';
      u.rate = 0.92;
      u.pitch = 1.0;
      const thVoice = voices.find(v => v.lang.includes('th') && (v.name.includes('Male') || v.name.includes('Niwat') || v.name.includes('Thai')));
      if (thVoice) u.voice = thVoice;
      return u;
    };

    const createEnglishUtterance = () => {
      const u = new SpeechSynthesisUtterance(englishMessage);
      u.lang = 'en-US';
      u.rate = 0.95;
      u.pitch = 1.0;
      const enVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('US')));
      if (enVoice) u.voice = enVoice;
      return u;
    };

    if (voiceMode === 'th') {
      const u = createThaiUtterance();
      u.onend = () => onComplete();
      u.onerror = () => onComplete();
      window.speechSynthesis.speak(u);
    } else if (voiceMode === 'en') {
      const u = createEnglishUtterance();
      u.onend = () => onComplete();
      u.onerror = () => onComplete();
      window.speechSynthesis.speak(u);
    } else {
      // Both: TH first, then EN
      const uTh = createThaiUtterance();
      const uEn = createEnglishUtterance();

      uTh.onend = () => {
        setTimeout(() => {
          uEn.onend = () => onComplete();
          uEn.onerror = () => onComplete();
          window.speechSynthesis.speak(uEn);
        }, 300);
      };
      uTh.onerror = () => {
        uEn.onend = () => onComplete();
        uEn.onerror = () => onComplete();
        window.speechSynthesis.speak(uEn);
      };

      window.speechSynthesis.speak(uTh);
    }
  }

  private toThaiSpokenTicket(raw: string): string {
    if (!raw) return '';
    const digitMap: Record<string, string> = {
      '0': 'ศูนย์', '1': 'หนึ่ง', '2': 'สอง', '3': 'สาม', '4': 'สี่',
      '5': 'ห้า', '6': 'หก', '7': 'เจ็ด', '8': 'แปด', '9': 'เก้า'
    };
    const letterMap: Record<string, string> = {
      'A': 'เอ', 'B': 'บี', 'C': 'ซี', 'D': 'ดี', 'E': 'อี',
      'F': 'เอฟ', 'G': 'จี', 'H': 'เอช', 'I': 'ไอ', 'J': 'เจ',
      'K': 'เค', 'L': 'แอล', 'M': 'เอ็ม', 'N': 'เอ็น', 'O': 'โอ',
      'P': 'พี', 'Q': 'คิว', 'R': 'อาร์', 'S': 'เอส', 'T': 'ที',
      'U': 'ยู', 'V': 'วี', 'W': 'ดับเบิลยู', 'X': 'เอ็กซ์', 'Y': 'วาย', 'Z': 'แซด'
    };

    let result = '';
    for (const char of raw.toUpperCase()) {
      if (char === '-' || char === '_' || char === ' ') {
        result += ' ';
      } else if (letterMap[char]) {
        result += ' ' + letterMap[char];
      } else if (digitMap[char]) {
        result += ' ' + digitMap[char];
      } else {
        result += ' ' + char;
      }
    }
    return result;
  }
}
