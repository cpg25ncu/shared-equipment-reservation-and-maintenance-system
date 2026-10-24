import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { Layout } from './Layout';
import { currentUser } from '@/test/server';

async function mountFooter() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByText(currentUser.displayName)).toBeInTheDocument();
  return screen.getByRole('contentinfo');
}

afterEach(() => vi.unstubAllEnvs());

describe('layout footer', () => {
  it.each([
    ['0123456789abcdef', '0123456'],
    ['fedcba9876543210', 'fedcba9'],
  ])('shows the first seven characters of release %s', async (sha, shortSha) => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_RELEASE_SHA', sha);

    const footer = await mountFooter();
    expect(footer).toHaveTextContent('Shared Equipment Reservation and Maintenance System');
    expect(within(footer).getByText(`Team 07 · Release ${shortSha}`)).toBeVisible();
    expect(footer).not.toHaveTextContent(sha);
  });

  it.each([undefined, ''])('shows a local fallback when the release is %s', async (sha) => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_RELEASE_SHA', sha);

    expect(await mountFooter()).toHaveTextContent('Team 07 · Release local');
  });

  it('shows local in development even when a release SHA is supplied', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_RELEASE_SHA', '0123456789abcdef');

    expect(await mountFooter()).toHaveTextContent('Team 07 · Release local');
  });
});
