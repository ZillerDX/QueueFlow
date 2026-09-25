import { Routes } from '@angular/router';
import { JoinQueueComponent } from './features/customer/join-queue.component';
import { TicketTrackerComponent } from './features/customer/ticket-tracker.component';
import { StaffDashboardComponent } from './features/staff/staff-dashboard.component';
import { BranchManagementComponent } from './features/admin/branch-management.component';
import { MainDisplayComponent } from './features/display/main-display.component';

export const routes: Routes = [
  { path: '', redirectTo: 'queue/join', pathMatch: 'full' },
  { path: 'queue/join', component: JoinQueueComponent },
  { path: 'queue/:token', component: TicketTrackerComponent },
  { path: 'staff/dashboard', component: StaffDashboardComponent },
  { path: 'admin/management', component: BranchManagementComponent },
  { path: 'display', component: MainDisplayComponent },
  { path: '**', redirectTo: 'queue/join' }
];

