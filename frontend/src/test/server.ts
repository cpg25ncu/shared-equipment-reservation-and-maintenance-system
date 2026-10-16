import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
export const currentUser = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'wang@example.com',
  displayName: 'Wang Yuanmeng',
  roles: ['BORROWER'],
};
const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
export const server = setupServer(
  http.get('/api/v1/auth/csrf', () => {
    document.cookie = 'XSRF-TOKEN=test-csrf; Path=/';
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/api/v1/auth/me', () => HttpResponse.json(currentUser)),
  http.get('/api/v1/notifications/unread-count', () => HttpResponse.json({ count: 0 })),
  http.get('/api/v1/notifications', () => HttpResponse.json(emptyPage)),
  // The overview reads these per role (Issue #26); tests override them with server.use().
  http.get('/api/v1/reservations/mine', () => HttpResponse.json(emptyPage)),
  http.get('/api/v1/approvals/pending', () => HttpResponse.json(emptyPage)),
  http.get('/api/v1/overdue', () => HttpResponse.json(emptyPage)),
  http.get('/api/v1/admin/users', () => HttpResponse.json(emptyPage)),
  http.get('/api/v1/loans', () => HttpResponse.json([])),
  http.get('/api/v1/loans/checkouts', () => HttpResponse.json([])),
  http.get('/api/v1/maintenance/cases/open', () => HttpResponse.json([])),
  http.get('/api/v1/maintenance/cases/assigned', () => HttpResponse.json([])),
);
