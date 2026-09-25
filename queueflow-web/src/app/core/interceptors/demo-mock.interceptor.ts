import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { ApiConfigService } from '../services/api-config.service';
import { SignalRService } from '../services/signalr.service';

const DB_KEY = 'queueflow_demo_db_v1';

function getInitialDb() {
  return {
    branch: {
      id: 'bkk-central-01',
      name: 'Bangkok Central Branch',
      code: 'BKK01',
      timezone: 'Asia/Bangkok',
      services: [
        {
          id: 'srv-1',
          branchId: 'bkk-central-01',
          name: 'General Service (บริการทั่วไป)',
          codePrefix: 'A',
          defaultServiceDurationMinutes: 5,
          isActive: true
        },
        {
          id: 'srv-2',
          branchId: 'bkk-central-01',
          name: 'Express Counter (บริการด่วนพิเศษ)',
          codePrefix: 'B',
          defaultServiceDurationMinutes: 3,
          isActive: true
        },
        {
          id: 'srv-3',
          branchId: 'bkk-central-01',
          name: 'Finance & Payments (การเงินและชำระค่าบริการ)',
          codePrefix: 'C',
          defaultServiceDurationMinutes: 8,
          isActive: true
        }
      ],
      counters: [
        {
          id: 'cnt-1',
          branchId: 'bkk-central-01',
          name: 'Counter 1',
          counterNumber: 1,
          isActive: true,
          assignedServiceId: 'srv-1',
          assignedServiceName: 'General Service (บริการทั่วไป)',
          assignedServicePrefix: 'A'
        },
        {
          id: 'cnt-2',
          branchId: 'bkk-central-01',
          name: 'Counter 2',
          counterNumber: 2,
          isActive: true,
          assignedServiceId: 'srv-2',
          assignedServiceName: 'Express Counter (บริการด่วนพิเศษ)',
          assignedServicePrefix: 'B'
        },
        {
          id: 'cnt-3',
          branchId: 'bkk-central-01',
          name: 'Counter 3',
          counterNumber: 3,
          isActive: true,
          assignedServiceId: 'srv-3',
          assignedServiceName: 'Finance & Payments (การเงินและชำระค่าบริการ)',
          assignedServicePrefix: 'C'
        }
      ]
    },
    tickets: [
      {
        id: 'tkt-init-1',
        ticketNumber: 'A01',
        branchId: 'bkk-central-01',
        serviceId: 'srv-1',
        serviceName: 'General Service (บริการทั่วไป)',
        serviceCodePrefix: 'A',
        status: 0, // Waiting
        issuedAt: new Date(Date.now() - 600000).toISOString(),
        token: 'demo-token-a01',
        estimatedWaitMinutes: 5,
        priority: 0
      },
      {
        id: 'tkt-init-2',
        ticketNumber: 'B01',
        branchId: 'bkk-central-01',
        serviceId: 'srv-2',
        serviceName: 'Express Counter (บริการด่วนพิเศษ)',
        serviceCodePrefix: 'B',
        status: 0, // Waiting
        issuedAt: new Date(Date.now() - 300000).toISOString(),
        token: 'demo-token-b01',
        estimatedWaitMinutes: 3,
        priority: 0
      }
    ],
    sequences: { A: 1, B: 1, C: 0 } as Record<string, number>
  };
}

function loadDb(): any {
  if (typeof window === 'undefined') return getInitialDb();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const init = getInitialDb();
      localStorage.setItem(DB_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialDb();
  }
}

function saveDb(db: any) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {}
  }
}

