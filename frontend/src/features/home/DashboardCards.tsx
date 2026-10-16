import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bell,
  Boxes,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClockAlert,
  PackageCheck,
  UserCog,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/api/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingApprovals } from '@/features/approval/queries';
import { useCheckouts, useLoans } from '@/features/loan/queries';
import { useAssignedCases, useOpenCases } from '@/features/maintenance/queries';
import { useUnread } from '@/features/notification/queries';
import { useMyReservations } from '@/features/reservation/queries';
import { hasAnyRole } from '@/lib/roles';
import type { Tone } from '@/lib/status';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';

/** The list endpoints return at most this many rows per page; a full page is shown as "20+". */
const PAGE = 20;
const countOf = (rows: readonly unknown[] | undefined) =>
  rows === undefined ? undefined : rows.length >= PAGE ? `${PAGE}+` : rows.length;
const earliest = (values: string[]) => values.sort()[0] as string | undefined;
const plural = (count: number, one: string, many = one + 's') =>
  `${count} ${count === 1 ? one : many}`;

const tiles: Record<Tone, string> = {
  ok: 'bg-tone-ok text-tone-ok-foreground',
  pending: 'bg-tone-pending text-tone-pending-foreground',
  bad: 'bg-tone-bad text-tone-bad-foreground',
  muted: 'bg-secondary text-secondary-foreground',
  info: 'bg-tone-info text-tone-info-foreground',
};

type Query = { isPending: boolean; isError: boolean; refetch: () => unknown };
type StatProps = {
  label: string;
  icon: LucideIcon;
  query: Query;
  value: string | number | undefined;
  detail?: ReactNode;
  /** Colours the icon when the figure needs attention. */
  tone?: Tone;
  to: string;
  /** Says where the link goes; never just a menu label, so menu links stay unique. */
  linkLabel: string;
};

/** One figure on the overview, with the page where the user acts on it. */
function Stat({
  label,
  icon: Icon,
  query,
  value,
  detail,
  tone = 'muted',
  to,
  linkLabel,
}: StatProps) {
  return (
    <li className="min-w-0">
      <Card className="flex h-full flex-col gap-3 p-5" aria-busy={query.isPending || undefined}>
        <div className="flex items-center gap-3">
          <span
            className={cn('grid size-9 shrink-0 place-items-center rounded-lg', tiles[tone])}
            aria-hidden="true"
          >
            <Icon size={18} />
          </span>
          <h3 className="m-0 text-xs font-medium leading-snug text-muted-foreground">{label}</h3>
        </div>
        {query.isPending ? (
          <>
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-3/4" />
          </>
        ) : query.isError ? (
          <div role="alert" className="grid justify-items-start gap-1 text-xs text-destructive">
            This figure could not be loaded.
            <button
              type="button"
              className="font-semibold underline underline-offset-4"
              onClick={() => void query.refetch()}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <p className="m-0 text-3xl font-semibold leading-none tabular-nums">{value}</p>
            {detail && (
              <p className="m-0 text-xs leading-relaxed text-muted-foreground">{detail}</p>
            )}
          </>
        )}
        <Link
          to={to}
          className="group mt-auto inline-flex items-center gap-1.5 self-start pt-1 text-xs font-semibold text-primary hover:underline hover:underline-offset-4"
        >
          {linkLabel}
          <ArrowRight
            size={14}
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </Card>
    </li>
  );
}

function MyLoans() {
  const loans = useLoans(true, 0);
  const rows = loans.data ?? [];
  const overdue = rows.filter((loan) => loan.overdue).length;
  const next = earliest(rows.filter((loan) => !loan.overdue).map((loan) => loan.dueAt));
  return (
    <Stat
      label="Equipment you have on loan"
      icon={Boxes}
      query={loans}
      value={countOf(loans.data)}
      detail={
        overdue
          ? `${plural(overdue, 'loan')} past the return time — please return it.`
          : next
            ? `Next return due ${formatDateTime(next)} SGT.`
            : 'Nothing to return.'
      }
      tone={overdue ? 'bad' : rows.length ? 'info' : 'muted'}
      to="/loans"
      linkLabel="View my loans"
    />
  );
}

function MyPendingReservations() {
  const list = useMyReservations('PENDING_APPROVAL', 0);
  const total = list.data?.totalElements;
  return (
    <Stat
      label="Reservations waiting for approval"
      icon={CalendarClock}
      query={list}
      value={total}
      detail={total ? 'You are notified when an approver decides.' : 'No requests waiting.'}
      tone={total ? 'pending' : 'muted'}
      to="/reservations"
      linkLabel="View my reservations"
    />
  );
}

function MyConfirmedReservations() {
  const list = useMyReservations('CONFIRMED', 0);
  // Confirmed but not yet collected; a booking whose time has passed is no longer upcoming.
  const next = earliest(
    (list.data?.content ?? [])
      .filter((item) => Date.parse(item.endAt) > Date.now())
      .map((item) => item.startAt),
  );
  return (
    <Stat
      label="Your confirmed reservations"
      icon={CalendarCheck}
      query={list}
      value={list.data?.totalElements}
      detail={next ? `Next starts ${formatDateTime(next)} SGT.` : 'Nothing coming up.'}
      tone={next ? 'ok' : 'muted'}
      to="/reservations"
      linkLabel="See upcoming bookings"
    />
  );
}

