import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundAlertService {
  private audioCtx: AudioContext | null = null;
  public isAudioUnlocked = signal<boolean>(false);

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public unlockAudio(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'running') {
        this.isAudioUnlocked.set(true);
      } else {
        ctx.resume().then(() => {
          this.isAudioUnlocked.set(true);
        });
      }
    } catch (e) {
      console.warn('AudioContext unlock failed:', e);
    }
  }

  public playQueueCalledAlert(ticketNumber?: string, counterNumber?: number | string, lang: 'en' | 'th' = 'th'): void {
    this.unlockAudio();
    const ctx = this.getAudioContext();

    // Vibrate mobile device if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch {
        // Ignore vibration errors if not allowed
      }
    }

    // Professional Three-Tone Chime (D5 -> A5 -> D6) with smooth exponential decay
    const now = ctx.currentTime;

    const playTone = (freq: number, startTime: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Bank / Airport Chime Chord
    playTone(587.33, now, 0.45, 0.35);        // D5
    playTone(880.00, now + 0.22, 0.75, 0.4);  // A5
    playTone(1174.66, now + 0.44, 1.1, 0.35); // D6

    // Speech voice announcement after the chime (0.95s delay)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && ticketNumber && counterNumber) {
      setTimeout(() => {
        try {
          window.speechSynthesis.cancel(); // Clear any previous speech

          let text: string;
          if (lang === 'th') {
            const spokenTicket = this.toThaiSpokenTicket(ticketNumber);
            text = `ขอเชิญหมายเลข ${spokenTicket} ที่ช่องบริการ ${counterNumber}ครับ`;
          } else {
            const spokenTicket = ticketNumber.replace(/[-_]/g, ' ');
            text = `Ticket number ${spokenTicket}, please proceed to counter ${counterNumber}`;
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang === 'th' ? 'th-TH' : 'en-US';
          utterance.rate = 0.92;
          utterance.pitch = 1.0;

          // Select matching voice if available
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            const matchedVoice = voices.find(v => 
              lang === 'th' ? v.lang.toLowerCase().includes('th') : v.lang.toLowerCase().includes('en')
            );
            if (matchedVoice) {
              utterance.voice = matchedVoice;
            }
          }

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('Speech synthesis alert error:', err);
        }
      }, 950);
    }
  }

  private toThaiSpokenTicket(raw: string): string {
    if (!raw) return '';
    const digitMap: Record<string, string> = {
      '0': 'ศูนย์ ', '1': 'หนึ่ง ', '2': 'สอง ', '3': 'สาม ', '4': 'สี่ ',
      '5': 'ห้า ', '6': 'หก ', '7': 'เจ็ด ', '8': 'แปด ', '9': 'เก้า '
    };
    const letterMap: Record<string, string> = {
      'A': 'เอ ', 'B': 'บี ', 'C': 'ซี ', 'D': 'ดี ', 'E': 'อี ',
      'F': 'เอฟ ', 'G': 'จี ', 'H': 'เอช ', 'I': 'ไอ ', 'J': 'เจ ',
      'K': 'เค ', 'L': 'แอล ', 'M': 'เอ็ม ', 'N': 'เอ็น ', 'O': 'โอ ',
      'P': 'พี ', 'Q': 'คิว ', 'R': 'อาร์ ', 'S': 'เอส ', 'T': 'ที ',
      'U': 'ยู ', 'V': 'วี ', 'W': 'ดับเบิลยู ', 'X': 'เอ็กซ์ ', 'Y': 'วาย ', 'Z': 'แซด '
    };

    let result = '';
    for (const char of raw.toUpperCase()) {
      if (char === '-' || char === '_' || char === ' ') {
        result += ' ';
      } else if (letterMap[char]) {
        result += letterMap[char];
      } else if (digitMap[char]) {
        result += digitMap[char];
      } else {
        result += char + ' ';
      }
    }
    return result.trim().replace(/\s+/g, ' ');
  }
}
