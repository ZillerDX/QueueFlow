import { Component, signal, inject, OnInit, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';
import { TranslationService } from '../../core/services/translation.service';
import { SignalRService } from '../../core/services/signalr.service';
import { ApiConfigService } from '../../core/services/api-config.service';

@Component({
  selector: 'app-branch-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      
      <!-- Screen Only Admin Dashboard View (Hidden during Print) -->
      <div class="admin-page-content space-y-6">

      <!-- Management Header (Instrument Register) -->
      <header class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-colors duration-200">
        <div class="flex items-start sm:items-center space-x-4">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                {{ branch()?.name || i18n.t().adminTitle }}
              </h1>
              @if (branch()?.code) {
                <span class="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {{ branch()?.code }}
                </span>
              }
              <button 
                (click)="openEditBranchModal()"
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center transition-colors cursor-pointer"
                [title]="i18n.t().btnEditBranch">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <p class="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1 max-w-prose leading-relaxed">
              {{ i18n.t().adminSubtitle }}
            </p>
          </div>
        </div>

        <!-- Action Buttons (Responsive Mobile Full-width / Desktop Inline) -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <button 
            (click)="openServiceModal()"
            class="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap btn-motion inline-flex items-center justify-center space-x-2 shadow-xs">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{{ i18n.t().btnAddService }}</span>
          </button>

          <button 
            (click)="openCounterModal()"
            class="h-10 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/60 text-xs font-semibold whitespace-nowrap btn-motion inline-flex items-center justify-center space-x-2 shadow-xs">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{{ i18n.t().btnAddCounter }}</span>
          </button>
        </div>
      </header>

      <!-- KPI Quick Stats Bento Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Card 1: Services -->
        <div class="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-500 dark:text-zinc-400 block">{{ i18n.t().sectionServices }}</span>
            <div class="flex items-baseline space-x-2">
              <span class="text-2xl font-black text-slate-900 dark:text-zinc-100 font-mono">{{ branch()?.services?.length || 0 }}</span>
              <span class="text-xs text-slate-400">{{ i18n.t().categoryUnit }}</span>
            </div>
            <div class="flex items-center space-x-1 pt-0.5">
              @for (svc of branch()?.services; track svc.id) {
                <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {{ svc.codePrefix }}
                </span>
              }
            </div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        <!-- Card 2: Counters -->
        <div class="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-500 dark:text-zinc-400 block">{{ i18n.t().sectionCounters }}</span>
            <div class="flex items-baseline space-x-2">
              <span class="text-2xl font-black text-slate-900 dark:text-zinc-100 font-mono">{{ getActiveCounterCount() }}/{{ branch()?.counters?.length || 0 }}</span>
              <span class="text-xs text-slate-400">{{ i18n.t().deskUnit }}</span>
            </div>
            <span class="text-[11px] font-medium" [ngClass]="getActiveCounterCount() > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'">
              {{ getActiveCounterCount() > 0 ? (i18n.t().countersOpenPrefix + getActiveCounterCount() + i18n.t().countersOpenSuffix) : i18n.t().noneOpen }}
            </span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <!-- Card 3: Bound Desks -->
        <div class="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-500 dark:text-zinc-400 block">{{ i18n.t().dedicatedCounters }}</span>
            <div class="flex items-baseline space-x-2">
              <span class="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{{ getBoundCounterCount() }}/{{ branch()?.counters?.length || 0 }}</span>
              <span class="text-xs text-slate-400">{{ i18n.t().boundCountersUnit }}</span>
            </div>
            <span class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().directQueueNote }}</span>
          </div>
          <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Grid for Services & Counters -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        <!-- Column 1: Services Section with QR Generator -->
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-zinc-100">
                {{ i18n.t().sectionServices }} ({{ branch()?.services?.length || 0 }})
              </h2>
              <span class="text-xs text-slate-400 dark:text-zinc-500">{{ i18n.t().sectionServicesDesc }}</span>
            </div>
          </div>

          <div class="space-y-3">
            @for (service of branch()?.services; track service.id) {
              <div class="p-4 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                <div class="flex items-center space-x-3.5 min-w-0">
                  <span class="w-10 h-10 rounded-xl font-mono font-black text-sm flex items-center justify-center shadow-xs shrink-0 bg-blue-600 text-white">
                    {{ service.codePrefix }}
                  </span>
                  
                  <div class="min-w-0">
                    <div class="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                      <span>{{ service.name }}</span>
                    </div>

                    <div class="text-xs text-slate-500 dark:text-zinc-400 flex items-center space-x-2 mt-0.5">
                      <span class="inline-flex items-center space-x-1">
                        <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{{ i18n.t().avgDurationPrefix }}{{ service.defaultServiceDurationMinutes }} {{ i18n.t().avgDurationSuffix }}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Service Actions: Print QR + Edit + Delete -->
                <div class="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                  <button 
                    (click)="showServiceQr(service)"
                    class="h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold text-xs whitespace-nowrap btn-motion inline-flex items-center justify-center space-x-1.5 shadow-xs"
                    [title]="i18n.t().btnViewQr">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span class="hidden sm:inline">{{ i18n.t().btnViewQr }}</span>
                  </button>

                  <button 
                    (click)="openEditServiceModal(service)"
                    class="h-9 w-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-semibold text-xs btn-motion flex items-center justify-center shadow-xs cursor-pointer"
                    [title]="i18n.t().btnEdit">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>

                  <button 
                    (click)="confirmDelete('service', service.id, service.name)"
                    class="h-9 w-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-xs btn-motion flex items-center justify-center shadow-xs cursor-pointer"
                    [title]="i18n.t().btnDelete">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/20 space-y-3">
                <div class="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center">
                  <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div class="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  {{ i18n.t().noServicesFound }}
                </div>
                <button 
                  (click)="openServiceModal()"
                  class="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center space-x-1.5 btn-motion whitespace-nowrap cursor-pointer">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{{ i18n.t().btnAddService }}</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Column 2: Counters Section -->
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-zinc-100">
                {{ i18n.t().sectionCounters }} ({{ branch()?.counters?.length || 0 }})
              </h2>
              <span class="text-xs text-slate-400 dark:text-zinc-500">{{ i18n.t().sectionCountersDesc }}</span>
            </div>
          </div>

          <div class="space-y-3.5">
            @for (counter of branch()?.counters; track counter.id) {
              <div class="p-4 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 hover:border-slate-300 dark:hover:border-zinc-600 transition-all space-y-3">
                
                <!-- Counter Top Bar: Name, Number, Status Badges -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <span class="w-8 h-8 rounded-xl bg-slate-200/90 dark:bg-zinc-700 flex items-center justify-center font-black text-xs text-slate-800 dark:text-zinc-100 shrink-0">
                      {{ counter.counterNumber }}
                    </span>
                    <div>
                      <div class="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                        <span>{{ counter.name }}</span>
                        @if (counter.assignedServicePrefix) {
                          <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                            {{ i18n.t().categoryPrefix }} {{ counter.assignedServicePrefix }}
                          </span>
                        }
                      </div>
                      <div class="text-[11px] text-slate-500 dark:text-zinc-400">
                        {{ i18n.t().counterLabel }} {{ counter.counterNumber }}
                      </div>
                    </div>
                  </div>

                  <!-- Counter Active Toggle Badge -->
                  <button 
                    type="button"
                    (click)="toggleCounterStatus(counter)"
                    [title]="i18n.t().btnToggleStatus"
                    class="h-7 px-3 rounded-lg text-xs font-semibold transition-all border inline-flex items-center justify-center cursor-pointer whitespace-nowrap btn-motion"
                    [ngClass]="counter.isActive 
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:bg-blue-100' 
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-200'">
                    <span>{{ counter.isActive ? i18n.t().statusActive : i18n.t().statusInactive }}</span>
                  </button>
                </div>

                <!-- Custom Styled Service Binding Selector -->
                <div class="pt-2 border-t border-slate-200/60 dark:border-zinc-700/50 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
                  
                  <!-- Custom Dropdown Container -->
                  <div class="relative flex-1">
                    <label class="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 leading-normal">
                      {{ i18n.t().labelBoundService }}
                    </label>

                    <!-- Trigger Button -->
                    <button 
                      type="button"
                      (click)="toggleDropdown(counter.id, $event)"
                      class="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-left flex items-center justify-between text-xs font-medium text-slate-800 dark:text-zinc-200 hover:border-blue-500 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs transition-all">
                      <div class="flex items-center space-x-2 truncate">
                        @if (counter.assignedServicePrefix) {
                          <span class="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                            {{ counter.assignedServicePrefix }}
                          </span>
                          <span class="truncate font-semibold">{{ counter.assignedServiceName }}</span>
                        } @else {
                          <span class="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400 text-[10px] flex items-center justify-center shrink-0">•</span>
                          <span class="text-slate-500 dark:text-zinc-400">{{ i18n.t().allServicesOption }}</span>
                        }
                      </div>
                      
                      <svg 
                        [class.rotate-180]="activeCounterDropdownId() === counter.id"
                        class="w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-1.5" 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <!-- Floating Options Popover Menu -->
                    @if (activeCounterDropdownId() === counter.id) {
                      <div 
                        (click)="$event.stopPropagation()"
                        class="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200/90 dark:border-zinc-700 shadow-xl py-1 text-xs max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                        
                        <!-- Option Unbound -->
                        <button 
                          type="button"
                          (click)="selectCounterService(counter.id, '')"
                          class="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-zinc-700/60 flex items-center justify-between transition-colors"
                          [ngClass]="{'bg-blue-50 dark:bg-blue-950/40': !counter.assignedServiceId}">
                          <span class="text-slate-600 dark:text-zinc-300 font-medium">{{ i18n.t().allServicesOption }}</span>
                          @if (!counter.assignedServiceId) {
                            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          }
                        </button>

                        <div class="h-px bg-slate-100 dark:bg-zinc-700 my-1"></div>

                        <!-- Options for Each Service -->
                        @for (service of branch()?.services; track service.id) {
                          <button 
                            type="button"
                            (click)="selectCounterService(counter.id, service.id)"
                            class="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-zinc-700/60 flex items-center justify-between transition-colors"
                            [ngClass]="{'bg-blue-50 dark:bg-blue-950/40': counter.assignedServiceId === service.id}">
                            <div class="flex items-center space-x-2 truncate">
                              <span class="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                                {{ service.codePrefix }}
                              </span>
                              <span class="text-slate-800 dark:text-zinc-100 font-semibold truncate">{{ service.name }}</span>
                            </div>

                            @if (counter.assignedServiceId === service.id) {
                              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            }
                          </button>
                        }
                      </div>
                    }
                  </div>

                  <!-- Counter Actions: Print Desk QR + Edit + Delete -->
                  <div class="flex items-center space-x-1.5 shrink-0 self-end">
                    <button 
                      (click)="showCounterQr(counter)"
                      class="h-9 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-500/20 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white text-xs font-semibold whitespace-nowrap btn-motion inline-flex items-center space-x-1.5 shadow-xs transition-colors"
                      [title]="i18n.t().btnCounterQr">
                      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <span class="hidden sm:inline">{{ i18n.t().btnCounterQr }}</span>
                    </button>

                    <button 
                      (click)="openEditCounterModal(counter)"
                      class="h-9 w-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-semibold text-xs btn-motion flex items-center justify-center shadow-xs cursor-pointer"
                      [title]="i18n.t().btnEdit">
                      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    <button 
                      (click)="confirmDelete('counter', counter.id, counter.name)"
                      class="h-9 w-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-xs btn-motion flex items-center justify-center shadow-xs cursor-pointer"
                      [title]="i18n.t().btnDelete">
                      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                </div>

              </div>
            } @empty {
              <div class="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/20 space-y-3">
                <div class="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center">
                  <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div class="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  {{ i18n.t().noCountersFound }}
                </div>
                <button 
                  (click)="openCounterModal()"
                  class="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center space-x-1.5 btn-motion whitespace-nowrap cursor-pointer">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{{ i18n.t().btnAddCounter }}</span>
                </button>
              </div>
            }
          </div>
        </div>

      </div>
      </div>

      <!-- Toast Notification Alert -->
      @if (toastMessage(); as toast) {
        <div 
          class="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center space-x-3 animate-in slide-in-from-top-4 duration-200"
          [ngClass]="toast.isError ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-900 dark:text-rose-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-900 dark:text-emerald-200'">
          <svg class="w-5 h-5 shrink-0" [ngClass]="toast.isError ? 'text-rose-600' : 'text-emerald-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            @if (toast.isError) {
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            }
          </svg>
          <span class="text-xs font-semibold">{{ toast.text }}</span>
        </div>
      }

      <!-- Modal 1: Add / Edit Service Modal -->
      @if (showServiceModal()) {
        <div (click)="closeAllModals()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div (click)="$event.stopPropagation()" class="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button (click)="showServiceModal.set(false)" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 cursor-pointer">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 mb-4">
              {{ editingServiceId() ? i18n.t().modalEditService : i18n.t().btnAddService }}
            </h3>
            
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">{{ i18n.t().labelServiceName }}</label>
                <input [(ngModel)]="serviceForm.name" [placeholder]="i18n.t().serviceNamePlaceholder" class="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500" />
                <span class="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">{{ i18n.t().serviceNameDuplicateAllowed }}</span>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300">{{ i18n.t().labelCodePrefix }}</label>
                  <span class="text-[10px] text-slate-400">{{ i18n.t().prefixUniqueNotice }}</span>
                </div>
                <input 
                  [(ngModel)]="serviceForm.codePrefix" 
                  [placeholder]="i18n.t().prefixPlaceholder" 
                  maxlength="2" 
                  class="w-full h-9 px-3 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 uppercase outline-none transition-colors" 
                  [ngClass]="isPrefixDuplicate() ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20' : 'border-slate-200 dark:border-zinc-700 focus:border-blue-500'" />
                @if (isPrefixDuplicate()) {
                  <p class="text-[11px] text-rose-500 mt-1 flex items-center space-x-1">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <span>{{ i18n.t().prefixDuplicateError }} ('{{ serviceForm.codePrefix.toUpperCase() }}')</span>
                  </p>
                }
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">{{ i18n.t().labelDuration }}</label>
                <input [(ngModel)]="serviceForm.duration" type="number" min="1" class="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-6">
              <button (click)="showServiceModal.set(false)" class="h-9 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 btn-motion">{{ i18n.t().btnCancel }}</button>
              <button (click)="saveService()" [disabled]="!serviceForm.name || !serviceForm.codePrefix || isPrefixDuplicate()" class="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold btn-motion cursor-pointer">{{ i18n.t().btnSave }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal 2: Add / Edit Counter Modal -->
      @if (showCounterModal()) {
        <div (click)="closeAllModals()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div (click)="$event.stopPropagation()" class="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button (click)="showCounterModal.set(false)" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 cursor-pointer">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 mb-4">
              {{ editingCounterId() ? i18n.t().modalEditCounter : i18n.t().btnAddCounter }}
            </h3>
            
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">{{ i18n.t().labelCounterName }}</label>
                <input [(ngModel)]="counterForm.name" [placeholder]="i18n.t().counterNamePlaceholder" class="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500" />
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300">{{ i18n.t().labelCounterNumber }}</label>
                  <span class="text-[10px] text-slate-400">{{ i18n.t().counterNumberHint }}</span>
                </div>
                <input 
                  [(ngModel)]="counterForm.counterNumber" 
                  (ngModelChange)="onCounterNumberChange()"
                  type="number" 
                  min="1" 
                  class="w-full h-9 px-3 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none transition-colors" 
                  [ngClass]="isCounterNumberDuplicate() ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20' : 'border-slate-200 dark:border-zinc-700 focus:border-blue-500'" />
                @if (isCounterNumberDuplicate()) {
                  <p class="text-[11px] text-rose-500 mt-1 flex items-center space-x-1">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <span>{{ i18n.t().counterNumberDuplicateError }} ({{ counterForm.counterNumber }})</span>
                  </p>
                }
              </div>

              <!-- Custom Popover Select for Bound Service (Frontend Skill Standard) -->
              <div class="relative">
                <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 leading-normal">
                  {{ i18n.t().labelBoundService }}
                </label>
                
                <!-- Trigger Button -->
                <button
                  type="button"
                  (click)="toggleModalDropdown($event)"
                  class="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-left flex items-center justify-between text-xs font-medium text-slate-800 dark:text-zinc-200 hover:border-blue-500 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs transition-all cursor-pointer">
                  <div class="flex items-center space-x-2 truncate">
                    @if (getSelectedModalService(); as selected) {
                      <span class="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {{ selected.codePrefix }}
                      </span>
                      <span class="truncate font-semibold text-slate-800 dark:text-zinc-100">{{ selected.name }}</span>
                    } @else {
                      <span class="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-400 dark:text-zinc-400 text-[10px] flex items-center justify-center shrink-0">•</span>
                      <span class="text-slate-500 dark:text-zinc-400">{{ i18n.t().allServicesOption }}</span>
                    }
                  </div>

                  <svg 
                    [class.rotate-180]="isCounterModalDropdownOpen()"
                    class="w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-1.5" 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <!-- Floating Popover Menu -->
                @if (isCounterModalDropdownOpen()) {
                  <div 
                    (click)="$event.stopPropagation()"
                    class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200/90 dark:border-zinc-700 shadow-xl py-1 text-xs max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                    
                    <!-- Option 1: Unbound / All Services -->
                    <button 
                      type="button"
                      (click)="selectModalService(null)"
                      class="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-zinc-700/60 flex items-center justify-between transition-colors cursor-pointer"
                      [ngClass]="{'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300': !counterForm.assignedServiceId}">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-400 text-[10px] flex items-center justify-center shrink-0">•</span>
                        <span class="font-medium">{{ i18n.t().allServicesOption }}</span>
                      </div>
                      @if (!counterForm.assignedServiceId) {
                        <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      }
                    </button>

                    <!-- Service Options -->
                    @for (s of branch()?.services; track s.id) {
                      <button 
                        type="button"
                        (click)="selectModalService(s.id)"
                        class="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-zinc-700/60 flex items-center justify-between transition-colors cursor-pointer"
                        [ngClass]="{'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300': counterForm.assignedServiceId === s.id}">
                        <div class="flex items-center space-x-2 truncate">
                          <span class="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                            {{ s.codePrefix }}
                          </span>
                          <span class="truncate font-semibold">{{ s.name }}</span>
                        </div>
                        @if (counterForm.assignedServiceId === s.id) {
                          <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-6">
              <button (click)="showCounterModal.set(false)" class="h-9 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 btn-motion">{{ i18n.t().btnCancel }}</button>
              <button (click)="saveCounter()" [disabled]="!counterForm.name || !counterForm.counterNumber || isCounterNumberDuplicate()" class="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold btn-motion cursor-pointer">{{ i18n.t().btnSave }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal 3: Edit Branch Modal -->
      @if (showBranchModal()) {
        <div (click)="closeAllModals()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div (click)="$event.stopPropagation()" class="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button (click)="showBranchModal.set(false)" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 cursor-pointer">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 mb-4">{{ i18n.t().modalEditBranch }}</h3>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">{{ i18n.t().labelBranchName }}</label>
                <input [(ngModel)]="branchForm.name" placeholder="Bangkok Central Branch" class="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">{{ i18n.t().labelBranchCode }}</label>
                <input [(ngModel)]="branchForm.code" placeholder="BKK01" maxlength="10" class="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 uppercase outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">{{ i18n.t().labelTimezone }}</label>
                <input [(ngModel)]="branchForm.timezone" placeholder="Asia/Bangkok" class="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-6">
              <button (click)="showBranchModal.set(false)" class="h-9 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 btn-motion">{{ i18n.t().btnCancel }}</button>
              <button (click)="saveBranch()" [disabled]="!branchForm.name" class="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold btn-motion cursor-pointer">{{ i18n.t().btnSave }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal 4: Delete Confirmation Modal -->
      @if (deleteTarget(); as target) {
        <div (click)="closeAllModals()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div (click)="$event.stopPropagation()" class="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div class="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 mb-1">{{ i18n.t().confirmDeleteTitle }}</h3>
            <p class="text-xs text-slate-500 dark:text-zinc-400 mb-3">
              {{ i18n.t().confirmDeleteDesc }}
            </p>
            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 font-bold text-xs text-slate-800 dark:text-zinc-200 mb-5">
              {{ target.name }}
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button (click)="deleteTarget.set(null)" class="h-9 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 btn-motion">{{ i18n.t().btnCancel }}</button>
              <button (click)="executeDelete()" class="h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold btn-motion shadow-sm shadow-rose-500/20 cursor-pointer">{{ i18n.t().btnConfirmDelete }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal 5: Printable QR Code Stand (Service Level) -->
      @if (selectedQrService()) {
        <div (click)="closeAllModals()" class="print-dialog-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-xs">
          <div (click)="$event.stopPropagation()" class="print-dialog-card w-full max-w-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[95vh] overflow-y-auto my-auto">
            
            <!-- Modal Header (Screen only - Clean & Unobscured) -->
            <div class="no-print flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-zinc-800">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-100">{{ i18n.t().qrPreviewTitle }}</h3>
                  <p class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().qrPreviewEntranceDesc }}</p>
                </div>
              </div>
              <button 
                (click)="selectedQrService.set(null)" 
                class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Printable Authentic Signage Sheet (Clean & Premium) -->
            <div id="printArea" class="printable-sign-sheet bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 sm:p-7 text-center relative overflow-hidden shadow-xs mx-auto">
              
              <!-- Brand Header Bar -->
              <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div class="flex items-center space-x-2 text-left">
                  <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    Q
                  </div>
                  <div>
                    <div class="text-xs font-black tracking-tight text-slate-900 leading-none">QueueFlow</div>
                    <div class="text-[9px] text-slate-500 font-medium">Digital Queue System</div>
                  </div>
                </div>
                
                <div class="text-right">
                  <div class="text-xs font-bold text-slate-800 leading-tight">{{ branch()?.name }}</div>
                  <div class="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{{ branch()?.code || 'MAIN' }}</div>
                </div>
              </div>

              <!-- Main Signage Title & Service Tag -->
              <div class="space-y-1 mb-3">
                <span class="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] tracking-wider uppercase">
                  {{ i18n.t().qrBadgeEntrance }}
                </span>
                <h1 class="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-snug">
                  {{ selectedQrService()?.name }}
                </h1>
                <div class="inline-flex items-center space-x-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  <span>{{ i18n.t().qrQueueCategoryPrefix }}</span>
                  <span class="font-bold">{{ selectedQrService()?.codePrefix }}</span>
                </div>
              </div>

              <!-- Clean High-Resolution QR Canvas -->
              <div class="my-2 p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-xs">
                <img [src]="qrCodeDataUrl()" alt="Queue QR Code" class="w-48 h-48 sm:w-56 sm:h-56 mx-auto block" />
              </div>
              
              <div class="mt-2 text-xs font-bold text-slate-800 flex items-center justify-center space-x-1">
                <svg class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>{{ i18n.t().qrScanMobileNotice }}</span>
              </div>

              <!-- 3-Step Clear Customer Guidance -->
              <div class="grid grid-cols-3 gap-2 my-4 pt-3.5 border-t border-slate-100 text-center">
                <div>
                  <div class="text-xs font-black text-blue-600 mb-0.5">01</div>
                  <div class="font-bold text-[10px] text-slate-800">{{ i18n.t().step01Title }}</div>
                  <div class="text-[8px] text-slate-500">{{ i18n.t().step01Desc }}</div>
                </div>
                <div class="border-x border-slate-100">
                  <div class="text-xs font-black text-blue-600 mb-0.5">02</div>
                  <div class="font-bold text-[10px] text-slate-800">{{ i18n.t().step02Title }}</div>
                  <div class="text-[8px] text-slate-500">{{ i18n.t().step02Desc }}</div>
                </div>
                <div>
                  <div class="text-xs font-black text-blue-600 mb-0.5">03</div>
                  <div class="font-bold text-[10px] text-slate-800">{{ i18n.t().step03Title }}</div>
                  <div class="text-[8px] text-slate-500">{{ i18n.t().step03Desc }}</div>
                </div>
              </div>

              <!-- Footer Verification & No App Download Notice -->
              <div class="pt-1 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                <span>{{ i18n.t().qrNoAppRequired }}</span>
                <span class="font-mono">QueueFlow System</span>
              </div>

            </div>

            <!-- Print Action Buttons (Screen only) -->
            <div class="no-print grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button 
                (click)="selectedQrService.set(null)" 
                class="h-10 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 btn-motion cursor-pointer">
                {{ i18n.t().btnCancel }}
              </button>
              <button 
                (click)="printStand()" 
                class="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold btn-motion inline-flex items-center justify-center space-x-2 shadow-sm cursor-pointer">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>{{ i18n.t().btnPrintAction }}</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- Modal 6: Printable Counter QR Stand (Desk Level) -->
      @if (selectedQrCounter(); as counter) {
        <div (click)="closeAllModals()" class="print-dialog-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-xs">
          <div (click)="$event.stopPropagation()" class="print-dialog-card w-full max-w-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[95vh] overflow-y-auto my-auto">
            
            <!-- Modal Header (Screen only - Clean & Unobscured) -->
            <div class="no-print flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-zinc-800">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-100">{{ i18n.t().qrPreviewTitle }}</h3>
                  <p class="text-[11px] text-slate-500 dark:text-zinc-400">{{ i18n.t().qrPreviewDeskDesc }}</p>
                </div>
              </div>
              <button 
                (click)="selectedQrCounter.set(null)" 
                class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Printable Authentic Signage Sheet (Clean & Premium) -->
            <div id="printArea" class="printable-sign-sheet bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 sm:p-7 text-center relative overflow-hidden shadow-xs mx-auto">
              
              <!-- Brand Header Bar -->
              <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div class="flex items-center space-x-2 text-left">
                  <div class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    Q
                  </div>
                  <div>
                    <div class="text-xs font-black tracking-tight text-slate-900 leading-none">QueueFlow</div>
                    <div class="text-[9px] text-slate-500 font-medium">Digital Queue System</div>
                  </div>
                </div>
                
                <div class="text-right">
                  <div class="text-xs font-bold text-slate-800 leading-tight">{{ branch()?.name }}</div>
                  <div class="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{{ branch()?.code || 'MAIN' }}</div>
                </div>
              </div>

              <!-- Main Signage Title & Service Tag -->
              <div class="space-y-1 mb-3">
                <span class="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] tracking-wider uppercase">
                  {{ i18n.t().qrBadgeDesk }}
                </span>
                <h1 class="text-3xl font-black text-slate-950 tracking-tight leading-snug">
                  {{ counter.name }}
                </h1>
                <div class="text-xs font-bold text-slate-600">
                  {{ counter.assignedServiceName }}
                </div>
                <div class="inline-flex items-center space-x-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  <span>{{ i18n.t().deskNumberPrefix }} {{ counter.counterNumber }}</span>
                  <span>•</span>
                  <span>{{ i18n.t().categoryPrefix }} {{ counter.assignedServicePrefix }}</span>
                </div>
              </div>

              <!-- Clean High-Resolution QR Canvas -->
              <div class="my-2 p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-xs">
                <img [src]="counterQrCodeDataUrl()" alt="Counter Desk QR Code" class="w-48 h-48 sm:w-56 sm:h-56 mx-auto block" />
              </div>
              
              <div class="mt-2 text-xs font-bold text-slate-800 flex items-center justify-center space-x-1">
                <svg class="w-3.5 h-3.5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>{{ i18n.t().qrScanDeskNotice }}</span>
              </div>

              <!-- 3-Step Clear Customer Guidance -->
              <div class="grid grid-cols-3 gap-2 my-4 pt-3.5 border-t border-slate-100 text-center">
                <div>
                  <div class="text-xs font-black text-indigo-600 mb-0.5">01</div>
                  <div class="font-bold text-[10px] text-slate-800">{{ i18n.t().step01Title }}</div>
                  <div class="text-[8px] text-slate-500">{{ i18n.t().step01Desc }}</div>
                </div>
                <div class="border-x border-slate-100">
                  <div class="text-xs font-black text-indigo-600 mb-0.5">02</div>
                  <div class="font-bold text-[10px] text-slate-800">{{ i18n.t().step02Title }}</div>
                  <div class="text-[8px] text-slate-500">{{ i18n.t().step02DeskDesc }}</div>
                </div>
                <div>
                  <div class="text-xs font-black text-indigo-600 mb-0.5">03</div>
                  <div class="font-bold text-[10px] text-slate-800">{{ i18n.t().step03Title }}</div>
                  <div class="text-[8px] text-slate-500">{{ i18n.t().step03DeskDesc }}</div>
                </div>
              </div>

              <!-- Footer Verification & No App Download Notice -->
              <div class="pt-1 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                <span>{{ i18n.t().qrNoAppRequired }}</span>
                <span class="font-mono">QueueFlow Desk System</span>
              </div>

            </div>

            <!-- Print Action Buttons (Screen only) -->
            <div class="no-print grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button 
                (click)="selectedQrCounter.set(null)" 
                class="h-10 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 btn-motion cursor-pointer">
                {{ i18n.t().btnCancel }}
              </button>
              <button 
                (click)="printStand()" 
                class="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold btn-motion inline-flex items-center justify-center space-x-2 shadow-sm cursor-pointer">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>{{ i18n.t().btnPrintAction }}</span>
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class BranchManagementComponent implements OnInit {
  private http = inject(HttpClient);
  public i18n = inject(TranslationService);
  public signalR = inject(SignalRService);
  private api = inject(ApiConfigService);

  branch = signal<any>(null);

  // Modals & State
  showServiceModal = signal<boolean>(false);
  showCounterModal = signal<boolean>(false);
  showBranchModal = signal<boolean>(false);
  editingServiceId = signal<string | null>(null);
  editingCounterId = signal<string | null>(null);
  deleteTarget = signal<{ type: 'service' | 'counter'; id: string; name: string } | null>(null);
  toastMessage = signal<{ text: string; isError: boolean } | null>(null);

  selectedQrService = signal<any>(null);
  qrCodeDataUrl = signal<string>('');
  selectedQrCounter = signal<any>(null);
  counterQrCodeDataUrl = signal<string>('');
  activeCounterDropdownId = signal<string | null>(null);
  isCounterModalDropdownOpen = signal<boolean>(false);

  @HostListener('document:click')
  onDocumentClick() {
    if (this.activeCounterDropdownId()) {
      this.activeCounterDropdownId.set(null);
    }
    if (this.isCounterModalDropdownOpen()) {
      this.isCounterModalDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.closeAllModals();
  }

  closeAllModals() {
    this.showServiceModal.set(false);
    this.showCounterModal.set(false);
    this.showBranchModal.set(false);
    this.deleteTarget.set(null);
    this.selectedQrService.set(null);
    this.selectedQrCounter.set(null);
    this.activeCounterDropdownId.set(null);
    this.isCounterModalDropdownOpen.set(false);
  }

  toggleDropdown(counterId: string, event: Event) {
    event.stopPropagation();
    if (this.activeCounterDropdownId() === counterId) {
      this.activeCounterDropdownId.set(null);
    } else {
      this.activeCounterDropdownId.set(counterId);
    }
  }

  selectCounterService(counterId: string, serviceId: string) {
    this.updateCounterService(counterId, serviceId);
    this.activeCounterDropdownId.set(null);
  }

  toggleModalDropdown(event: Event) {
    event.stopPropagation();
    this.isCounterModalDropdownOpen.set(!this.isCounterModalDropdownOpen());
  }

  selectModalService(serviceId: string | null) {
    this.counterForm.assignedServiceId = serviceId;
    this.isCounterModalDropdownOpen.set(false);
  }

  getSelectedModalService(): any {
    if (!this.counterForm.assignedServiceId) return null;
    return this.branch()?.services?.find((s: any) => s.id === this.counterForm.assignedServiceId) || null;
  }

  getBoundCounterCount(): number {
    return this.branch()?.counters?.filter((c: any) => !!c.assignedServiceId)?.length || 0;
  }

  getActiveServiceCount(): number {
    return this.branch()?.services?.filter((s: any) => s.isActive !== false)?.length || 0;
  }

  getActiveCounterCount(): number {
    return this.branch()?.counters?.filter((c: any) => c.isActive !== false)?.length || 0;
  }

  // Prefix & Counter Auto-naming & Uniqueness Logic
  getNextAvailablePrefix(): string {
    const existing = new Set((this.branch()?.services || []).map((s: any) => s.codePrefix?.toUpperCase()));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const ch of alphabet) {
      if (!existing.has(ch)) return ch;
    }
    return '';
  }

  isPrefixDuplicate(): boolean {
    const prefix = this.serviceForm.codePrefix?.trim().toUpperCase();
    if (!prefix) return false;
    const services = this.branch()?.services || [];
    return services.some((s: any) => s.codePrefix?.toUpperCase() === prefix && s.id !== this.editingServiceId());
  }

  getNextCounterNumber(): number {
    const counters = this.branch()?.counters || [];
    if (counters.length === 0) return 1;
    const maxNum = Math.max(...counters.map((c: any) => c.counterNumber || 0));
    return maxNum + 1;
  }

  isCounterNumberDuplicate(): boolean {
    const num = this.counterForm.counterNumber;
    if (!num) return false;
    const counters = this.branch()?.counters || [];
    return counters.some((c: any) => c.counterNumber === num && c.id !== this.editingCounterId());
  }

  onCounterNumberChange() {
    const num = this.counterForm.counterNumber;
    if (num && (!this.counterForm.name || /^Counter \d+$/i.test(this.counterForm.name.trim()) || /^โต๊ะบริการ \d+$/i.test(this.counterForm.name.trim()) || /^ช่องบริการ \d+$/i.test(this.counterForm.name.trim()))) {
      this.counterForm.name = `Counter ${num}`;
    }
  }

  // Form states
  serviceForm = {
    name: '',
    codePrefix: 'A',
    duration: 5,
    isActive: true
  };

  counterForm = {
    name: '',
    counterNumber: 1,
    assignedServiceId: null as string | null
  };

  branchForm = {
    name: '',
    code: '',
    timezone: 'Asia/Bangkok'
  };

  constructor() {
    effect(() => {
      const evt = this.signalR.lastEvent();
      if (evt && evt.type === 'QueueUpdated') {
        this.loadBranchData();
      }
    });
  }

  ngOnInit() {
    this.loadBranchData();
  }

  showToast(text: string, isError = false) {
    this.toastMessage.set({ text, isError });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  loadBranchData() {
    this.http.get<any[]>(this.api.url('/api/branches?all=true')).subscribe({
      next: (branches) => {
        if (branches.length > 0) {
          const b = branches[0];
          this.branch.set(b);
          this.signalR.startConnection().then(() => {
            this.signalR.joinBranch(b.id);
          });
        }
      }
    });
  }

  // --- SERVICE CRUD ---
  openServiceModal() {
    this.editingServiceId.set(null);
    this.serviceForm = {
      name: '',
      codePrefix: this.getNextAvailablePrefix(),
      duration: 5,
      isActive: true
    };
    this.showServiceModal.set(true);
  }

  openEditServiceModal(service: any) {
    this.editingServiceId.set(service.id);
    this.serviceForm = {
      name: service.name,
      codePrefix: service.codePrefix,
      duration: service.defaultServiceDurationMinutes || 5,
      isActive: service.isActive !== false
    };
    this.showServiceModal.set(true);
  }

  saveService() {
    if (!this.branch() || !this.serviceForm.name || !this.serviceForm.codePrefix) return;

    if (this.isPrefixDuplicate()) {
      this.showToast(this.i18n.t().toastPrefixDuplicate, true);
      return;
    }

    if (this.editingServiceId()) {
      const payload = {
        name: this.serviceForm.name,
        codePrefix: this.serviceForm.codePrefix.trim().toUpperCase(),
        defaultServiceDurationMinutes: this.serviceForm.duration || 5,
        isActive: this.serviceForm.isActive
      };
      this.http.put(this.api.url(`/api/admin/services/${this.editingServiceId()}`), payload).subscribe({
        next: () => {
          this.showServiceModal.set(false);
          this.showToast(this.i18n.t().toastServiceUpdated);
          this.loadBranchData();
        },
        error: (err) => {
          const msg = err.error?.message || this.i18n.t().toastServiceUpdateFailed;
          this.showToast(msg, true);
        }
      });
    } else {
      const payload = {
        branchId: this.branch().id,
        name: this.serviceForm.name,
        codePrefix: this.serviceForm.codePrefix.trim().toUpperCase(),
        defaultServiceDurationMinutes: this.serviceForm.duration || 5
      };
      this.http.post(this.api.url('/api/admin/services'), payload).subscribe({
        next: () => {
          this.showServiceModal.set(false);
          this.showToast(this.i18n.t().toastServiceCreated);
          this.loadBranchData();
        },
        error: (err) => {
          const msg = err.error?.message || this.i18n.t().toastServiceCreateFailed;
          this.showToast(msg, true);
        }
      });
    }
  }

  toggleServiceStatus(target: any) {
    const serviceId = typeof target === 'string' ? target : target?.id;
    const serviceName = typeof target === 'object' ? target?.name : 'Service';
    this.http.patch(this.api.url(`/api/admin/services/${serviceId}/toggle-active`), {}).subscribe({
      next: () => {
        this.showToast(`${this.i18n.t().toastServiceStatusUpdated} (${serviceName})`);
        this.loadBranchData();
      },
      error: (err) => {
        const msg = err.error?.message || this.i18n.t().toastServiceStatusFailed;
        this.showToast(msg, true);
      }
    });
  }

  // --- COUNTER CRUD ---
  openCounterModal() {
    this.editingCounterId.set(null);
    this.isCounterModalDropdownOpen.set(false);
    const nextNum = this.getNextCounterNumber();
    this.counterForm = {
      name: `Counter ${nextNum}`,
      counterNumber: nextNum,
      assignedServiceId: null
    };
    this.showCounterModal.set(true);
  }

  openEditCounterModal(counter: any) {
    this.editingCounterId.set(counter.id);
    this.isCounterModalDropdownOpen.set(false);
    this.counterForm = {
      name: counter.name,
      counterNumber: counter.counterNumber,
      assignedServiceId: counter.assignedServiceId || null
    };
    this.showCounterModal.set(true);
  }

  saveCounter() {
    if (!this.branch() || !this.counterForm.name || !this.counterForm.counterNumber) return;

    if (this.isCounterNumberDuplicate()) {
      this.showToast(this.i18n.t().toastCounterDuplicate, true);
      return;
    }

    if (this.editingCounterId()) {
      const payload = {
        name: this.counterForm.name,
        counterNumber: this.counterForm.counterNumber,
        assignedServiceId: this.counterForm.assignedServiceId
      };
      this.http.put(this.api.url(`/api/admin/counters/${this.editingCounterId()}`), payload).subscribe({
        next: () => {
          this.showCounterModal.set(false);
          this.showToast(this.i18n.t().toastCounterUpdated);
          this.loadBranchData();
        },
        error: (err) => {
          const msg = err.error?.message || this.i18n.t().toastCounterUpdateFailed;
          this.showToast(msg, true);
        }
      });
    } else {
      const payload = {
        branchId: this.branch().id,
        name: this.counterForm.name,
        counterNumber: this.counterForm.counterNumber,
        assignedServiceId: this.counterForm.assignedServiceId
      };
      this.http.post(this.api.url('/api/admin/counters'), payload).subscribe({
        next: () => {
          this.showCounterModal.set(false);
          this.showToast(this.i18n.t().toastCounterCreated);
          this.loadBranchData();
        },
        error: (err) => {
          const msg = err.error?.message || this.i18n.t().toastCounterCreateFailed;
          this.showToast(msg, true);
        }
      });
    }
  }

  toggleCounterStatus(target: any) {
    const counterId = typeof target === 'string' ? target : target?.id;
    const counterName = typeof target === 'object' ? target?.name : 'Counter';
    this.http.patch(this.api.url(`/api/admin/counters/${counterId}/toggle-active`), {}).subscribe({
      next: () => {
        this.showToast(`${this.i18n.t().toastCounterStatusUpdated} (${counterName})`);
        this.loadBranchData();
      },
      error: (err) => {
        const msg = err.error?.message || this.i18n.t().toastCounterStatusFailed;
        this.showToast(msg, true);
      }
    });
  }

  // --- BRANCH CRUD ---
  openEditBranchModal() {
    if (!this.branch()) return;
    this.branchForm = {
      name: this.branch().name || '',
      code: this.branch().code || '',
      timezone: this.branch().timezone || 'Asia/Bangkok'
    };
    this.showBranchModal.set(true);
  }

  saveBranch() {
    if (!this.branch() || !this.branchForm.name) return;
    const payload = {
      name: this.branchForm.name,
      code: this.branchForm.code,
      timezone: this.branchForm.timezone
    };
    this.http.put(this.api.url(`/api/admin/branches/${this.branch().id}`), payload).subscribe({
      next: () => {
        this.showBranchModal.set(false);
        this.showToast(this.i18n.t().toastBranchUpdated);
        this.loadBranchData();
      },
      error: (err) => {
        const msg = err.error?.message || this.i18n.t().toastBranchUpdateFailed;
        this.showToast(msg, true);
      }
    });
  }

  // --- DELETION ---
  confirmDelete(type: 'service' | 'counter', id: string, name: string) {
    this.deleteTarget.set({ type, id, name });
  }

  executeDelete() {
    const target = this.deleteTarget();
    if (!target) return;

    const url = target.type === 'service'
      ? this.api.url(`/api/admin/services/${target.id}`)
      : this.api.url(`/api/admin/counters/${target.id}`);

    this.http.delete(url).subscribe({
      next: () => {
        this.deleteTarget.set(null);
        this.showToast(`${this.i18n.t().toastDeleteSuccess} (${target.name})`);
        this.loadBranchData();
      },
      error: (err) => {
        const msg = err.error?.message || this.i18n.t().toastDeleteFailed;
        this.showToast(msg, true);
        this.deleteTarget.set(null);
      }
    });
  }

  showServiceQr(service: any) {
    this.selectedQrService.set(service);
    // Direct QR link pointing to Customer join with direct serviceId
    const intakeUrl = `${window.location.origin}/queue/join?serviceId=${service.id}`;

    QRCode.toDataURL(intakeUrl, {
      width: 600,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(url => {
      this.qrCodeDataUrl.set(url);
    });
  }

  updateCounterService(counterId: string, serviceId: string) {
    const payload = { assignedServiceId: serviceId ? serviceId : null };
    this.http.put(this.api.url(`/api/admin/counters/${counterId}/service`), payload).subscribe({
      next: () => {
        this.loadBranchData();
      }
    });
  }

  showCounterQr(counter: any) {
    let targetServiceId = counter.assignedServiceId;
    if (!targetServiceId && this.branch()?.services?.length > 0) {
      targetServiceId = this.branch().services[0].id;
    }
    const matchedService = this.branch()?.services?.find((s: any) => s.id === targetServiceId);

    const counterWithService = {
      ...counter,
      targetServiceId: targetServiceId,
      assignedServiceName: matchedService?.name || counter.assignedServiceName || 'General Consultation',
      assignedServicePrefix: matchedService?.codePrefix || counter.assignedServicePrefix || 'A'
    };
    
    this.selectedQrCounter.set(counterWithService);
    const intakeUrl = `${window.location.origin}/queue/join?serviceId=${targetServiceId || ''}&counterId=${counter.id}`;

    QRCode.toDataURL(intakeUrl, {
      width: 600,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(url => {
      this.counterQrCodeDataUrl.set(url);
    });
  }

  printStand() {
    window.print();
  }
}
