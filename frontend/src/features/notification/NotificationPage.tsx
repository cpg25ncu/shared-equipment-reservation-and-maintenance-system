import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { api, message } from '@/api/client';
import type { components } from '@/api/schema';
import { EmptyState, ErrorState } from '@/components/Feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { notificationKeys, useUnread } from './queries';
type Notification = components['schemas']['NotificationView'];
const helper = createColumnHelper<Notification>();
const labels: Record<string, string> = {
  DUE_SOON: 'Due soon',
  OVERDUE: 'Overdue reminder',
  BUSINESS_EVENT: 'Reservation update',
};
export function NotificationPage() {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('deliveredAt,desc');
  const client = useQueryClient();
  const unread = useUnread();
  const notifications = useQuery({
    queryKey: [...notificationKeys.all, 'list', page, sort],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/notifications', {
        params: { query: { page, size: 20, sort } },
      });
      return data!;
    },
  });
  const read = useMutation({
    mutationFn: async (id: string) => {
      await api.POST('/api/v1/notifications/{id}/read', { params: { path: { id } } });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }),
  });
  const columns = useMemo(
    () => [
      helper.accessor('content', {
        header: 'Update',
        cell: (info) => {
          const overdue = info.row.original.type === 'OVERDUE';
          return (
            <div className="flex gap-3">
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg',
                  overdue
                    ? 'bg-tone-bad text-tone-bad-foreground'
                    : 'bg-secondary text-secondary-foreground',
                )}
                aria-hidden="true"
              >
                <Bell size={16} />
              </span>
              <div className="min-w-0">
                <strong className="block text-xs font-semibold">
                  {labels[info.row.original.type ?? ''] ?? 'Equipment update'}
                </strong>
                <p className="m-0 mt-1 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                  {info.getValue()}
                </p>
              </div>
            </div>
          );
        },
      }),
      helper.accessor('deliveredAt', {
        header: 'Received · SGT',
        cell: (info) =>
          info.getValue() ? (
            <time dateTime={info.getValue()}>
              {formatInTimeZone(info.getValue()!, 'Asia/Singapore', 'dd MMM yyyy')}
              <small>{formatInTimeZone(info.getValue()!, 'Asia/Singapore', 'HH:mm')}</small>
            </time>
          ) : (
            '—'
          ),
      }),
      helper.accessor('readAt', {
        header: 'Status',
        cell: (info) =>
          info.getValue() ? <Badge tone="muted">Read</Badge> : <Badge tone="pending">Unread</Badge>,
      }),
      helper.display({
        id: 'action',
        header: () => <span className="sr-only">Action</span>,
        cell: (info) =>
          !info.row.original.readAt ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={read.isPending}
              onClick={() => read.mutate(info.row.original.id!)}
            >
              <Check size={15} aria-hidden="true" />
              Mark as read
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check size={15} aria-hidden="true" />
              Reviewed
            </span>
          ),
      }),
    ],
    [read],
  );
  const count = unread.data?.count;
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="STAY IN THE LOOP"
        title="Notifications"
        description="Your equipment updates, with the next step always in view."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              void client.invalidateQueries({ queryKey: notificationKeys.all });
            }}
            disabled={notifications.isFetching}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </Button>
        }
      />
      <Card className="flex items-center gap-4 bg-secondary/50 p-5">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"
          aria-hidden="true"
        >
          <Bell size={22} />
        </span>
        <div>
          <strong className="text-sm font-semibold">
            {count !== undefined
              ? `${count} unread ${count === 1 ? 'notification' : 'notifications'}`
              : 'Your notification inbox'}
          </strong>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Return reminders and reservation decisions, together. Only notifications addressed to
            you appear here.
          </p>
        </div>
      </Card>
      {unread.isError && (
        <ErrorState message="Unread count is unavailable." onRetry={() => void unread.refetch()} />
      )}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <CardTitle>
              All updates
              {notifications.data && (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                  {notifications.data.totalElements}
                </span>
              )}
            </CardTitle>
            <CardDescription>All times are shown in Singapore time.</CardDescription>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            Sort by
            <Select
              className="min-h-9 w-auto py-1.5 text-xs"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(0);
              }}
            >
              <option value="deliveredAt,desc">Newest first</option>
              <option value="deliveredAt,asc">Oldest first</option>
            </Select>
          </label>
        </CardHeader>
        {read.isError && <ErrorState message={message(read.error)} />}
        {notifications.isError ? (
          <ErrorState
            message={message(notifications.error)}
            onRetry={() => void notifications.refetch()}
          />
        ) : (
          <DataTable
            columns={columns}
            data={notifications.data?.content ?? []}
            caption="Delivered notifications for your account"
            loading={notifications.isPending}
            rowClassName={(item) => (item.readAt ? undefined : 'bg-secondary/30')}
            empty={<EmptyState />}
            paging={{
              page,
              pageCount: Math.max(1, notifications.data?.totalPages ?? 1),
              onPageChange: setPage,
              busy: notifications.isFetching,
            }}
          />
        )}
      </Card>
    </div>
  );
}
