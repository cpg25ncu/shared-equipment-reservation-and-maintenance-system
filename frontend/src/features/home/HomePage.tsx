import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/app/AuthProvider';
import { visibleNavigation } from '@/app/navigation';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useUnread } from '@/features/notification/queries';
import { roleLabels } from '@/lib/roles';
import { DashboardCards } from './DashboardCards';

/** Landing page: the figures the account's roles act on, then one card per page it can use. */
export function HomePage() {
  const { user } = useAuth();
  const unread = useUnread();
  const unreadCount = unread.data?.count ?? 0;
  const pages = visibleNavigation(user?.roles).filter((item) => item.to !== '/');
  const roles = roleLabels(user?.roles);
  return (
    <>
      <PageHeader
        eyebrow="YOUR WORKSPACE"
        title={user?.displayName ? `Welcome, ${user.displayName}` : 'Welcome'}
        description="What needs your attention today, and everything your account can do in SERMS."
      />
      {roles.length > 0 && (
        <ul aria-label="Your roles" className="m-0 mb-7 flex list-none flex-wrap gap-2 p-0">
          {roles.map((role) => (
            <li key={role}>
              <Badge>{role}</Badge>
            </li>
          ))}
        </ul>
      )}
      <section aria-labelledby="glance-title" className="mb-10">
        <h2 id="glance-title" className="mb-4 text-sm font-semibold">
          At a glance
        </h2>
        <DashboardCards roles={user?.roles} />
      </section>
      <section aria-labelledby="pages-title">
        <h2 id="pages-title" className="mb-4 text-sm font-semibold">
          Your pages
        </h2>
        <nav aria-label="Your pages" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pages.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-start gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-secondary/40 motion-reduce:transition-none"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <item.icon size={20} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {item.label}
                  {item.to === '/notifications' && unreadCount > 0 && (
                    <Badge tone="pending">{unreadCount} unread</Badge>
                  )}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  Open
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
