import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { createColumnHelper } from '@tanstack/react-table';
import { EmptyState, ErrorState } from '@/components/Feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { message } from '@/api/client';
import { useAuth } from '@/app/AuthProvider';
import { singaporeTime } from './format';
import { usePendingApprovals, type ReservationView } from './queries';

const columns = createColumnHelper<ReservationView>();
export function ApprovalListPage() {
  const [page, setPage] = useState(0);
  const { user } = useAuth();
  const query = usePendingApprovals(page);
  const definitions = useMemo(
    () => [
      columns.accessor('equipment', {
        header: 'Equipment',
        cell: ({ row }) => (
          <div>
            <strong>{row.original.equipment?.name ?? 'Equipment'}</strong>
            <small className="cell-sub">
              {row.original.equipment?.assetTag} · {row.original.equipment?.category}
            </small>
          </div>
        ),
      }),
      columns.accessor('requesterName', {
        header: 'Applicant',
        cell: ({ row }) => (
          <div>
            {row.original.requesterName ?? 'Applicant'}
            {row.original.requesterId === user?.userId && (
              <small className="cell-sub">Your request</small>
            )}
          </div>
        ),
      }),
      columns.accessor('startAt', {
        header: 'Reserved time · SGT',
        cell: ({ row }) => (
          <div className="grid justify-items-start gap-1.5">
            <div className="whitespace-nowrap">
              {singaporeTime(row.original.startAt)}
              <small className="cell-sub">to {singaporeTime(row.original.endAt)}</small>
            </div>
            {/* Every row here waits for approval, so only an expiry needs a badge. */}
            {row.original.expired && <Badge tone="bad">Expired · rejection allowed</Badge>}
          </div>
        ),
      }),
      columns.display({
        id: 'review',
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) =>
          row.original.reservationId ? (
            <Button asChild variant="outline" size="sm">
              <Link
                to={`/approvals/${row.original.reservationId}`}
                aria-label={`Review request for ${row.original.equipment?.assetTag ?? 'equipment'}`}
              >
                Review request
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Unavailable</span>
          ),
      }),
    ],
    [user?.userId],
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="REVIEW EQUIPMENT REQUESTS"
        title="Approvals"
        description="Review a reservation before it is confirmed."
        actions={
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </Button>
        }
      />
      <Card>
        <section aria-labelledby="approval-queue-title">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1.5">
              <CardTitle id="approval-queue-title">Pending reservations</CardTitle>
              <CardDescription>
                Ordered by start time. Expired requests can still be rejected.
              </CardDescription>
            </div>
            {query.data && <Badge tone="pending">{query.data.totalElements ?? 0} pending</Badge>}
          </CardHeader>
          {query.isError ? (
            <ErrorState message={message(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <DataTable
              columns={definitions}
              data={query.data?.content ?? []}
              caption="Reservations waiting for approval"
              loading={query.isPending}
              empty={
                <EmptyState
                  icon={<ClipboardCheck size={26} />}
                  title="No pending reservations"
                  description="New equipment requests will appear here when they need approval."
                />
              }
              paging={{
                page,
                pageCount: Math.max(query.data?.totalPages ?? 1, 1),
                onPageChange: setPage,
                busy: query.isFetching,
              }}
            />
          )}
        </section>
      </Card>
    </div>
  );
}
