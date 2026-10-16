import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { CalendarCheck, CircleCheck, X } from 'lucide-react';
import { api, message } from '@/api/client';
import type { components } from '@/api/schema';
import { EmptyState, ErrorState, Notice } from '@/components/Feedback';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { reservationStatus } from '@/lib/status';
import { formatRange } from '@/lib/time';
import { equipmentKeys } from '@/features/equipment/queries';
import { reservationKeys, useMyReservations, type ReservationStatus } from './queries';
type Reservation = components['schemas']['ReservationView'];
const FILTERS: { value: ReservationStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING_APPROVAL', label: reservationStatus.PENDING_APPROVAL.label },
  { value: 'CONFIRMED', label: reservationStatus.CONFIRMED.label },
  { value: 'FULFILLED', label: reservationStatus.FULFILLED.label },
  { value: 'REJECTED', label: reservationStatus.REJECTED.label },
  { value: 'CANCELLED', label: reservationStatus.CANCELLED.label },
];
const column = createColumnHelper<Reservation>();
/** UC01: the borrower's own reservations, with cancel until checkout. */
export function MyReservationsPage() {
  const location = useLocation();
  const created = (location.state as { created?: Reservation } | null)?.created;
  const [status, setStatus] = useState<ReservationStatus | ''>('');
  const [page, setPage] = useState(0);
  const [confirming, setConfirming] = useState<Reservation | null>(null);
  const client = useQueryClient();
  const list = useMyReservations(status || undefined, page);
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.POST('/api/v1/reservations/{id}/cancel', {
        params: { path: { id } },
      });
      return data!;
    },
    onSuccess: (item) =>
      toast.success(`Reservation for ${item.equipmentName} cancelled.`, {
        id: 'reservation-cancelled',
      }),
    onSettled: () => {
      setConfirming(null);
      void client.invalidateQueries({ queryKey: reservationKeys.all });
      void client.invalidateQueries({ queryKey: equipmentKeys.all });
    },
  });
  const columns = useMemo(
    () => [
      column.accessor('equipmentName', {
        header: 'Equipment',
        cell: (info) => (
          <>
            <strong>{info.getValue()}</strong>
            <small className="cell-sub">
              {info.row.original.assetTag} · {info.row.original.location}
            </small>
            {info.row.original.purpose && (
              <small className="cell-sub">{info.row.original.purpose}</small>
            )}
          </>
        ),
      }),
      column.accessor('startAt', {
        header: 'When (SGT)',
        cell: (info) => formatRange(info.getValue(), info.row.original.endAt),
      }),
      column.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={reservationStatus[info.getValue()]} />,
      }),
      column.display({
        id: 'action',
        header: () => <span className="sr-only">Action</span>,
        cell: (info) =>
          info.row.original.cancellable && (
            <div className="row-actions">
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Cancel reservation for ${info.row.original.equipmentName}`}
                onClick={() => setConfirming(info.row.original)}
              >
                <X size={15} aria-hidden="true" />
                Cancel
              </Button>
            </div>
          ),
      }),
    ],
    [],
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="YOUR BOOKINGS"
        title="My reservations"
        description="Cancel any reservation until the equipment is checked out."
        actions={
          <Button asChild>
            <Link to="/equipment">
              <CalendarCheck size={16} aria-hidden="true" />
              New reservation
            </Link>
          </Button>
        }
      />
      {created && (
        <Notice tone="success" role="status">
          <CircleCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          {created.status === 'PENDING_APPROVAL'
            ? `Request sent for ${created.equipmentName}. You will be notified when an approver decides.`
            : `${created.equipmentName} is reserved for ${formatRange(created.startAt, created.endAt)}.`}
        </Notice>
      )}
      {cancel.isError && <ErrorState message={message(cancel.error)} />}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <CardTitle>
              Reservations
              {list.data && (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                  {list.data.totalElements}
                </span>
              )}
            </CardTitle>
            <CardDescription>Latest start time first. Times are Singapore time.</CardDescription>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            Show
            <Select
              className="min-h-9 w-auto py-1.5 text-xs"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ReservationStatus | '');
                setPage(0);
              }}
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </label>
        </CardHeader>
        {list.isError ? (
          <ErrorState message={message(list.error)} onRetry={() => void list.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={list.data?.content ?? []}
            caption="Your reservations"
            loading={list.isPending}
            getRowId={(item) => item.reservationId}
            empty={
              <EmptyState
                icon={<CalendarCheck size={26} />}
                title="No reservations yet"
                description={
                  status
                    ? 'None with this status. Choose All to see every reservation.'
                    : 'Find equipment and reserve a time slot to see it here.'
                }
              />
            }
            paging={{
              page,
              pageCount: Math.max(1, list.data?.totalPages ?? 1),
              onPageChange: setPage,
              busy: list.isFetching,
            }}
          />
        )}
      </Card>
      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Cancel this reservation?"
        description={
          confirming
            ? `${confirming.equipmentName}, ${formatRange(confirming.startAt, confirming.endAt)} SGT. The time slot is released for others; this cannot be undone.`
            : ''
        }
        confirmLabel="Yes, cancel"
        cancelLabel="Keep"
        destructive
        pending={cancel.isPending}
        onConfirm={() => {
          if (confirming) cancel.mutate(confirming.reservationId);
        }}
      />
    </div>
  );
}
