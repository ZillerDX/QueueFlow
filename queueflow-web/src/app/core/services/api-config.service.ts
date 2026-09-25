import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  private defaultBase = (environment.apiBaseUrl || '').replace(/\/+$/, '');

  public get baseUrl(): string {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryApi = urlParams.get('apiUrl') || urlParams.get('api');
        if (queryApi && queryApi.trim().startsWith('http')) {
          localStorage.setItem('queueflow_api_url', queryApi.trim().replace(/\/+$/, ''));
        }
      } catch {}

      const stored = localStorage.getItem('queueflow_api_url');
      if (stored) return stored.replace(/\/+$/, '');
      const windowEnv = (window as any).__QUEUEFLOW_API_URL__;
      if (windowEnv) return windowEnv.replace(/\/+$/, '');
    }
    return this.defaultBase;
  }

  public url(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const base = this.baseUrl;
    return base ? `${base}${cleanPath}` : cleanPath;
  }

  public get hubUrl(): string {
    return this.url('/hubs/queue');
  }

  public setCustomApiUrl(url: string | null): void {
    if (typeof window !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem('queueflow_api_url', url.trim());
      } else {
        localStorage.removeItem('queueflow_api_url');
      }
    }
  }
}