function PendingApprovals() {
  const pending = usePendingApprovals(0);
  const total = pending.data?.totalElements;
  const expired = (pending.data?.content ?? []).filter((item) => item.expired).length;
  return (
    <Stat
      label="Requests waiting for your decision"
      icon={ClipboardCheck}
      query={pending}
      value={total}
      detail={
        expired
          ? `${plural(expired, 'request')} expired — reject to release the time slot.`
          : total
            ? 'Earliest start time first.'
            : 'Nothing is waiting for you.'
      }
      tone={expired ? 'bad' : total ? 'pending' : 'muted'}
      to="/approvals"
      linkLabel="Review pending requests"
    />
  );
}

function CheckoutQueue() {
  const queue = useCheckouts(true, 0);
  const ready = (queue.data ?? []).filter((item) => Date.parse(item.startAt) <= Date.now()).length;
  return (
    <Stat
      label="Confirmed reservations to hand over"
      icon={PackageCheck}
      query={queue}
      value={countOf(queue.data)}
      detail={
        queue.data?.length
          ? `${plural(ready, 'reservation')} can be checked out now.`
          : 'No reservations awaiting checkout.'
      }
      tone={ready ? 'pending' : 'muted'}
      to="/loans"
      linkLabel="Open the checkout queue"
    />
  );
}

function ActiveLoans() {
  const loans = useLoans(true, 0);
  const overdue = (loans.data ?? []).filter((loan) => loan.overdue).length;
  return (
    <Stat
      label="Active loans"
      icon={Boxes}
      query={loans}
      value={countOf(loans.data)}
      detail={overdue ? `${overdue} past the return time.` : 'All within their return time.'}
      tone={overdue ? 'bad' : 'info'}
      to="/loans"
      linkLabel="Receive returns"
    />
  );
}

function OverdueLoans() {
  const overdue = useQuery({
    queryKey: ['overdue', 'summary'],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/overdue', {
        params: { query: { page: 0, size: 1, order: 'desc' } },
      });
      return data!;
    },
  });
  const total = overdue.data?.totalElements;
  const longest = overdue.data?.content?.[0];
  return (
    <Stat
      label="Overdue loans"
      icon={ClockAlert}
      query={overdue}
      value={total}
      detail={
        longest?.equipmentName && longest.borrowerName
          ? `Longest: ${longest.equipmentName}, borrowed by ${longest.borrowerName}.`
          : 'Every active loan is within its return time.'
      }
      tone={total ? 'bad' : 'ok'}
      to="/overdue"
      linkLabel="Follow up overdue loans"
    />
  );
}

function OpenCases() {
  const cases = useOpenCases();
  const pressing = (cases.data ?? []).filter((item) =>
    ['URGENT', 'HIGH'].includes(item.priority),
  ).length;
  return (
    <Stat
      label="Faults waiting for a technician"
      icon={Wrench}
      query={cases}
      value={cases.data?.length}
      detail={
        pressing
          ? `${pressing} urgent or high priority.`
          : cases.data?.length
            ? 'None urgent or high priority.'
            : 'No open maintenance cases.'
      }
      tone={pressing ? 'bad' : cases.data?.length ? 'pending' : 'ok'}
      to="/maintenance"
      linkLabel="Assign technicians"
    />
  );
}

function AssignedCases() {
  const cases = useAssignedCases();
  const toStart = (cases.data ?? []).filter((item) => item.status === 'ASSIGNED').length;
  const working = (cases.data ?? []).filter((item) => item.status === 'IN_PROGRESS').length;
  return (
    <Stat
      label="Your open maintenance cases"
      icon={Wrench}
      query={cases}
      value={cases.data ? toStart + working : undefined}
      detail={`${toStart} to start · ${working} in progress.`}
      tone={toStart ? 'pending' : working ? 'info' : 'muted'}
      to="/maintenance"
      linkLabel="Work on my cases"
    />
  );
}

function UserAccounts() {
  const users = useQuery({
    queryKey: ['admin-users', 'summary'],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/admin/users', {
        params: { query: { search: '', page: 0, size: 1 } },
      });
      return data!;
    },
  });
  return (
    <Stat
      label="User accounts"
      icon={UserCog}
      query={users}
      value={users.data?.totalElements}
      detail="Roles are explicit; Administrator grants no other role."
      to="/admin/users"
      linkLabel="Manage accounts and roles"
    />
  );
}

function Unread() {
  const unread = useUnread();
  const count = unread.data?.count;
  return (
    <Stat
      label="Unread notifications"
      icon={Bell}
      query={unread}
      value={count}
      detail={count ? 'Reminders and decisions about your equipment.' : 'You are all caught up.'}
      tone={count ? 'pending' : 'muted'}
      to="/notifications"
      linkLabel="Read notifications"
    />
  );
}

/**
 * The figures each role acts on first (Proposal 7.4). Each card reads one existing endpoint the
 * role may already call; an account with several roles sees each figure once.
 */
export function DashboardCards({ roles }: { roles: readonly string[] | undefined }) {
  const has = (...allowed: string[]) => hasAnyRole(roles, ...allowed);
  return (
    <ul
      aria-label="At a glance"
      className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4"
    >
      {has('BORROWER') && !has('CUSTODIAN') && <MyLoans />}
      {has('BORROWER') && <MyPendingReservations />}
      {has('BORROWER') && <MyConfirmedReservations />}
      {has('APPROVER') && <PendingApprovals />}
      {has('CUSTODIAN') && <CheckoutQueue />}
      {has('CUSTODIAN') && <ActiveLoans />}
      {has('CUSTODIAN', 'ADMIN') && <OverdueLoans />}
      {has('CUSTODIAN', 'ADMIN') && <OpenCases />}
      {has('MAINTAINER') && <AssignedCases />}
      {has('ADMIN') && <UserAccounts />}
      <Unread />
    </ul>
  );
}