export const demoMockInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(ApiConfigService);
  const signalR = inject(SignalRService);

  // If a remote or localhost backend is explicitly defined, pass through
  if (api.baseUrl && api.baseUrl.trim().length > 0) {
    return next(req);
  }

  // Intercept relative /api endpoints in Demo Mode
  const url = req.url;
  const method = req.method;

  if (!url.includes('/api/')) {
    return next(req);
  }

  const db = loadDb();

  // 1. GET /api/branches
  if (url.includes('/api/branches') && method === 'GET') {
    return of(new HttpResponse({ status: 200, body: [db.branch] }));
  }

  // 2. GET /api/staff/queues/active
  if (url.includes('/api/staff/queues/active') && method === 'GET') {
    const active = (db.tickets || []).filter((t: any) => t.status === 0 || t.status === 1 || t.status === 2);
    return of(new HttpResponse({ status: 200, body: active }));
  }

  // 3. GET /api/analytics/overview
  if (url.includes('/api/analytics/overview') && method === 'GET') {
    const tickets = db.tickets || [];
    const waiting = tickets.filter((t: any) => t.status === 0).length;
    const serving = tickets.filter((t: any) => t.status === 1 || t.status === 2).length;
    const completed = tickets.filter((t: any) => t.status === 3).length;
    const overview = {
      totalToday: tickets.length,
      currentlyWaiting: waiting,
      currentlyServing: serving,
      completedToday: completed,
      avgWaitMinutes: 4.5
    };
    return of(new HttpResponse({ status: 200, body: overview }));
  }

  // 4. POST /api/queues (Customer Take Queue)
  if (url.endsWith('/api/queues') && method === 'POST') {
    const body: any = req.body || {};
    const service = (db.branch.services || []).find((s: any) => s.id === body.serviceId) || db.branch.services[0];
    const prefix = service.codePrefix || 'A';

    db.sequences = db.sequences || {};
    db.sequences[prefix] = (db.sequences[prefix] || 0) + 1;
    const seq = db.sequences[prefix];
    const formattedNum = `${prefix}${seq.toString().padStart(2, '0')}`;

    const waitingBefore = (db.tickets || []).filter((t: any) => t.status === 0 && t.serviceId === service.id).length;
    const estWait = (waitingBefore + 1) * (service.defaultServiceDurationMinutes || 5);
    const token = 'demo-' + Math.random().toString(36).substring(2, 10);

    const newTicket = {
      id: 'tkt-' + Date.now(),
      ticketNumber: formattedNum,
      branchId: db.branch.id,
      serviceId: service.id,
      serviceName: service.name,
      serviceCodePrefix: prefix,
      status: 0,
      issuedAt: new Date().toISOString(),
      token: token,
      estimatedWaitMinutes: estWait,
      priority: 0,
      customerNotes: body.customerNotes || ''
    };

    db.tickets.push(newTicket);
    saveDb(db);

    signalR.broadcastEvent({ type: 'QueueUpdated', data: newTicket });
    return of(new HttpResponse({ status: 201, body: newTicket }));
  }

  // 5. GET /api/queues/:token (Ticket Tracking)
  const tokenMatch = url.match(/\/api\/queues\/([^/?#]+)$/);
  if (tokenMatch && method === 'GET') {
    const token = tokenMatch[1];
    const ticket = (db.tickets || []).find((t: any) => t.token === token || t.id === token);
    if (ticket) {
      const waitingAhead = (db.tickets || []).filter((t: any) => t.status === 0 && t.serviceId === ticket.serviceId && new Date(t.issuedAt) < new Date(ticket.issuedAt)).length;
      const resp = {
        ...ticket,
        queuePositionAhead: waitingAhead,
        currentWaitingCount: (db.tickets || []).filter((t: any) => t.status === 0 && t.serviceId === ticket.serviceId).length
      };
      return of(new HttpResponse({ status: 200, body: resp }));
    }
  }

  // 6. POST /api/queues/:token/cancel
  if (url.includes('/api/queues/') && url.endsWith('/cancel') && method === 'POST') {
    const parts = url.split('/');
    const token = parts[parts.length - 2];
    const ticket = (db.tickets || []).find((t: any) => t.token === token || t.id === token);
    if (ticket) {
      ticket.status = 5; // Cancelled
      saveDb(db);
      signalR.broadcastEvent({ type: 'QueueUpdated', data: ticket });
    }
    return of(new HttpResponse({ status: 200, body: { success: true } }));
  }

  // 7. POST /api/staff/queues/next
  if (url.includes('/api/staff/queues/next') && method === 'POST') {
    const body: any = req.body || {};
    const counter = (db.branch.counters || []).find((c: any) => c.id === body.counterId);
    const assignedServiceId = counter?.assignedServiceId;

    // Find next ticket in status 0
    let candidate = (db.tickets || []).find((t: any) => t.status === 0 && (!assignedServiceId || t.serviceId === assignedServiceId));
    if (!candidate) {
      candidate = (db.tickets || []).find((t: any) => t.status === 0);
    }

    if (candidate) {
      // Mark any prior serving ticket on this counter as completed
      (db.tickets || []).forEach((t: any) => {
        if (t.counterId === body.counterId && (t.status === 1 || t.status === 2)) {
          t.status = 3;
        }
      });

      candidate.status = 1; // Called
      candidate.counterId = body.counterId;
      candidate.counterNumber = counter?.counterNumber || 1;
      candidate.calledAt = new Date().toISOString();
      saveDb(db);

      signalR.broadcastEvent({
        type: 'TicketCalled',
        data: {
          ticketId: candidate.id,
          ticketNumber: candidate.ticketNumber,
          counterNumber: candidate.counterNumber,
          branchId: db.branch.id
        }
      });
      signalR.broadcastEvent({ type: 'QueueUpdated', data: candidate });
      return of(new HttpResponse({ status: 200, body: candidate }));
    }

    return of(new HttpResponse({ status: 200, body: null }));
  }

  // 8. Action endpoints: recall, start, complete, skip, no-show
  const actionMatch = url.match(/\/api\/staff\/queues\/([^/]+)\/(recall|start|complete|skip|no-show)$/);
  if (actionMatch && method === 'POST') {
    const ticketId = actionMatch[1];
    const action = actionMatch[2];
    const ticket = (db.tickets || []).find((t: any) => t.id === ticketId);

    if (ticket) {
      if (action === 'recall') {
        signalR.broadcastEvent({
          type: 'TicketCalled',
          data: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            counterNumber: ticket.counterNumber || 1,
            branchId: db.branch.id
          }
        });
      } else if (action === 'start') {
        ticket.status = 2; // Serving
      } else if (action === 'complete') {
        ticket.status = 3; // Completed
      } else if (action === 'skip' || action === 'no-show') {
        ticket.status = 4; // Skipped
      }
      saveDb(db);
      signalR.broadcastEvent({ type: 'QueueUpdated', data: ticket });
      return of(new HttpResponse({ status: 200, body: ticket }));
    }
  }

  // 9. PUT /api/staff/queues/:id/priority
  if (url.includes('/api/staff/queues/') && url.endsWith('/priority') && method === 'PUT') {
    const parts = url.split('/');
    const ticketId = parts[parts.length - 2];
    const ticket = (db.tickets || []).find((t: any) => t.id === ticketId);
    if (ticket) {
      ticket.priority = 1;
      saveDb(db);
      signalR.broadcastEvent({ type: 'QueueUpdated', data: ticket });
      return of(new HttpResponse({ status: 200, body: ticket }));
    }
  }

  // 10. Admin CRUD handlers
  if (url.includes('/api/admin/')) {
    // Services
    if (url.includes('/services')) {
      if (method === 'POST') {
        const body: any = req.body || {};
        const newSrv = {
          id: 'srv-' + Date.now(),
          branchId: db.branch.id,
          name: body.name,
          codePrefix: body.codePrefix,
          defaultServiceDurationMinutes: body.defaultServiceDurationMinutes || 5,
          isActive: true
        };
        db.branch.services.push(newSrv);
        saveDb(db);
        signalR.broadcastEvent({ type: 'QueueUpdated' });
        return of(new HttpResponse({ status: 201, body: newSrv }));
      }
      if (method === 'PUT') {
        const srvId = url.split('/').pop();
        const srv = (db.branch.services || []).find((s: any) => s.id === srvId);
        if (srv) {
          Object.assign(srv, req.body);
          saveDb(db);
          signalR.broadcastEvent({ type: 'QueueUpdated' });
          return of(new HttpResponse({ status: 200, body: srv }));
        }
      }
      if (method === 'PATCH' && url.includes('toggle-active')) {
        const srvId = url.split('/')[url.split('/').length - 2];
        const srv = (db.branch.services || []).find((s: any) => s.id === srvId);
        if (srv) {
          srv.isActive = !srv.isActive;
          saveDb(db);
          signalR.broadcastEvent({ type: 'QueueUpdated' });
          return of(new HttpResponse({ status: 200, body: srv }));
        }
      }
      if (method === 'DELETE') {
        const srvId = url.split('/').pop();
        db.branch.services = (db.branch.services || []).filter((s: any) => s.id !== srvId);
        saveDb(db);
        signalR.broadcastEvent({ type: 'QueueUpdated' });
        return of(new HttpResponse({ status: 200, body: { success: true } }));
      }
    }

    // Counters
    if (url.includes('/counters')) {
      if (method === 'POST') {
        const body: any = req.body || {};
        const newCnt = {
          id: 'cnt-' + Date.now(),
          branchId: db.branch.id,
          name: body.name,
          counterNumber: body.counterNumber,
          assignedServiceId: body.assignedServiceId || null,
          isActive: true
        };
        db.branch.counters.push(newCnt);
        saveDb(db);
        signalR.broadcastEvent({ type: 'QueueUpdated' });
        return of(new HttpResponse({ status: 201, body: newCnt }));
      }
      if (method === 'PUT' && url.includes('/service')) {
        const parts = url.split('/');
        const cntId = parts[parts.length - 2];
        const cnt = (db.branch.counters || []).find((c: any) => c.id === cntId);
        if (cnt) {
          const body: any = req.body || {};
          cnt.assignedServiceId = body.assignedServiceId || null;
          saveDb(db);
          signalR.broadcastEvent({ type: 'QueueUpdated' });
          return of(new HttpResponse({ status: 200, body: cnt }));
        }
      }
      if (method === 'PUT') {
        const cntId = url.split('/').pop();
        const cnt = (db.branch.counters || []).find((c: any) => c.id === cntId);
        if (cnt) {
          Object.assign(cnt, req.body);
          saveDb(db);
          signalR.broadcastEvent({ type: 'QueueUpdated' });
          return of(new HttpResponse({ status: 200, body: cnt }));
        }
      }
      if (method === 'PATCH' && url.includes('toggle-active')) {
        const cntId = url.split('/')[url.split('/').length - 2];
        const cnt = (db.branch.counters || []).find((c: any) => c.id === cntId);
        if (cnt) {
          cnt.isActive = !cnt.isActive;
          saveDb(db);
          signalR.broadcastEvent({ type: 'QueueUpdated' });
          return of(new HttpResponse({ status: 200, body: cnt }));
        }
      }
      if (method === 'DELETE') {
        const cntId = url.split('/').pop();
        db.branch.counters = (db.branch.counters || []).filter((c: any) => c.id !== cntId);
        saveDb(db);
        signalR.broadcastEvent({ type: 'QueueUpdated' });
        return of(new HttpResponse({ status: 200, body: { success: true } }));
      }
    }

    // Branch update
    if (url.includes('/branches/') && method === 'PUT') {
      Object.assign(db.branch, req.body);
      saveDb(db);
      signalR.broadcastEvent({ type: 'QueueUpdated' });
      return of(new HttpResponse({ status: 200, body: db.branch }));
    }
  }

  return next(req);
};
