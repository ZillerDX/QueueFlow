import { Injectable, signal, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private api = inject(ApiConfigService);
  private hubConnection: signalR.HubConnection | null = null;
  public isConnected = signal<boolean>(false);
  public lastEvent = signal<any>(null);

  public startConnection(hubUrl?: string): Promise<void> {
    const targetUrl = hubUrl || this.api.hubUrl;
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(targetUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('QueueUpdated', (data) => {
      this.lastEvent.set({ type: 'QueueUpdated', data, timestamp: new Date() });
    });

    this.hubConnection.on('TicketStatusChanged', (data) => {
      this.lastEvent.set({ type: 'TicketStatusChanged', data, timestamp: new Date() });
    });

    this.hubConnection.on('TicketCalled', (data) => {
      this.lastEvent.set({ type: 'TicketCalled', data, timestamp: new Date() });
    });

    return this.hubConnection.start()
      .then(() => {
        this.isConnected.set(true);
      })
      .catch(err => {
        console.warn('SignalR Connection Error:', err);
      });
  }

  public joinBranch(branchId: string) {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinBranchGroup', branchId);
    }
  }

  public joinTicket(customerToken: string) {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinTicketGroup', customerToken);
    }
  }
}
