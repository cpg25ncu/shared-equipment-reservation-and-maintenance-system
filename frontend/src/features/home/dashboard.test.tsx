import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { App } from '@/app/App';
import { AuthProvider } from '@/app/AuthProvider';
import { currentUser, server } from '@/test/server';

const page = <T,>(content: T[], totalElements = content.length) => ({
  content,
  page: 0,
  size: 20,
  totalElements,
  totalPages: 1,
});
const loan = (overdue: boolean, dueAt: string) => ({
  loanId: 'loan-' + dueAt,
  reservationId: 'r',
  equipmentId: 'e',
  equipmentName: 'Camera',
  assetTag: 'CAM-001',
  borrowerId: 'b',
  borrowerName: 'Alex',
  checkedOutAt: '2026-10-01T00:00:00Z',
  dueAt,
  returnedAt: null,
  status: 'ACTIVE',
  returnCondition: null,
  returnNote: null,
  overdue,
  version: 1,
});
const openCase = (priority: string) => ({ maintenanceCaseId: priority, priority, status: 'OPEN' });

/** Mounts the overview and records every API path it reads. */
function mount(roles: string[]) {
  const reads: string[] = [];
  server.events.removeAllListeners('request:start');
  server.events.on('request:start', ({ request }) => {
    reads.push(new URL(request.url).pathname);
  });
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ ...currentUser, roles })),
    http.get('/api/v1/notifications/unread-count', () => HttpResponse.json({ count: 3 })),
    http.get('/api/v1/reservations/mine', ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      return HttpResponse.json(
        status === 'PENDING_APPROVAL'
          ? page([], 2)
          : page([{ startAt: '2030-01-10T01:00:00Z', endAt: '2030-01-10T03:00:00Z' }], 1),
      );
    }),
    http.get('/api/v1/loans', () =>
      HttpResponse.json([loan(true, '2026-10-01T00:00:00Z'), loan(false, '2030-01-01T00:00:00Z')]),
    ),
    http.get('/api/v1/approvals/pending', () =>
      HttpResponse.json(page([{ expired: true }, { expired: false }], 4)),
    ),
    http.get('/api/v1/loans/checkouts', () =>
      HttpResponse.json(Array.from({ length: 20 }, () => ({ startAt: '2020-01-01T00:00:00Z' }))),
    ),
    http.get('/api/v1/overdue', () =>
      HttpResponse.json(page([{ equipmentName: 'Tripod', borrowerName: 'Sam' }], 6)),
    ),
    http.get('/api/v1/maintenance/cases/open', () =>
      HttpResponse.json([openCase('URGENT'), openCase('LOW')]),
    ),
    http.get('/api/v1/maintenance/cases/assigned', () =>
      HttpResponse.json([
        { maintenanceCaseId: 'a', status: 'ASSIGNED' },
        { maintenanceCaseId: 'b', status: 'IN_PROGRESS' },
        { maintenanceCaseId: 'c', status: 'RESOLVED' },
      ]),
    ),
    http.get('/api/v1/admin/users', () => HttpResponse.json(page([], 12))),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return reads;
}
/** Waits for one card by its heading and returns its figure, detail and link. */
async function card(label: string) {
  const heading = await screen.findByRole('heading', { level: 3, name: label });
  const item = within(heading.closest('li')!);
  await item.findByText((_, el) => el?.tagName === 'P' && /^\d+\+?$/.test(el.textContent ?? ''));
  return item;
}
const cards = () =>
  within(screen.getByRole('list', { name: 'At a glance' }))
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);
const forbidden = (reads: string[], paths: string[]) =>
  reads.filter((path) => paths.includes(path));

