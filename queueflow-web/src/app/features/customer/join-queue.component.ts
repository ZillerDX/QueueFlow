import { Component, signal, inject, OnInit, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { SignalRService } from '../../core/services/signalr.service';
import { ApiConfigService } from '../../core/services/api-config.service';

@Component({
  selector: 'app-join-queue',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex flex-col justify-center items-center p-4 sm:p-8">
      
      <!-- Customer Card Container -->
      <div class="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors duration-200">
        
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-3">
            <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            {{ i18n.t().joinTitle }}
          </h1>
          <p class="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1 max-w-prose leading-relaxed">
            {{ i18n.t().joinSubtitle }}
          </p>
        </div>

        @if (isLoading()) {
          <div class="space-y-3 animate-pulse">
            <div class="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl"></div>
            <div class="h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl"></div>
            <div class="h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl"></div>
          </div>
        } @else if (selectedBranch()) {
          
          <!-- Branch Identity Pill -->
          <div class="mb-5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <svg class="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span class="text-xs font-semibold text-slate-700 dark:text-zinc-300">{{ selectedBranch()?.name }}</span>
            </div>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium">
              {{ selectedBranch()?.code }}
            </span>
          </div>

          <!-- Service List -->
          <div class="space-y-2.5">
            <label class="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              {{ i18n.t().selectServicePrompt }}
            </label>

            @for (service of selectedBranch()?.services; track service.id) {
              <button 
                (click)="openPreview(service)"
                [disabled]="isSubmitting()"
                class="w-full p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 text-left flex items-center justify-between group btn-motion">
                <div class="space-y-1">
                  <div class="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center space-x-2">
                    <span class="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold flex items-center justify-center">
                      {{ service.codePrefix }}
                    </span>
                    <span class="text-sm">{{ service.name }}</span>
                  </div>
                  <div class="text-xs text-slate-500 dark:text-zinc-400 flex items-center space-x-1.5 pl-8">
                    <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{{ i18n.t().avgDurationPrefix }}{{ service.defaultServiceDurationMinutes }} {{ i18n.t().avgDurationSuffix }}</span>
                  </div>
                </div>

                <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            }
          </div>

        } @else {
          <div class="text-center py-8 text-slate-500 dark:text-zinc-500 text-xs">
            {{ i18n.t().noBranchAvailable }}
          </div>
        }

        <!-- Footer Info -->
        <div class="mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800 text-center text-xs text-slate-400 dark:text-zinc-500 flex items-center justify-center space-x-1.5">
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>{{ i18n.t().privacyNotice }}</span>
        </div>

      </div>

      <!-- Queue Ticket Preview Modal (Center Popup) -->
      @if (selectedServiceForPreview(); as previewService) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs"
          (click)="cancelPreview()">
          <div 
            class="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative"
            (click)="$event.stopPropagation()">
            
            <!-- Close Button -->
            <button 
              (click)="cancelPreview()" 
              class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <!-- Modal Header -->
            <div class="text-center mb-5">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-2.5">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                {{ i18n.t().modalPreviewTitle }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {{ i18n.t().modalPreviewDesc }}
              </p>
            </div>

            <!-- Service Details Bento Card -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 space-y-3.5 mb-5">
              <div class="flex items-start space-x-3">
                <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-mono font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                  {{ previewService.codePrefix }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {{ i18n.t().modalPreviewService }}
                  </div>
                  <div class="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                    {{ previewService.name }}
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-200/70 dark:border-zinc-700/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-[10px] text-slate-400 dark:text-zinc-500 block uppercase font-medium">
                    {{ i18n.t().modalPreviewBranch }}
                  </span>
                  <span class="font-medium text-slate-700 dark:text-zinc-300 truncate block">
                    {{ selectedBranch()?.name }}
                  </span>
                </div>
                <div>
                  <span class="text-[10px] text-slate-400 dark:text-zinc-500 block uppercase font-medium">
                    {{ i18n.t().modalPreviewDuration }}
                  </span>
                  <span class="font-medium text-slate-700 dark:text-zinc-300 block">
                    ~{{ previewService.defaultServiceDurationMinutes }} {{ i18n.t().avgDurationSuffix }}
                  </span>
                </div>
              </div>

              @if (assignedCounter(); as counter) {
                <div class="pt-2.5 border-t border-slate-200/70 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                  <span class="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-medium">
                    {{ i18n.t().modalCounterDesk }}
                  </span>
                  <span class="font-semibold text-blue-600 dark:text-blue-400">
                    {{ counter.name }} ({{ i18n.t().counterLabel }} {{ counter.counterNumber }})
                  </span>
                </div>
              }
            </div>

            <!-- Action Buttons: Cancel vs OK -->
            <div class="grid grid-cols-2 gap-3">
              <button 
                type="button"
                (click)="cancelPreview()"
                [disabled]="isSubmitting()"
                class="h-10 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50 btn-motion">
                {{ i18n.t().modalPreviewBtnCancel }}
              </button>
              
              <button 
                type="button"
                (click)="confirmQueue()"
                [disabled]="isSubmitting()"
                class="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 btn-motion inline-flex items-center justify-center space-x-1.5 shadow-sm">
                @if (isSubmitting()) {
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ i18n.t().btnProcessing }}</span>
                } @else {
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{{ i18n.t().modalPreviewBtnConfirm }}</span>
                }
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class JoinQueueComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public i18n = inject(TranslationService);
  public signalR = inject(SignalRService);
  private api = inject(ApiConfigService);

  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  selectedBranch = signal<any>(null);
  selectedServiceForPreview = signal<any>(null);
  assignedCounter = signal<any>(null);

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.selectedServiceForPreview() && !this.isSubmitting()) {
      this.cancelPreview();
    }
  }

  constructor() {
    effect(() => {
      const evt = this.signalR.lastEvent();
      if (evt && evt.type === 'QueueUpdated') {
        if (!this.isSubmitting() && !this.selectedServiceForPreview()) {
          this.loadBranches();
        }
      }
    });
  }

  ngOnInit() {
    this.loadBranches();
  }

  loadBranches() {
    this.http.get<any[]>(this.api.url('/api/branches')).subscribe({
      next: (branches) => {
        if (branches.length > 0) {
          const b = branches[0];
          this.selectedBranch.set(b);

          this.signalR.startConnection().then(() => {
            this.signalR.joinBranch(b.id);
          });

          // Check if counter QR code was scanned
          const counterId = this.route.snapshot.queryParamMap.get('counterId');
          if (counterId) {
            const matchedCounter = b.counters?.find((c: any) => c.id === counterId);
            if (matchedCounter) {
              this.assignedCounter.set(matchedCounter);
            }
          }

          // Check if direct service QR code was scanned
          const directServiceId = this.route.snapshot.queryParamMap.get('serviceId');
          if (directServiceId) {
            const matched = b.services?.find((s: any) => s.id === directServiceId);
            if (matched) {
              this.openPreview(matched);
            }
          }
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openPreview(service: any) {
    this.selectedServiceForPreview.set(service);
  }

  cancelPreview() {
    this.selectedServiceForPreview.set(null);
  }

  confirmQueue() {
    const service = this.selectedServiceForPreview();
    if (!service) return;
    this.takeQueue(service.id);
  }

  private takeQueue(serviceId: string) {
    if (this.isSubmitting() || !this.selectedBranch()) return;
    this.isSubmitting.set(true);

    const payload = {
      branchId: this.selectedBranch().id,
      serviceId: serviceId
    };

    this.http.post<any>(this.api.url('/api/queues'), payload).subscribe({
      next: (res) => {
        this.selectedServiceForPreview.set(null);
        this.router.navigate(['/queue', res.customerToken]);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}

