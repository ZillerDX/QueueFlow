import { Component, signal, inject, OnInit, OnDestroy, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { SignalRService } from '../../core/services/signalr.service';
import { TvConfigService } from '../../core/services/tv-config.service';
import { ApiConfigService } from '../../core/services/api-config.service';

@Component({
  selector: 'app-main-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Dedicated Light Mode Root Container (Full Screen 16:9 Display) -->
    <div class="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none overflow-hidden">
      
      <!-- Clean Header: No Logo, No 'TV DISPLAY' text, No Audio Pill -->
      <header class="relative h-20 px-6 sm:px-10 bg-white/95 border-b border-slate-200/90 flex items-center justify-between backdrop-blur-md shrink-0 shadow-xs">
        
        <!-- Left: Branch Name & Operational Subtitle (Zero Logo, Zero 'TV DISPLAY') -->
        <div class="z-10">
          <h1 class="text-2xl font-black tracking-tight text-slate-900">
            {{ branch()?.name || 'QueueFlow' }}
          </h1>
          <div class="text-xs text-slate-500 font-semibold flex items-center space-x-2 mt-0.5">
            <span>{{ i18n.t().allCountersReady }}</span>
            <span class="text-slate-300">•</span>
            <span class="text-slate-500 font-medium">{{ getLayoutTitle() }}</span>
          </div>
        </div>

        <!-- Center: Real-Time Digital Clock & Date (Fixed Dead Center) -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none text-center z-0">
          <div class="font-mono text-3xl font-black tracking-wider text-slate-900">
            {{ currentTime() }}
          </div>
          <div class="text-xs text-slate-500 font-medium tracking-wide">
            {{ currentDate() }}
          </div>
        </div>

        <!-- Right: Actions (Hidden completely when in Fullscreen - Exit via ESC only) -->
        <div class="flex items-center space-x-2.5 z-10 min-h-[40px]">
          @if (!isFullscreen()) {
            <!-- Settings Gear Button (Opens Pop-up Modal to Reconfigure Layout/Voice) -->
            <button 
              type="button"
              (click)="tvConfig.openModal()"
              class="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center space-x-2"
              title="Configure TV Display">
              <svg class="w-4 h-4 shrink-0 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="hidden sm:inline">{{ i18n.t().tvSettings }}</span>
            </button>

            <!-- Fullscreen Button -->
            <button 
              type="button"
              (click)="toggleFullscreen()"
              class="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center transition-all"
              title="Fullscreen">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            <!-- Return to Management / Staff Desk -->
            <button 
              type="button"
              (click)="exitDisplay()"
              class="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center transition-all"
              title="Exit TV Screen">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        </div>
      </header>

      <!-- ========================================== -->
      <!-- LAYOUT 1: GRID BENTO                       -->
      <!-- ========================================== -->
      @if (tvConfig.config().layout === 'bento') {
        <main class="flex-1 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          
          <!-- Left 8 Columns: Now Serving Counters Grid -->
          <section class="lg:col-span-8 flex flex-col space-y-4 overflow-hidden">
            <div class="flex items-center justify-between px-2">
              <div class="flex items-center space-x-2">
                <svg class="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h2 class="text-lg font-black uppercase tracking-wider text-slate-900">
                  {{ i18n.t().nowServing }}
                </h2>
              </div>
              <span class="text-xs font-semibold text-slate-500">
                {{ counters().length }} {{ i18n.t().countersCountSuffix }}
              </span>
            </div>

            <!-- Bento Counters Grid -->
            <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 overflow-y-auto">
              @for (counter of counters(); track counter.id) {
                <div 
                  class="rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between border relative overflow-hidden shadow-xs"
                  [ngClass]="callingCounterId() === counter.id 
                    ? 'bg-blue-50/70 border-blue-500 shadow-md' 
                    : 'bg-white border-slate-200/90 hover:border-slate-300'">

                  <!-- Counter Station Header -->
                  <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-3.5">
                      <span class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                        {{ counter.counterNumber }}
                      </span>
                      <div>
                        <div class="text-xl font-black text-slate-900 tracking-tight">
                          {{ counter.name }}
                        </div>
                        <div class="text-xs text-slate-500 font-semibold">
                          {{ i18n.t().counterLabel }} {{ counter.counterNumber }}
                        </div>
                      </div>
                    </div>

                    <!-- Status Pill -->
                    @if (counter.servingTicketNumber) {
                      <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 flex items-center space-x-1.5 shadow-xs">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                        <span>{{ i18n.t().statusServing }}</span>
                      </span>
                    } @else {
                      <span class="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {{ i18n.t().counterAvailable }}
                      </span>
                    }
                  </div>

                  <!-- Central Big Ticket Display -->
                  <div class="py-6 flex flex-col items-center justify-center text-center">
                    @if (counter.servingTicketNumber) {
                      <span class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        {{ i18n.t().yourTicketNumber }}
                      </span>
                      <div 
                        class="text-6xl sm:text-7xl font-black tracking-tight font-mono transition-colors"
                        [ngClass]="callingCounterId() === counter.id ? 'text-blue-600' : 'text-slate-900'">
                        {{ counter.servingTicketNumber }}
                      </div>
                      @if (counter.currentTicket?.serviceName) {
                        <div class="mt-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                          {{ counter.currentTicket.serviceName }}
                        </div>
                      }
                    } @else {
                      <div class="py-5 flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span class="text-sm font-semibold text-slate-400">{{ i18n.t().deskReady }}</span>
                      </div>
                    }
                  </div>

                  <!-- Footer Station Info -->
                  <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>{{ i18n.t().servingAtCounter }} {{ counter.name }}</span>
                    <span class="font-bold text-slate-700">{{ counter.counterNumber }}</span>
                  </div>

                </div>
              }
            </div>
          </section>

          <!-- Right 4 Columns: Waiting Queue List -->
          <section class="lg:col-span-4 flex flex-col space-y-4 overflow-hidden">
            <div class="flex items-center justify-between px-2">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 class="text-lg font-black uppercase tracking-wider text-slate-900">
                  {{ i18n.t().nextInLine }}
                </h2>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
                {{ waitingTickets().length }} {{ i18n.t().waitingTicketsCount }}
              </span>
            </div>

            <div class="flex-1 bg-white border border-slate-200/90 rounded-3xl p-5 overflow-y-auto flex flex-col space-y-3 shadow-sm">
              @if (waitingTickets().length === 0) {
                <div class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                    <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-700 text-base">{{ i18n.t().emptyWaitingList }}</h3>
                    <p class="text-xs text-slate-400 mt-1">{{ i18n.t().allCountersReady }}</p>
                  </div>
                </div>
              } @else {
                @for (ticket of waitingTickets(); track ticket.id; let idx = $index) {
                  <div 
                    class="p-4 rounded-2xl border transition-all flex items-center justify-between"
                    [ngClass]="idx === 0 ? 'bg-amber-50/70 border-amber-200 shadow-xs' : 'bg-slate-50 border-slate-200/70'">
                    
                    <div class="flex items-center space-x-3.5">
                      <span 
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                        [ngClass]="idx === 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'">
                        {{ idx + 1 }}
                      </span>
                      <div>
                        <div class="text-2xl font-black font-mono tracking-tight text-slate-900">
                          {{ ticket.ticketNumber }}
                        </div>
                        <div class="text-xs text-slate-500 font-medium">
                          {{ ticket.serviceName }}
                        </div>
                      </div>
                    </div>

                    <div class="text-right">
                      <span class="text-xs font-bold text-slate-600 block">
                        ~{{ ticket.estimatedWaitMinutes || 3 }} {{ i18n.t().estWaitSuffix }}
                      </span>
                      @if (idx === 0) {
                        <span class="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          {{ i18n.t().nextBadge }}
                        </span>
                      }
                    </div>

                  </div>
                }
              }
            </div>

            <!-- Wait Time Summary Footer -->
            <div class="h-14 rounded-2xl bg-white border border-slate-200 px-5 flex items-center justify-between shadow-xs">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {{ i18n.t().avgWaitTime }}
              </span>
              <span class="text-base font-black text-slate-900 font-mono">
                ~{{ avgWaitTime() }} {{ i18n.t().estWaitSuffix }}
              </span>
            </div>

          </section>

        </main>
      }

      <!-- ========================================== -->
      <!-- LAYOUT 2: FOCUSED HERO                     -->
      <!-- ========================================== -->
      @if (tvConfig.config().layout === 'focused') {
        <main class="flex-1 p-6 lg:p-8 flex flex-col space-y-6 overflow-hidden">
          
          <!-- Top Hero Section: Latest / Currently Calling Ticket -->
          <section class="h-64 sm:h-72 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white p-8 shadow-xl flex flex-col justify-between relative overflow-hidden shrink-0">
            <!-- Background pulse circles -->
            <div class="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl"></div>
            <div class="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-blue-400/20 blur-2xl"></div>

            <div class="relative z-10 flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs flex items-center space-x-2">
                  <span class="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
                  <span>{{ i18n.t().callAlertTitle }}</span>
                </span>
                <span class="text-sm font-semibold text-blue-100">
                  {{ latestCalledTicket() ? (latestCalledTicket()?.serviceName || 'General Service') : i18n.t().allCountersReady }}
                </span>
              </div>
              <div class="text-xs font-bold text-blue-200">
                FOCUSED HERO MODE
              </div>
            </div>

            <!-- Big Center Hero Ticket -->
            <div class="relative z-10 flex flex-col items-center justify-center my-auto text-center">
              @if (latestCalledTicket()) {
                <div class="text-7xl sm:text-8xl md:text-9xl font-black font-mono tracking-tighter text-white drop-shadow-md animate-pulse">
                  {{ latestCalledTicket()?.ticketNumber }}
                </div>
                <div class="mt-2 text-xl sm:text-2xl font-black text-amber-300 tracking-wide flex items-center space-x-2">
                  <span>{{ i18n.t().servingAtCounter }}</span>
                  <span class="underline decoration-4 decoration-amber-400">
                    {{ latestCalledCounterName() }}
                  </span>
                </div>
              } @else {
                <div class="text-5xl sm:text-6xl font-black text-white/90">
                  {{ i18n.t().deskReady }}
                </div>
                <div class="mt-2 text-base text-blue-100">
                  {{ i18n.t().allCountersReady }}
                </div>
              }
            </div>

            <div class="relative z-10 flex items-center justify-between text-xs text-blue-100 font-semibold">
              <span>{{ branch()?.name }}</span>
              <span>{{ i18n.t().waitingInSystem }}: {{ waitingTickets().length }} {{ i18n.t().queueSuffix }}</span>
            </div>
          </section>

          <!-- Bottom Split Section: Secondary Counters + Waiting Queue -->
          <section class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
            
            <!-- Other Counters -->
            <div class="lg:col-span-8 flex flex-col space-y-3 overflow-hidden">
              <h3 class="text-sm font-black uppercase text-slate-800 tracking-wider">
                {{ i18n.t().allCountersTitle }}
              </h3>
              <div class="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto">
                @for (counter of counters(); track counter.id) {
                  <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                      <span class="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                        {{ counter.counterNumber }}
                      </span>
                      <span class="text-xs font-bold text-slate-500 truncate max-w-[100px]">
                        {{ counter.name }}
                      </span>
                    </div>
                    <div class="py-3 text-center">
                      @if (counter.servingTicketNumber) {
                        <div class="text-3xl font-black font-mono text-blue-600">
                          {{ counter.servingTicketNumber }}
                        </div>
                      } @else {
                        <div class="text-xs font-semibold text-slate-400">
                          {{ i18n.t().counterAvailable }}
                        </div>
                      }
                    </div>
                    <div class="text-[11px] text-slate-400 text-center font-medium">
                      {{ counter.servingTicketNumber ? i18n.t().statusServing : i18n.t().deskReady }}
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Waiting Queue Side Panel -->
            <div class="lg:col-span-4 flex flex-col space-y-3 overflow-hidden">
              <h3 class="text-sm font-black uppercase text-slate-800 tracking-wider">
                {{ i18n.t().nextInLine }} ({{ waitingTickets().length }})
              </h3>
              <div class="flex-1 bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto space-y-2.5 shadow-xs">
                @for (ticket of waitingTickets(); track ticket.id; let idx = $index) {
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                    <div class="flex items-center space-x-2.5">
                      <span class="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                        {{ idx + 1 }}
                      </span>
                      <span class="font-mono font-black text-lg text-slate-900">{{ ticket.ticketNumber }}</span>
                    </div>
                    <span class="text-xs text-slate-500 font-semibold">{{ ticket.serviceName }}</span>
                  </div>
                }
              </div>
            </div>

          </section>

        </main>
      }

      <!-- ========================================== -->
      <!-- LAYOUT 3: SPLIT BANK TABLE                 -->
      <!-- ========================================== -->
      @if (tvConfig.config().layout === 'split') {
        <main class="flex-1 p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
          
          <!-- Column 1: Now Serving Table -->
          <section class="flex flex-col rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
            <!-- Table Header Bar -->
            <div class="p-5 bg-blue-600 text-white flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                <h2 class="text-lg font-black uppercase tracking-wider">
                  {{ i18n.t().nowServing }}
                </h2>
              </div>
              <span class="text-xs font-bold text-blue-100">
                NOW SERVING
              </span>
            </div>

            <!-- Table Columns Subheader -->
            <div class="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <div class="col-span-4">{{ i18n.t().counterLabel }}</div>
              <div class="col-span-5 text-center">{{ i18n.t().yourTicketNumber }}</div>
              <div class="col-span-3 text-right">{{ i18n.t().colStatus }}</div>
            </div>

            <!-- Table Body -->
            <div class="flex-1 overflow-y-auto divide-y divide-slate-100">
              @for (counter of counters(); track counter.id) {
                <div 
                  class="grid grid-cols-12 px-6 py-4 items-center transition-all"
                  [ngClass]="callingCounterId() === counter.id ? 'bg-blue-50/90 font-bold border-l-4 border-l-blue-600' : 'hover:bg-slate-50/60'">
                  <!-- Col 1: Counter Info -->
                  <div class="col-span-4 flex items-center space-x-3">
                    <span class="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center shadow-xs">
                      {{ counter.counterNumber }}
                    </span>
                    <div>
                      <div class="text-sm font-bold text-slate-900 leading-tight">{{ counter.name }}</div>
                      <div class="text-[11px] text-slate-400">{{ i18n.t().counterLabel }} {{ counter.counterNumber }}</div>
                    </div>
                  </div>

                  <!-- Col 2: Ticket Number -->
                  <div class="col-span-5 text-center">
                    @if (counter.servingTicketNumber) {
                      <span 
                        class="text-4xl font-black font-mono tracking-tight"
                        [ngClass]="callingCounterId() === counter.id ? 'text-blue-600 animate-pulse' : 'text-slate-900'">
                        {{ counter.servingTicketNumber }}
                      </span>
                    } @else {
                      <span class="text-sm font-semibold text-slate-400">
                        {{ i18n.t().counterAvailable }}
                      </span>
                    }
                  </div>

                  <!-- Col 3: Status Badge -->
                  <div class="col-span-3 text-right">
                    @if (counter.servingTicketNumber) {
                      <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        {{ i18n.t().statusServing }}
                      </span>
                    } @else {
                      <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                        {{ i18n.t().counterAvailable }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Column 2: Waiting Queue Table -->
          <section class="flex flex-col rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
            <!-- Table Header Bar -->
            <div class="p-5 bg-slate-800 text-white flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 class="text-lg font-black uppercase tracking-wider">
                  {{ i18n.t().nextInLine }}
                </h2>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-700 text-white">
                {{ waitingTickets().length }} {{ i18n.t().queueSuffix }}
              </span>
            </div>

            <!-- Table Columns Subheader -->
            <div class="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <div class="col-span-3">{{ i18n.t().colOrderQueue }}</div>
              <div class="col-span-6">{{ i18n.t().colService }}</div>
              <div class="col-span-3 text-right">{{ i18n.t().colWait }}</div>
            </div>

            <!-- Table Body -->
            <div class="flex-1 overflow-y-auto divide-y divide-slate-100">
              @if (waitingTickets().length === 0) {
                <div class="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span class="font-bold text-slate-600">{{ i18n.t().emptyWaitingList }}</span>
                </div>
              } @else {
                @for (ticket of waitingTickets(); track ticket.id; let idx = $index) {
                  <div 
                    class="grid grid-cols-12 px-6 py-3.5 items-center transition-all"
                    [ngClass]="idx === 0 ? 'bg-amber-50/50' : 'hover:bg-slate-50/50'">
                    <!-- Col 1: Queue # -->
                    <div class="col-span-3 flex items-center space-x-2">
                      <span class="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {{ idx + 1 }}
                      </span>
                      <span class="text-xl font-black font-mono text-slate-900">{{ ticket.ticketNumber }}</span>
                    </div>

                    <!-- Col 2: Service -->
                    <div class="col-span-6 text-sm font-semibold text-slate-700 truncate pr-2">
                      {{ ticket.serviceName }}
                    </div>

                    <!-- Col 3: Wait Time -->
                    <div class="col-span-3 text-right text-xs font-bold text-slate-500">
                      ~{{ ticket.estimatedWaitMinutes || 3 }} {{ i18n.t().estWaitSuffix }}
                    </div>
                  </div>
                }
              }
            </div>
          </section>

        </main>
      }

      <!-- ========================================== -->
      <!-- LAYOUT 4: HORIZONTAL TICKER                -->
      <!-- ========================================== -->
      @if (tvConfig.config().layout === 'ticker') {
        <main class="flex-1 p-6 lg:p-8 flex flex-col space-y-6 overflow-hidden">
          
          <!-- Top Horizontal Counters Ribbon -->
          <section class="flex flex-col space-y-3 shrink-0">
            <div class="flex items-center justify-between px-2">
              <h2 class="text-sm font-black uppercase text-slate-800 tracking-wider">
                {{ i18n.t().allCountersTitle }}
              </h2>
              <span class="text-xs font-semibold text-slate-500">
                {{ counters().length }} {{ i18n.t().countersCountSuffix }}
              </span>
            </div>

            <!-- Horizontal Scroll/Grid Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              @for (counter of counters(); track counter.id) {
                <div 
                  class="rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-xs"
                  [ngClass]="callingCounterId() === counter.id 
                    ? 'bg-blue-50/80 border-blue-500 shadow-md' 
                    : 'bg-white border-slate-200'">
                  <div class="flex items-center justify-between">
                    <span class="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center">
                      {{ counter.counterNumber }}
                    </span>
                    <span class="text-xs font-bold text-slate-600 truncate max-w-[120px]">
                      {{ counter.name }}
                    </span>
                  </div>
                  <div class="py-4 text-center">
                    @if (counter.servingTicketNumber) {
                      <div class="text-5xl font-black font-mono text-blue-600">
                        {{ counter.servingTicketNumber }}
                      </div>
                      <div class="text-xs font-bold text-slate-500 mt-1">
                        {{ counter.currentTicket?.serviceName || 'Service' }}
                      </div>
                    } @else {
                      <div class="text-sm font-semibold text-slate-400 py-3">
                        {{ i18n.t().counterAvailable }}
                      </div>
                    }
                  </div>
                  <div class="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider pt-2 border-t border-slate-100">
                    {{ counter.servingTicketNumber ? i18n.t().statusServing : i18n.t().counterAvailable }}
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Middle Waiting Tickets Grid -->
          <section class="flex-1 flex flex-col space-y-3 overflow-hidden">
            <div class="flex items-center justify-between px-2">
              <h2 class="text-sm font-black uppercase text-slate-800 tracking-wider">
                {{ i18n.t().nextInLine }} ({{ waitingTickets().length }})
              </h2>
              <span class="text-xs font-bold text-blue-600 font-mono">
                {{ i18n.t().avgWaitTime }} ~{{ avgWaitTime() }} {{ i18n.t().estWaitSuffix }}
              </span>
            </div>

            <div class="flex-1 bg-white border border-slate-200 rounded-3xl p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 shadow-xs">
              @for (ticket of waitingTickets(); track ticket.id; let idx = $index) {
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold text-slate-500">{{ i18n.t().orderPrefix }} {{ idx + 1 }}</span>
                    <span class="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">~{{ ticket.estimatedWaitMinutes || 3 }} {{ i18n.t().statMinutesSuffix }}</span>
                  </div>
                  <div class="py-2 text-center text-3xl font-black font-mono text-slate-900">
                    {{ ticket.ticketNumber }}
                  </div>
                  <div class="text-[11px] font-medium text-slate-500 truncate text-center">
                    {{ ticket.serviceName }}
                  </div>
                </div>
              }
            </div>
          </section>

        </main>
      }

    </div>
  `
})
export class MainDisplayComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  public i18n = inject(TranslationService);
  public signalR = inject(SignalRService);
  public tvConfig = inject(TvConfigService);
  private api = inject(ApiConfigService);
  private router = inject(Router);

  branch = signal<any>(null);
  counters = signal<any[]>([]);
  waitingTickets = signal<any[]>([]);
  callingCounterId = signal<string | null>(null);
  isFullscreen = signal<boolean>(false);

  // Digital Clock
  currentTime = signal<string>('00:00:00');
  currentDate = signal<string>('');
  private clockInterval: any;
  private speechQueue: Array<{ ticket: string; counterNumber: number }> = [];
  private isSpeaking = false;
  private lastAnnouncedTicketId: string | null = null;
  private wasDarkMode = false;
  private onFullscreenChange = () => {
    this.isFullscreen.set(!!document.fullscreenElement);
  };

  avgWaitTime = computed(() => {
    const list = this.waitingTickets();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, t) => acc + (t.estimatedWaitMinutes || 3), 0);
    return Math.round(sum / list.length);
  });

  latestCalledTicket = computed(() => {
    const callingId = this.callingCounterId();
    if (callingId) {
      const cnt = this.counters().find(c => c.id === callingId);
      if (cnt && cnt.currentTicket) return cnt.currentTicket;
    }
    // Fallback to any actively serving ticket
    for (const c of this.counters()) {
      if (c.currentTicket) return c.currentTicket;
    }
    return null;
  });

  latestCalledCounterName = computed(() => {
    const callingId = this.callingCounterId();
    if (callingId) {
      const cnt = this.counters().find(c => c.id === callingId);
      if (cnt) return cnt.name;
    }
    for (const c of this.counters()) {
      if (c.currentTicket) return c.name;
    }
    return this.i18n.t().counterLabel;
  });

  constructor() {
    effect(() => {
      const evt = this.signalR.lastEvent();
      if (evt && evt.type === 'QueueUpdated') {
        this.loadDisplayData();
      }
    });

    // If config language is changed, sync to i18n
    effect(() => {
      const confLang = this.tvConfig.config().lang;
      if (confLang && this.i18n.currentLang() !== confLang) {
        this.i18n.setLanguage(confLang);
      }
    });
  }

  ngOnInit() {
    // 1. Strictly enforce Light Mode on TV Display
    this.wasDarkMode = document.documentElement.classList.contains('dark');
    document.documentElement.classList.remove('dark');

    // 2. Track fullscreen state
    if (typeof document !== 'undefined') {
      this.isFullscreen.set(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', this.onFullscreenChange);
    }

    this.startClock();
    this.loadDisplayData();
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    }
    // Restore previous theme when leaving TV screen
    if (this.wasDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }

  getLayoutTitle(): string {
    const t = this.i18n.t();
    switch (this.tvConfig.config().layout) {
      case 'bento': return t.tvLayoutBento;
      case 'focused': return t.tvLayoutFocused;
      case 'split': return t.tvLayoutSplit;
      case 'ticker': return t.tvLayoutTicker;
      default: return '';
    }
  }

  startClock() {
    const update = () => {
      const now = new Date();
      this.currentTime.set(now.toLocaleTimeString('th-TH', { hour12: false }));
      this.currentDate.set(now.toLocaleDateString(this.i18n.currentLang() === 'th' ? 'th-TH' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  }

  loadDisplayData() {
    this.http.get<any[]>(this.api.url('/api/branches')).subscribe({
      next: (branches) => {
        if (branches.length > 0) {
          const b = branches[0];
          this.branch.set(b);

          this.signalR.startConnection().then(() => {
            this.signalR.joinBranch(b.id);
          });

          // Fetch active queues
          this.http.get<any[]>(this.api.url(`/api/staff/queues/active?branchId=${b.id}`)).subscribe({
            next: (tickets) => {
              // Waiting tickets (status 0)
              const waiting = tickets.filter(t => t.status === 0);
              this.waitingTickets.set(waiting);

              // Map serving tickets to counters
              const updatedCounters = (b.counters || []).map((cnt: any) => {
                const current = tickets.find(t => t.counterId === cnt.id && (t.status === 1 || t.status === 2));
                return {
                  ...cnt,
                  servingTicketNumber: current ? current.ticketNumber : null,
                  currentTicket: current || null
                };
              });
              this.counters.set(updatedCounters);

              // Detect newly called ticket (status 1)
              const newlyCalled = tickets.find(t => t.status === 1);
              if (newlyCalled && newlyCalled.id !== this.lastAnnouncedTicketId) {
                this.lastAnnouncedTicketId = newlyCalled.id;
                const matchedCounter = updatedCounters.find((c: any) => c.id === newlyCalled.counterId);
                const counterNumber = matchedCounter ? matchedCounter.counterNumber : 1;
                
                // Highlight counter visually
                this.callingCounterId.set(newlyCalled.counterId);
                setTimeout(() => {
                  if (this.callingCounterId() === newlyCalled.counterId) {
                    this.callingCounterId.set(null);
                  }
                }, 8000);

                // Queue Audio Chime and Voice Announcement according to configured voiceMode
                this.enqueueAnnouncement(newlyCalled.ticketNumber, counterNumber);
              }
            }
          });
        }
      }
    });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      }).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          this.isFullscreen.set(false);
        }).catch(() => {});
      }
    }
  }

  exitDisplay() {
    this.router.navigate(['/staff/dashboard']);
  }

  private enqueueAnnouncement(ticketNumber: string, counterNumber: number) {
    this.speechQueue.push({ ticket: ticketNumber, counterNumber });
    this.processSpeechQueue();
  }

  private processSpeechQueue() {
    if (this.isSpeaking || this.speechQueue.length === 0) return;
    this.isSpeaking = true;

    const item = this.speechQueue.shift();
    if (!item) {
      this.isSpeaking = false;
      return;
    }

    // 1. Play bank chime
    this.tvConfig.playBankChime();

    // 2. Announce ticket after chime (850ms)
    setTimeout(() => {
      this.tvConfig.speakAnnouncement(item.ticket, item.counterNumber, this.tvConfig.config().voiceMode, () => {
        this.isSpeaking = false;
        // Process next item in queue after short pause
        setTimeout(() => this.processSpeechQueue(), 500);
      });
    }, 850);
  }
}