describe('role-based overview', () => {
  it('shows a borrower their loans and reservations and nothing operational', async () => {
    const reads = mount(['BORROWER']);
    const loans = await card('Equipment you have on loan');
    expect(loans.getByText('2')).toBeInTheDocument();
    expect(loans.getByText('1 loan past the return time — please return it.')).toBeInTheDocument();
    expect(loans.getByRole('link', { name: 'View my loans' })).toHaveAttribute('href', '/loans');
    expect((await card('Reservations waiting for approval')).getByText('2')).toBeInTheDocument();
    const confirmed = await card('Your confirmed reservations');
    expect(confirmed.getByText('Next starts 10 Jan 2030, 09:00 SGT.')).toBeInTheDocument();
    expect((await card('Unread notifications')).getByText('3')).toBeInTheDocument();
    expect(cards()).toEqual([
      'Equipment you have on loan',
      'Reservations waiting for approval',
      'Your confirmed reservations',
      'Unread notifications',
    ]);
    expect(
      forbidden(reads, [
        '/api/v1/approvals/pending',
        '/api/v1/loans/checkouts',
        '/api/v1/overdue',
        '/api/v1/maintenance/cases/open',
        '/api/v1/maintenance/cases/assigned',
        '/api/v1/admin/users',
      ]),
    ).toEqual([]);
  });

  it('shows an approver the requests waiting for them, including expired ones', async () => {
    const reads = mount(['APPROVER']);
    const pending = await card('Requests waiting for your decision');
    expect(pending.getByText('4')).toBeInTheDocument();
    expect(
      pending.getByText('1 request expired — reject to release the time slot.'),
    ).toBeInTheDocument();
    expect(pending.getByRole('link', { name: 'Review pending requests' })).toHaveAttribute(
      'href',
      '/approvals',
    );
    expect(cards()).toEqual(['Requests waiting for your decision', 'Unread notifications']);
    expect(forbidden(reads, ['/api/v1/loans', '/api/v1/reservations/mine'])).toEqual([]);
  });

  it('shows a storekeeper handovers, loans, overdue loans and open faults', async () => {
    const reads = mount(['CUSTODIAN']);
    const queue = await card('Confirmed reservations to hand over');
    // A full page of 20 means there may be more.
    expect(queue.getByText('20+')).toBeInTheDocument();
    expect((await card('Active loans')).getByText('1 past the return time.')).toBeInTheDocument();
    const overdue = await card('Overdue loans');
    expect(overdue.getByText('6')).toBeInTheDocument();
    expect(overdue.getByText('Longest: Tripod, borrowed by Sam.')).toBeInTheDocument();
    const faults = await card('Faults waiting for a technician');
    expect(faults.getByText('1 urgent or high priority.')).toBeInTheDocument();
    expect(cards()).not.toContain('Equipment you have on loan');
    expect(forbidden(reads, ['/api/v1/admin/users', '/api/v1/approvals/pending'])).toEqual([]);
  });

  it('shows a technician only their open cases', async () => {
    const reads = mount(['MAINTAINER']);
    const mine = await card('Your open maintenance cases');
    expect(mine.getByText('2')).toBeInTheDocument();
    expect(mine.getByText('1 to start · 1 in progress.')).toBeInTheDocument();
    expect(cards()).toEqual(['Your open maintenance cases', 'Unread notifications']);
    expect(forbidden(reads, ['/api/v1/maintenance/cases/open', '/api/v1/loans'])).toEqual([]);
  });

  it('shows an administrator operations figures without implying other roles', async () => {
    const reads = mount(['ADMIN']);
    expect((await card('User accounts')).getByText('12')).toBeInTheDocument();
    await card('Overdue loans');
    expect(cards()).toEqual([
      'Overdue loans',
      'Faults waiting for a technician',
      'User accounts',
      'Unread notifications',
    ]);
    expect(
      forbidden(reads, [
        '/api/v1/approvals/pending',
        '/api/v1/reservations/mine',
        '/api/v1/loans',
        '/api/v1/loans/checkouts',
      ]),
    ).toEqual([]);
  });

  it('keeps the rest of the overview when one figure fails', async () => {
    mount(['APPROVER']);
    server.use(
      http.get('/api/v1/approvals/pending', () =>
        HttpResponse.json({ detail: 'Unavailable' }, { status: 503 }),
      ),
    );
    const heading = await screen.findByRole('heading', {
      level: 3,
      name: 'Requests waiting for your decision',
    });
    const item = within(heading.closest('li')!);
    expect(await item.findByRole('alert')).toHaveTextContent('This figure could not be loaded.');
    expect(item.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect((await card('Unread notifications')).getByText('3')).toBeInTheDocument();
  });
});
