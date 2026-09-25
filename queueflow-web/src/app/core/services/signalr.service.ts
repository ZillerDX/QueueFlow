import { Injectable, signal, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private api = inject(ApiConfigService);
  private hubConnection: signalR.HubConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  public isConnected = signal<boolean>(false);
  public lastEvent = signal<any>(null);

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('queueflow_channel');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data) {
          this.lastEvent.set({
            ...event.data,
            timestamp: new Date()
          });
        }
      };
    }
  }

  public broadcastEvent(event: any) {
    const payload = {
      ...event,
      timestamp: new Date()
    };
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch {}
    }
    this.lastEvent.set(payload);
  }

  public startConnection(hubUrl?: string): Promise<void> {
    if (!this.api.baseUrl) {
      // In standalone Demo mode (no remote backend configured), rely on BroadcastChannel
      this.isConnected.set(true);
      return Promise.resolve();
    }

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
