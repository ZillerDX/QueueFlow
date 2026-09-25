import { Component, signal, inject, OnInit, OnDestroy, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { SignalRService } from '../../core/services/signalr.service';
import { TranslationService } from '../../core/services/translation.service';
import { SoundAlertService } from '../../core/services/sound-alert.service';
import { ApiConfigService } from '../../core/services/api-config.service';

@Component({
  selector: 'app-ticket-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 relative">
      
      <!-- Ticket Container Card -->
      <div class="w-full max-w-md bg-white dark:bg-zinc-900 border rounded-2xl p-6 sm:p-8 shadow-sm transition-all duration-300"
           [ngClass]="ticket()?.status === 1 ? 'border-emerald-500/60 dark:border-emerald-500/60 ring-2 ring-emerald-500/20' : 'border-slate-200/90 dark:border-zinc-800'">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 mb-6">
          <span class="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            {{ i18n.t().ticketStatusTitle }}
          </span>

          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                [ngClass]="{
                  'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400': ticket()?.status === 0,
                  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 animate-pulse': ticket()?.status === 1,
                  'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300': ticket()?.status === 2,
                  'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400': ticket()?.status >= 3
                }">
            {{ getStatusLabel(ticket()?.status) }}
          </span>
        </div>

        <!-- Sound Alert Status Pill & Test -->
        <div class="mb-5 p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
             [ngClass]="sound.isAudioUnlocked() ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 cursor-pointer'"
             (click)="unlockSound()">
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              @if (sound.isAudioUnlocked()) {
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              } @else {
                <path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              }
            </svg>
            <span class="font-medium text-[11px] sm:text-xs">
              {{ sound.isAudioUnlocked() ? i18n.t().soundAlertReady : i18n.t().soundAlertMuted }}
            </span>
          </div>

          <button 
            type="button"
            (click)="testSound($event)"
            class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-[11px] font-semibold text-slate-700 dark:text-zinc-200 shadow-2xs whitespace-nowrap btn-motion">
            {{ i18n.t().btnTestSound }}
          </button>
        </div>

        @if (isLoading()) {
          <div class="space-y-4 animate-pulse py-8">
            <div class="h-20 bg-slate-100 dark:bg-zinc-800 rounded-xl"></div>
            <div class="h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl"></div>
          </div>
        } @else if (ticket()) {
          
          <!-- Large Ticket Number -->
          <div class="text-center py-2">
            <div class="text-[11px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              {{ i18n.t().yourTicketNumber }}
            </div>
            
            <div class="text-6xl sm:text-7xl font-extrabold font-ticket tracking-tight text-slate-900 dark:text-zinc-100 my-2">
              {{ ticket()?.ticketNumber }}
            </div>
          </div>

          <!-- Alert Call Box (When Called) -->
          @if (ticket()?.status === 1) {
            <div class="my-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-center animate-bounce">
              <div class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                {{ i18n.t().callAlertTitle }}
              </div>
              <div class="text-3xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-1">
                {{ i18n.t().counterLabel }} {{ ticket()?.counterNumber || '-' }}
              </div>
              <div class="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                {{ ticket()?.counterName }}
              </div>
            </div>
          }

          <!-- Bento Grid Metrics -->
          <div class="grid grid-cols-2 gap-3 my-5">
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 text-center">
              <div class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().aheadLabel }}</div>
              <div class="text-2xl font-bold font-ticket text-slate-900 dark:text-zinc-100 mt-1">
                {{ ticket()?.status === 0 ? ticket()?.peopleAhead : 0 }}
                <span class="text-xs font-normal text-slate-400 ml-1.5 tracking-normal">{{ i18n.t().aheadSuffix }}</span>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 text-center">
              <div class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().estWaitLabel }}</div>
              <div class="text-2xl font-bold font-ticket text-slate-900 dark:text-zinc-100 mt-1">
                ~{{ ticket()?.status === 0 ? ticket()?.estimatedWaitMinutes : 0 }}
                <span class="text-xs font-normal text-slate-400 ml-1.5 tracking-normal">{{ i18n.t().estWaitSuffix }}</span>
              </div>
            </div>
          </div>

          <!-- Serving Info -->
          @if (ticket()?.currentServingTicket) {
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/40 flex items-center justify-between text-xs mb-5">
              <span class="text-slate-500 dark:text-zinc-400">{{ i18n.t().servingNowLabel }}</span>
              <span class="font-mono font-bold text-slate-800 dark:text-zinc-200">{{ ticket()?.currentServingTicket }}</span>
            </div>
          }

          <!-- Single-Action Buttons -->
          <div class="space-y-2">
            @if (ticket()?.status === 0) {
              <button 
                (click)="openCancelModal()"
                [disabled]="isCancelling()"
                class="w-full h-10 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold whitespace-nowrap btn-motion">
                {{ isCancelling() ? i18n.t().btnCancelling : i18n.t().btnCancelQueue }}
              </button>
            } @else if (ticket()?.status >= 3) {
              <button 
                (click)="goToJoin()"
                class="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap btn-motion">
                {{ i18n.t().btnNewQueue }}
              </button>
            }
          </div>

        } @else {
          <div class="text-center py-8 text-slate-400 text-xs">
            {{ i18n.t().ticketNotFound }}
          </div>
        }

      </div>

      <!-- Modern Confirmation Dialog (Replaces native browser alert) -->
      @if (showCancelModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-200">
          
          <!-- Dialog Card -->
          <div class="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <!-- Close Top-Right Icon -->
            <button 
              (click)="closeCancelModal()"
              class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 rounded-lg">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <!-- Warning Icon -->
            <div class="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <!-- Content -->
            <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100">
              {{ i18n.t().modalCancelTitle }}
            </h3>
            
            <p class="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
              {{ i18n.t().modalCancelDesc }}
            </p>

            <!-- Action Buttons: Cancel vs Keep -->
            <div class="grid grid-cols-2 gap-2.5 mt-6">
              <button 
                (click)="closeCancelModal()"
                class="h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 text-xs font-semibold whitespace-nowrap btn-motion">
                {{ i18n.t().modalBtnDismiss }}
              </button>

              <button 
                (click)="confirmCancellation()"
                [disabled]="isCancelling()"
                class="h-9 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap shadow-xs btn-motion">
                {{ isCancelling() ? i18n.t().btnCancelling : i18n.t().modalBtnConfirm }}
              </button>
            </div>

          </div>

        </div>
      }

    </div>
  `
})
export class TicketTrackerComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public signalR = inject(SignalRService);
  public i18n = inject(TranslationService);
  public sound = inject(SoundAlertService);
  private api = inject(ApiConfigService);

  token = signal<string>('');
  ticket = signal<any>(null);
  previousStatus = signal<number | null>(null);
  isLoading = signal<boolean>(true);
  isCancelling = signal<boolean>(false);
  showCancelModal = signal<boolean>(false);

  @HostListener('click')
  @HostListener('touchstart')
  onInteraction() {
    this.sound.unlockAudio();
  }

  constructor() {
    effect(() => {
      const evt = this.signalR.lastEvent();
      if (evt && (evt.type === 'TicketStatusChanged' || evt.type === 'QueueUpdated' || evt.type === 'TicketCalled')) {
        this.fetchTicket();
      }
    });
  }

  ngOnInit() {
    const tokenParam = this.route.snapshot.paramMap.get('token');
    if (tokenParam) {
      this.token.set(tokenParam);
      this.fetchTicket();

      this.signalR.startConnection().then(() => {
        this.signalR.joinTicket(tokenParam);
      });
    } else {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {}

  fetchTicket() {
    if (!this.token()) return;
    this.http.get<any>(this.api.url(`/api/queues/${this.token()}`)).subscribe({
      next: (data) => {
        const prev = this.previousStatus();
        this.ticket.set(data);
        this.isLoading.set(false);

        if (data?.branchId) {
          this.signalR.joinBranch(data.branchId);
        }

        // Trigger mobile audio alert when called to counter (status 1)
        if (data && data.status === 1 && prev !== 1) {
          this.sound.playQueueCalledAlert(
            data.ticketNumber, 
            data.counterNumber, 
            this.i18n.currentLang()
          );
        }

        this.previousStatus.set(data?.status ?? null);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  unlockSound() {
    this.sound.unlockAudio();
  }

  testSound(event: MouseEvent) {
    event.stopPropagation();
    this.sound.unlockAudio();
    const t = this.ticket();
    this.sound.playQueueCalledAlert(
      t?.ticketNumber || 'V-012', 
      t?.counterNumber || 1, 
      this.i18n.currentLang()
    );
  }

  openCancelModal() {
    this.showCancelModal.set(true);
  }

  closeCancelModal() {
    this.showCancelModal.set(false);
  }

  confirmCancellation() {
    this.isCancelling.set(true);

    this.http.post<any>(this.api.url(`/api/queues/${this.token()}/cancel`), {}).subscribe({
      next: () => {
        this.fetchTicket();
        this.isCancelling.set(false);
        this.showCancelModal.set(false);
      },
      error: () => {
        this.isCancelling.set(false);
        this.showCancelModal.set(false);
      }
    });
  }

  goToJoin() {
    this.router.navigate(['/queue/join']);
  }

  getStatusLabel(status: number): string {
    const t = this.i18n.t();
    switch (status) {
      case 0: return t.statusWaiting;
      case 1: return t.statusCalled;
      case 2: return t.statusServing;
      case 3: return t.statusCompleted;
      case 4: return t.statusSkipped;
      case 5: return t.statusCancelled;
      case 6: return t.statusNoShow;
      default: return '-';
    }
  }
}
