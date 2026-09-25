import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslationService } from './core/services/translation.service';
import { TvConfigService } from './core/services/tv-config.service';
import { TvConfigModalComponent } from './features/display/tv-config-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, TvConfigModalComponent],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      
      <!-- TV Display Configuration Pop-up Modal -->
      <app-tv-config-modal />
      
      @if (!isDisplayRoute()) {
        <!-- 3-Zone Architecture Navbar (Fixed h-14, zero-clutter, light/dark theme toggle, language switch) -->
        <nav class="sticky top-0 z-40 h-14 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-8">
        <div class="max-w-7xl h-full mx-auto flex items-center justify-between">
          
          <!-- Zone 1: App Brand (Left) -->
          <div class="flex items-center space-x-3 cursor-pointer" routerLink="/">
            <div class="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
              <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M7 8h10" />
                <path d="M7 12h6" />
                <path d="M7 16h8" />
              </svg>
            </div>
            <span class="font-bold text-base tracking-tight text-slate-900 dark:text-zinc-100">
              QueueFlow
            </span>
          </div>

          <!-- Zone 2: Navigation Segmented Tabs (Center) -->
          <div class="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 text-xs">
            <a 
              routerLink="/queue/join" 
              routerLinkActive="bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
              class="h-8 px-3.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-all inline-flex items-center space-x-2 whitespace-nowrap">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{{ i18n.t().tabTakeQueue }}</span>
            </a>
            
            <a 
              routerLink="/staff/dashboard" 
              routerLinkActive="bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
              class="h-8 px-3.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-all inline-flex items-center space-x-2 whitespace-nowrap">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{{ i18n.t().tabStaffDesk }}</span>
            </a>

            <a 
              routerLink="/admin/management" 
              routerLinkActive="bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
              class="h-8 px-3.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-all inline-flex items-center space-x-2 whitespace-nowrap">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{{ i18n.t().tabManagement }}</span>
            </a>

            <!-- TV Display Board Tab (Opens Setup Modal) -->
            <button 
              type="button"
              (click)="tvConfig.openModal()"
              class="h-8 px-3.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-all inline-flex items-center space-x-2 whitespace-nowrap cursor-pointer"
              title="Open TV Board Settings">
              <svg class="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span class="font-semibold text-blue-600 dark:text-blue-400">{{ i18n.t().tabTvDisplay }}</span>
            </button>
          </div>

          <!-- Zone 3: Utilities (Right: Language Switcher + Theme Toggle) -->
          <div class="flex items-center space-x-2.5">
            
            <!-- Language Switcher Segmented Control (EN / TH) -->
            <div class="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold">
              <button 
                (click)="i18n.setLanguage('en')"
                [ngClass]="i18n.currentLang() === 'en' ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'"
                class="px-2 py-1 rounded-md transition-all">
                EN
              </button>
              <button 
                (click)="i18n.setLanguage('th')"
                [ngClass]="i18n.currentLang() === 'th' ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'"
                class="px-2 py-1 rounded-md transition-all">
                TH
              </button>
            </div>

            <!-- Sun / Moon Theme Toggle -->
            <button 
              (click)="toggleTheme()"
              aria-label="Toggle Theme"
              class="w-8 h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-all flex items-center justify-center">
              @if (isDarkMode()) {
                <!-- Sun Icon -->
                <svg class="w-4 h-4 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <circle cx="12" cy="12" r="4" />
                  <path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41" />
                </svg>
              } @else {
                <!-- Moon Icon -->
                <svg class="w-4 h-4 shrink-0 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              }
            </button>

          </div>

        </div>
      </nav>
      }

      <!-- Main Surface Container -->
      <main class="flex-1 flex flex-col">
        <router-outlet></router-outlet>
      </main>

    </div>
  `
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  public i18n = inject(TranslationService);
  public tvConfig = inject(TvConfigService);
  isDarkMode = signal<boolean>(false);
  isDisplayRoute = signal<boolean>(false);

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isDisplayRoute.set(event.urlAfterRedirects.startsWith('/display'));
      }
    });
  }

  ngOnInit() {
    const savedTheme = localStorage.getItem('queueflow-theme');
    // Default is Light Mode (isDarkMode = false) unless explicitly set to dark
    if (savedTheme === 'dark') {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkMode.set(false);
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    const nextDark = !this.isDarkMode();
    this.isDarkMode.set(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('queueflow-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('queueflow-theme', 'light');
    }
  }
}
