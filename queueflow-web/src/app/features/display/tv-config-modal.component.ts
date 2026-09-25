import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TvConfigService, TvLayoutMode, TvVoiceMode, TvLangMode } from '../../core/services/tv-config.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-tv-config-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (tvConfig.isModalOpen()) {
      <div 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pt-20 sm:pt-24 pb-8 overflow-y-auto bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        (click)="tvConfig.closeModal()"
        (keydown.escape)="tvConfig.closeModal()"
        tabindex="0">
        
        <div 
          class="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[calc(100vh-7rem)] my-auto"
          (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="px-6 py-3.5 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                  {{ i18n.t().tvConfigTitle }}
                </h3>
                <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {{ i18n.t().tvConfigDesc }}
                </p>
              </div>
            </div>

            <!-- Close icon button -->
            <button 
              (click)="tvConfig.closeModal()"
              class="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
              title="Close">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Body (Optimized Compact Rhythm - Zero Overflow) -->
          <div class="px-6 py-3.5 space-y-3 overflow-y-auto">
            
            <!-- Section 1: 4 Distinct Layout Formats -->
            <div>
              <label class="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                1. {{ i18n.t().tvLayoutSelect }} (4 Modes)
              </label>

              <div class="grid grid-cols-2 gap-2.5">
                
                <!-- Layout 1: Grid Bento -->
                <div 
                  data-testid="layout-bento"
                  (click)="setLayout('bento')"
                  [ngClass]="tvConfig.config().layout === 'bento' 
                    ? 'border-2 border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs' 
                    : 'border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'"
                  class="p-2.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs" [ngClass]="tvConfig.config().layout === 'bento' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-zinc-100'">
                      {{ i18n.t().tvLayoutBento }}
                    </span>
                    <span 
                      [ngClass]="tvConfig.config().layout === 'bento' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'"
                      class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                  </div>
                  <!-- Bento Layout Wireframe Icon -->
                  <div class="h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 p-1 flex gap-1 items-center">
                    <div class="flex-1 h-full grid grid-cols-2 gap-0.5">
                      <div class="bg-blue-500/40 rounded-xs"></div>
                      <div class="bg-blue-500/40 rounded-xs"></div>
                      <div class="bg-blue-500/40 rounded-xs"></div>
                      <div class="bg-blue-500/40 rounded-xs"></div>
                    </div>
                    <div class="w-1/3 h-full bg-slate-300 dark:bg-zinc-700 rounded-xs flex flex-col gap-0.5 p-0.5">
                      <div class="h-1 bg-slate-400 dark:bg-zinc-600 rounded-2xs"></div>
                      <div class="h-1 bg-slate-400 dark:bg-zinc-600 rounded-2xs"></div>
                    </div>
                  </div>
                  <p class="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight line-clamp-1">
                    {{ i18n.t().tvLayoutBentoDesc }}
                  </p>
                </div>

                <!-- Layout 2: Focused Hero -->
                <div 
                  data-testid="layout-focused"
                  (click)="setLayout('focused')"
                  [ngClass]="tvConfig.config().layout === 'focused' 
                    ? 'border-2 border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs' 
                    : 'border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'"
                  class="p-2.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs" [ngClass]="tvConfig.config().layout === 'focused' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-zinc-100'">
                      {{ i18n.t().tvLayoutFocused }}
                    </span>
                    <span 
                      [ngClass]="tvConfig.config().layout === 'focused' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'"
                      class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                  </div>
                  <!-- Focused Hero Wireframe Icon -->
                  <div class="h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 p-1 flex flex-col gap-0.5 justify-between">
                    <div class="h-3.5 w-full bg-blue-500/40 rounded-xs flex items-center justify-center">
                      <div class="h-1.5 w-10 bg-blue-600 rounded-2xs"></div>
                    </div>
                    <div class="flex-1 grid grid-cols-4 gap-0.5">
                      <div class="bg-slate-300 dark:bg-zinc-700 rounded-2xs"></div>
                      <div class="bg-slate-300 dark:bg-zinc-700 rounded-2xs"></div>
                      <div class="bg-slate-300 dark:bg-zinc-700 rounded-2xs"></div>
                      <div class="bg-slate-300 dark:bg-zinc-700 rounded-2xs"></div>
                    </div>
                  </div>
                  <p class="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight line-clamp-1">
                    {{ i18n.t().tvLayoutFocusedDesc }}
                  </p>
                </div>

                <!-- Layout 3: Split Table -->
                <div 
                  data-testid="layout-split"
                  (click)="setLayout('split')"
                  [ngClass]="tvConfig.config().layout === 'split' 
                    ? 'border-2 border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs' 
                    : 'border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'"
                  class="p-2.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs" [ngClass]="tvConfig.config().layout === 'split' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-zinc-100'">
                      {{ i18n.t().tvLayoutSplit }}
                    </span>
                    <span 
                      [ngClass]="tvConfig.config().layout === 'split' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'"
                      class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                  </div>
                  <!-- Split Bank Table Wireframe Icon -->
                  <div class="h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 p-1 grid grid-cols-2 gap-1">
                    <div class="bg-blue-500/20 rounded-xs flex flex-col gap-0.5 p-0.5">
                      <div class="h-1 w-full bg-blue-600/60 rounded-2xs"></div>
                      <div class="h-1 w-full bg-blue-500/40 rounded-2xs"></div>
                    </div>
                    <div class="bg-slate-300/40 dark:bg-zinc-700/40 rounded-xs flex flex-col gap-0.5 p-0.5">
                      <div class="h-1 w-full bg-slate-500/60 dark:bg-zinc-500 rounded-2xs"></div>
                      <div class="h-1 w-full bg-slate-400/40 dark:bg-zinc-600 rounded-2xs"></div>
                    </div>
                  </div>
                  <p class="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight line-clamp-1">
                    {{ i18n.t().tvLayoutSplitDesc }}
                  </p>
                </div>

                <!-- Layout 4: Horizontal Grid (Renamed from Horizontal Ticker) -->
                <div 
                  data-testid="layout-ticker"
                  (click)="setLayout('ticker')"
                  [ngClass]="tvConfig.config().layout === 'ticker' 
                    ? 'border-2 border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs' 
                    : 'border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'"
                  class="p-2.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs" [ngClass]="tvConfig.config().layout === 'ticker' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-zinc-100'">
                      {{ i18n.t().tvLayoutTicker }}
                    </span>
                    <span 
                      [ngClass]="tvConfig.config().layout === 'ticker' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'"
                      class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                  </div>
                  <!-- Horizontal Grid Wireframe Icon (Top counters row, bottom queue cards) -->
                  <div class="h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 p-1 flex flex-col justify-between gap-0.5">
                    <div class="h-3 w-full grid grid-cols-4 gap-0.5">
                      <div class="bg-blue-500/50 rounded-xs"></div>
                      <div class="bg-blue-500/50 rounded-xs"></div>
                      <div class="bg-blue-500/50 rounded-xs"></div>
                      <div class="bg-blue-500/50 rounded-xs"></div>
                    </div>
                    <div class="h-3 w-full grid grid-cols-4 gap-0.5">
                      <div class="bg-slate-300 dark:bg-zinc-700 rounded-xs"></div>
                      <div class="bg-slate-300 dark:bg-zinc-700 rounded-xs"></div>
                      <div class="bg-slate-300 dark:bg-zinc-700 rounded-xs"></div>
                      <div class="bg-slate-300 dark:bg-zinc-700 rounded-xs"></div>
                    </div>
                  </div>
                  <p class="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight line-clamp-1">
                    {{ i18n.t().tvLayoutTickerDesc }}
                  </p>
                </div>

              </div>
            </div>

            <!-- Section 2: Display Language (Clean Segmented Control) -->
            <div>
              <label class="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                2. {{ i18n.t().tvLangSelect }}
              </label>
              <div class="p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-xl grid grid-cols-2 gap-1 border border-slate-200/60 dark:border-zinc-700/50">
                <button
                  type="button"
                  data-testid="lang-th"
                  (click)="setLang('th')"
                  [ngClass]="tvConfig.config().lang === 'th' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'"
                  class="py-1.5 rounded-lg text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer">
                  <span>ภาษาไทย (TH)</span>
                </button>
                <button
                  type="button"
                  data-testid="lang-en"
                  (click)="setLang('en')"
                  [ngClass]="tvConfig.config().lang === 'en' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'"
                  class="py-1.5 rounded-lg text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer">
                  <span>English (EN)</span>
                </button>
              </div>
            </div>

            <!-- Section 3: Audio Announcement Mode (Harmonized Segmented Control & Alert Bar) -->
            <div>
              <label class="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                3. {{ i18n.t().tvVoiceSelect }}
              </label>

              <!-- 3 Voice Options in Segmented Control -->
              <div class="p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-xl grid grid-cols-3 gap-1 border border-slate-200/60 dark:border-zinc-700/50 mb-2.5">
                <button
                  type="button"
                  data-testid="voice-th"
                  (click)="setVoiceMode('th')"
                  [ngClass]="tvConfig.config().voiceMode === 'th' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'"
                  class="py-1.5 rounded-lg text-xs text-center transition-all cursor-pointer">
                  {{ i18n.t().tvVoiceTh }}
                </button>
                <button
                  type="button"
                  data-testid="voice-en"
                  (click)="setVoiceMode('en')"
                  [ngClass]="tvConfig.config().voiceMode === 'en' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'"
                  class="py-1.5 rounded-lg text-xs text-center transition-all cursor-pointer">
                  {{ i18n.t().tvVoiceEn }}
                </button>
                <button
                  type="button"
                  data-testid="voice-both"
                  (click)="setVoiceMode('both')"
                  [ngClass]="tvConfig.config().voiceMode === 'both' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'"
                  class="py-1.5 rounded-lg text-xs text-center transition-all cursor-pointer">
                  {{ i18n.t().tvVoiceBoth }}
                </button>
              </div>

              <!-- Test Voice Box Harmonized with System Palette -->
              <div class="p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <div class="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      {{ i18n.t().tvBtnTestVoice }}
                    </div>
                    <div class="text-[10px] text-slate-500 dark:text-zinc-400">
                      {{ tvConfig.isTestingVoice() ? i18n.t().tvTestingAudio : i18n.t().tvTestAudioHint }}
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  data-testid="btn-test-audio"
                  (click)="testAudio()"
                  [disabled]="tvConfig.isTestingVoice()"
                  class="h-7 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer">
                  @if (tvConfig.isTestingVoice()) {
                    <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>{{ i18n.t().btnTesting }}</span>
                  } @else {
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    <span>{{ i18n.t().btnPlayTest }}</span>
                  }
                </button>
              </div>

            </div>

          </div>

          <!-- Modal Footer Actions -->
          <div class="px-6 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
            <button 
              type="button"
              (click)="tvConfig.closeModal()"
              class="h-9 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-all">
              {{ i18n.t().tvBtnBack }}
            </button>

            <button 
              type="button"
              (click)="launchTvBoard()"
              class="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center space-x-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>{{ i18n.t().tvBtnLaunch }}</span>
            </button>
          </div>

        </div>

      </div>
    }
  `
})
export class TvConfigModalComponent {
  public tvConfig = inject(TvConfigService);
  public i18n = inject(TranslationService);
  private router = inject(Router);

  setLayout(layout: TvLayoutMode) {
    this.tvConfig.saveConfig({ layout });
  }

  setLang(lang: TvLangMode) {
    this.tvConfig.saveConfig({ lang });
    this.i18n.setLanguage(lang);
  }

  setVoiceMode(voiceMode: TvVoiceMode) {
    this.tvConfig.saveConfig({ voiceMode });
  }

  testAudio() {
    this.tvConfig.testVoiceAnnouncement('A-01', 1);
  }

  launchTvBoard() {
    // Unlock audio context on user click
    this.tvConfig.getAudioContext();
    this.tvConfig.closeModal();
    this.router.navigate(['/display']);
  }
}
