import { Component, signal, inject, OnInit, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SignalRService } from '../../core/services/signalr.service';
import { TranslationService } from '../../core/services/translation.service';
import { ApiConfigService } from '../../core/services/api-config.service';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      
      <!-- Top Desk Header -->
      <header class="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold uppercase">
              {{ i18n.t().staffDeskBadge }}
            </span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              {{ i18n.t().staffDeskTitle }}
            </h1>
          </div>
          <p class="text-slate-500 dark:text-zinc-400 text-xs mt-1">Bangkok Central Branch</p>
        </div>

        <!-- Custom Styled Counter Selector & Refresh -->
        <div class="flex items-center space-x-3">
          <!-- Custom Popover Select for Counter -->
          <div class="relative" (click)="$event.stopPropagation()">
            <button 
              type="button"
              (click)="isCounterMenuOpen.set(!isCounterMenuOpen())"
              class="h-9 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-100 flex items-center space-x-2 whitespace-nowrap btn-motion shadow-xs hover:border-blue-500 cursor-pointer">
              <span class="w-2 h-2 rounded-full" [ngClass]="isCurrentCounterActive() ? 'bg-emerald-500' : 'bg-amber-400'"></span>
              <span>{{ getSelectedCounterName() }}</span>
              <svg class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0" 
                   [ngClass]="isCounterMenuOpen() ? 'rotate-180' : ''"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            @if (isCounterMenuOpen()) {
              <div class="absolute right-0 mt-1.5 w-64 bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div class="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-700/60 mb-1">
                  {{ i18n.t().sectionCounters }}
                </div>
                @for (c of counters(); track c.id) {
                  <button 
                    type="button"
                    (click)="selectCounter(c.id)"
                    class="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700/60 flex items-center justify-between transition-colors cursor-pointer"
                    [ngClass]="{'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold': selectedCounterId() === c.id}">
                    <div class="flex items-center space-x-2.5 min-w-0">
                      <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {{ c.counterNumber }}
                      </span>
                      <div class="truncate">
                        <div class="font-semibold text-slate-900 dark:text-zinc-100 truncate">{{ c.name }}</div>
                        @if (c.assignedServicePrefix) {
                          <div class="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            {{ i18n.t().categoryPrefix }} {{ c.assignedServicePrefix }} - {{ c.assignedServiceName }}
                          </div>
                        }
                      </div>
                    </div>
                    @if (selectedCounterId() === c.id) {
                      <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    }
                  </button>
                } @empty {
                  <div class="px-4 py-3 text-xs text-slate-400 text-center">
                    {{ i18n.t().noCountersFound }}
                  </div>
                }
              </div>
            }
          </div>

          <button 
            (click)="refreshData()"
            class="h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 text-xs font-medium inline-flex items-center space-x-1.5 whitespace-nowrap btn-motion">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{{ i18n.t().btnRefresh }}</span>
          </button>
        </div>
      </header>

      <!-- Main Desk Workspace Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Section: Main Desk Operations (2 Columns) -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Active Ticket Spotlight Card -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm relative overflow-hidden transition-colors duration-200">
            
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 mb-5">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {{ i18n.t().currentDeskTitle }}
              </span>

              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    [ngClass]="{
                      'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400': currentDeskTicket()?.status === 1,
                      'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300': currentDeskTicket()?.status === 2,
                      'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400': !currentDeskTicket()
                    }">
                {{ currentDeskTicket() ? getStatusLabel(currentDeskTicket()?.status) : i18n.t().deskAvailable }}
              </span>
            </div>

            @if (currentDeskTicket()) {
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-2">
                <div>
                  <div class="text-5xl sm:text-6xl font-extrabold font-ticket tracking-tight text-slate-900 dark:text-zinc-100">
                    {{ currentDeskTicket()?.ticketNumber }}
                  </div>
                  <div class="text-xs text-slate-500 dark:text-zinc-400 mt-2 flex items-center space-x-1.5">
                    <span>{{ i18n.t().serviceLabel }}</span>
                    <span class="font-semibold text-slate-800 dark:text-zinc-200">{{ currentDeskTicket()?.service?.name }}</span>
                  </div>
                </div>

                <!-- Action Button Matrix (Strictly Single-Line & Uniform Heights) -->
                <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                  @if (currentDeskTicket()?.status === 1) {
                    <button 
                      (click)="recallCurrent()"
                      class="h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 text-xs font-semibold whitespace-nowrap btn-motion">
                      {{ i18n.t().btnRecall }}
                    </button>
                    
                    <button 
                      (click)="startServiceCurrent()"
                      class="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap btn-motion">
                      {{ i18n.t().btnStartService }}
                    </button>

                    <button 
                      (click)="markNoShowCurrent()"
                      class="h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-xs font-semibold whitespace-nowrap btn-motion">
                      {{ i18n.t().btnNoShow }}
                    </button>
                  } @else if (currentDeskTicket()?.status === 2) {
                    <button 
                      (click)="completeCurrent()"
                      class="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap btn-motion">
                      {{ i18n.t().btnComplete }}
                    </button>

                    <button 
                      (click)="skipCurrent()"
                      class="h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 text-xs font-semibold whitespace-nowrap btn-motion">
                      {{ i18n.t().btnSkip }}
                    </button>
                  }
                </div>
              </div>
            } @else {
              <div class="py-8 text-center text-slate-400 text-xs">
                {{ i18n.t().deskAvailable }}
              </div>
            }

            <!-- Big Call Next Button -->
            <div class="mt-5 pt-5 border-t border-slate-100 dark:border-zinc-800">
              <button 
                (click)="callNext()"
                [disabled]="isCallingNext()"
                class="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                <span>{{ isCallingNext() ? i18n.t().btnProcessing : i18n.t().btnCallNext }}</span>
              </button>
            </div>
          </div>

          <!-- Waiting Tickets Table -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm transition-colors duration-200">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                {{ i18n.t().waitingTableTitle }} ({{ waitingList().length }})
              </h2>
              <span class="text-xs text-slate-400">{{ i18n.t().sortNotice }}</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-semibold">
                    <th class="pb-3">{{ i18n.t().colNumber }}</th>
                    <th class="pb-3">{{ i18n.t().colService }}</th>
                    <th class="pb-3">{{ i18n.t().colWait }}</th>
                    <th class="pb-3 text-right">{{ i18n.t().colAction }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-zinc-800">
                  @for (item of waitingList(); track item.id) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td class="py-3 font-ticket font-bold text-slate-900 dark:text-zinc-100 text-sm">{{ item.ticketNumber }}</td>
                      <td class="py-3 text-slate-600 dark:text-zinc-400">{{ item.service?.name }}</td>
                      <td class="py-3 font-mono text-slate-500 dark:text-zinc-400">~{{ item.estimatedWaitMinutes }} {{ i18n.t().statMinutesSuffix }}</td>
                      <td class="py-3 text-right">
                        <button 
                          (click)="elevatePriority(item.id)"
                          class="h-7 px-2.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-[11px] whitespace-nowrap btn-motion">
                          {{ i18n.t().btnElevatePriority }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>

              @if (waitingList().length === 0) {
                <div class="text-center py-8 text-slate-400 text-xs">
                  {{ i18n.t().emptyWaitingList }}
                </div>
              }
            </div>
          </div>

        </div>

        <!-- Right Section: Telemetric Overview & Active Counters (1 Column) -->
        <div class="space-y-6">
          
          <!-- Daily Performance Bento Card -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-4 transition-colors duration-200">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              {{ i18n.t().todayStatsTitle }}
            </h3>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60">
                <div class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().statWaiting }}</div>
                <div class="text-2xl font-bold font-ticket text-amber-600 dark:text-amber-400 mt-1">
                  {{ overview()?.totalWaiting || 0 }}
                </div>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60">
                <div class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().statServing }}</div>
                <div class="text-2xl font-bold font-ticket text-blue-600 dark:text-blue-400 mt-1">
                  {{ overview()?.totalServing || 0 }}
                </div>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60">
                <div class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().statCompleted }}</div>
                <div class="text-2xl font-bold font-ticket text-emerald-600 dark:text-emerald-400 mt-1">
                  {{ overview()?.totalCompletedToday || 0 }}
                </div>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60">
                <div class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().statAvgWait }}</div>
                <div class="mt-1 flex items-baseline">
                  <span class="text-2xl font-bold font-ticket text-slate-800 dark:text-zinc-200">{{ overview()?.averageWaitMinutes || 0 }}</span>
                  <span class="text-xs font-medium text-slate-500 dark:text-zinc-400 ml-1.5 tracking-normal">{{ i18n.t().statMinutesSuffix }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Counter Stations -->
          <div class="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm transition-colors duration-200">
            <h3 class="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              {{ i18n.t().allCountersTitle }}
            </h3>

            <div class="space-y-2">
              @for (cnt of overview()?.activeCounters; track cnt.counterId) {
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-between">
                  <div class="flex items-center space-x-2.5">
                    <span class="w-6 h-6 rounded-lg bg-slate-200/70 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      {{ cnt.counterNumber }}
                    </span>
                    <div>
                      <div class="text-xs font-semibold text-slate-800 dark:text-zinc-200">{{ cnt.counterName }}</div>
                      <div class="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                        {{ cnt.currentTicketNumber ? i18n.t().counterServingPrefix + cnt.currentTicketNumber : i18n.t().counterAvailable }}
                      </div>
                    </div>
                  </div>

                  <span class="w-2 h-2 rounded-full" 
                        [ngClass]="cnt.currentTicketNumber ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-600'"></span>
                </div>
              } @empty {
                <div class="py-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                  {{ i18n.t().noneOpen }}
                </div>
              }
            </div>
          </div>

        </div>

      </div>

    </div>
  `
})
export class StaffDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  public signalR = inject(SignalRService);
  public i18n = inject(TranslationService);
  private api = inject(ApiConfigService);

  branchId = signal<string>('');
  counters = signal<any[]>([]);
  selectedCounterId = signal<string>('');
  isCounterMenuOpen = signal<boolean>(false);
  currentDeskTicket = signal<any>(null);
  waitingList = signal<any[]>([]);
  overview = signal<any>(null);
  isCallingNext = signal<boolean>(false);

  constructor() {
    effect(() => {
      const evt = this.signalR.lastEvent();
      if (evt) {
        this.refreshData();
      }
    });
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.isCounterMenuOpen.set(false);
  }

  isCurrentCounterActive(): boolean {
    const c = this.counters().find(x => x.id === this.selectedCounterId());
    return c ? c.isActive !== false : false;
  }

  ngOnInit() {
    this.http.get<any[]>(this.api.url('/api/branches?all=true')).subscribe({
      next: (branches) => {
        if (branches.length > 0) {
          const b = branches[0];
          this.branchId.set(b.id);
          this.counters.set(b.counters || []);

          if (b.counters && b.counters.length > 0) {
            const savedCounterId = localStorage.getItem('queueflow_staff_counter_id');
            const matched = b.counters.find((c: any) => c.id === savedCounterId);
            this.selectedCounterId.set(matched ? matched.id : b.counters[0].id);
          }

          this.signalR.startConnection().then(() => {
            this.signalR.joinBranch(b.id);
          });

          this.refreshData();
        }
      }
    });
  }

  getSelectedCounterName(): string {
    const c = this.counters().find(x => x.id === this.selectedCounterId());
    const t = this.i18n.t();
    return c ? `${c.name} (${t.counterLabel} ${c.counterNumber})` : t.selectCounterPrompt;
  }

  selectCounter(counterId: string) {
    this.selectedCounterId.set(counterId);
    try {
      localStorage.setItem('queueflow_staff_counter_id', counterId);
    } catch {}
    this.isCounterMenuOpen.set(false);

    // If counter is currently inactive, automatically activate it since staff is opening this desk
    const c = this.counters().find(x => x.id === counterId);
    if (c && !c.isActive) {
      this.http.patch(this.api.url(`/api/admin/counters/${counterId}/toggle-active`), {}).subscribe({
        next: () => {
          c.isActive = true;
          this.refreshData();
        }
      });
    } else {
      this.refreshData();
    }
  }

  refreshData() {
    if (!this.branchId()) return;

    this.http.get<any[]>(this.api.url('/api/branches?all=true')).subscribe({
      next: (branches) => {
        if (branches.length > 0) {
          const b = branches[0];
          this.counters.set(b.counters || []);
          if (!this.selectedCounterId() && b.counters && b.counters.length > 0) {
            const savedCounterId = localStorage.getItem('queueflow_staff_counter_id');
            const matched = b.counters.find((c: any) => c.id === savedCounterId);
            this.selectedCounterId.set(matched ? matched.id : b.counters[0].id);
          }
        }
      }
    });

    this.http.get<any[]>(this.api.url(`/api/staff/queues/active?branchId=${this.branchId()}`)).subscribe({
      next: (tickets) => {
        this.waitingList.set(tickets.filter(t => t.status === 0));
        const current = tickets.find(t => t.counterId === this.selectedCounterId() && (t.status === 1 || t.status === 2));
        this.currentDeskTicket.set(current || null);
      }
    });

    this.http.get<any>(this.api.url(`/api/analytics/overview?branchId=${this.branchId()}`)).subscribe({
      next: (data) => {
        this.overview.set(data);
      }
    });
  }

  callNext() {
    if (this.isCallingNext() || !this.selectedCounterId()) return;
    this.isCallingNext.set(true);

    const payload = {
      counterId: this.selectedCounterId(),
      serviceIds: []
    };

    this.http.post<any>(this.api.url('/api/staff/queues/next'), payload).subscribe({
      next: () => {
        this.isCallingNext.set(false);
        this.refreshData();
      },
      error: () => {
        this.isCallingNext.set(false);
      }
    });
  }

  recallCurrent() {
    const t = this.currentDeskTicket();
    if (!t) return;
    this.http.post<any>(this.api.url(`/api/staff/queues/${t.id}/recall`), {}).subscribe({
      next: () => this.refreshData()
    });
  }

  startServiceCurrent() {
    const t = this.currentDeskTicket();
    if (!t) return;
    this.http.post<any>(this.api.url(`/api/staff/queues/${t.id}/start`), {}).subscribe({
      next: () => this.refreshData()
    });
  }

  completeCurrent() {
    const t = this.currentDeskTicket();
    if (!t) return;
    this.http.post<any>(this.api.url(`/api/staff/queues/${t.id}/complete`), {}).subscribe({
      next: () => this.refreshData()
    });
  }

  skipCurrent() {
    const t = this.currentDeskTicket();
    if (!t) return;
    this.http.post<any>(this.api.url(`/api/staff/queues/${t.id}/skip`), {}).subscribe({
      next: () => this.refreshData()
    });
  }

  markNoShowCurrent() {
    const t = this.currentDeskTicket();
    if (!t) return;
    this.http.post<any>(this.api.url(`/api/staff/queues/${t.id}/no-show`), {}).subscribe({
      next: () => this.refreshData()
    });
  }

  elevatePriority(ticketId: string) {
    this.http.put<any>(this.api.url(`/api/staff/queues/${ticketId}/priority`), {
      priority: 1,
      reason: 'Staff elevated priority'
    }).subscribe({
      next: () => this.refreshData()
    });
  }

  getStatusLabel(status: number): string {
    const t = this.i18n.t();
    switch (status) {
      case 0: return t.statusWaiting;
      case 1: return t.statusCalled;
      case 2: return t.statusServing;
      case 3: return t.statusCompleted;
      case 4: return t.statusSkipped;
      default: return '-';
    }
  }
}
