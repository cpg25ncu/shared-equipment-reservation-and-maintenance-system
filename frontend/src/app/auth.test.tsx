import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { App } from '@/app/App';
import { AuthProvider } from '@/app/AuthProvider';
import { currentUser, server } from '@/test/server';

describe('sign-in', () => {
  it('does not pull the user back to the overview when the token refresh is slow', async () => {
    let signedIn = false;
    let csrfCalls = 0;
    server.use(
      http.get('/api/v1/auth/me', () =>
        signedIn ? HttpResponse.json(currentUser) : HttpResponse.json({}, { status: 401 }),
      ),
      http.post('/api/v1/auth/login', () => {
        signedIn = true;
        return HttpResponse.json(currentUser);
      }),
      // The refresh after signing in answers slowly, as a busy server can.
      http.get('/api/v1/auth/csrf', async () => {
        if (++csrfCalls > 1) await delay(400);
        document.cookie = 'XSRF-TOKEN=test-csrf; Path=/';
        return new HttpResponse(null, { status: 204 });
      }),
      http.get('/api/v1/equipment/filters', () =>
        HttpResponse.json({ categories: [], locations: [] }),
      ),
      http.get('/api/v1/equipment', () =>
        HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      ),
    );
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email address'), currentUser.email);
    await user.type(screen.getByLabelText('Password'), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: /^Welcome/ })).toBeVisible();
    // Open another page straight away, then wait longer than the slow refresh took.
    await user.click(
      screen
        .getByRole('navigation', { name: 'Main navigation' })
        .querySelector('a[href="/equipment"]')!,
    );
    expect(await screen.findByRole('heading', { level: 1, name: /^Find equipment/ })).toBeVisible();
    await delay(600);
    expect(screen.getByRole('heading', { level: 1, name: /^Find equipment/ })).toBeVisible();
  });
});
