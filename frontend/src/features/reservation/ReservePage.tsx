import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, Wrench } from 'lucide-react';
import { api, ApiError, message } from '@/api/client';
import { ErrorState, Notice } from '@/components/Feedback';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, SkeletonBlock } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { equipmentStatus, slotReason } from '@/lib/status';
import { formatRange, localToIso } from '@/lib/time';
import { equipmentKeys, useAvailability } from '@/features/equipment/queries';
import { reservationKeys } from './queries';
import { durationMinutes, durationText, reservationSchema, type ReservationForm } from './rules';
const LOOKAHEAD_DAYS = 14;
type Violation = { code: string; message: string };
/** UC01 step 2: check an item's held slots and submit a reservation. */
export function ReservePage() {
  const { equipmentId = '' } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [view] = useState(() => {
    const from = new Date();
    from.setSeconds(0, 0);
    const to = new Date(from.getTime() + LOOKAHEAD_DAYS * 24 * 3_600_000);
    return { from: from.toISOString(), to: to.toISOString() };
  });
  const availability = useAvailability(equipmentId, view.from, view.to);
  // The item's own limit (V005) once availability has loaded; react-hook-form reads the resolver
  // on every render, so validation follows it.
  const itemMaxMinutes = durationMinutes(availability.data?.equipment.maxBorrowDuration);
  const [failure, setFailure] = useState<{ detail: string; violations: Violation[] } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema(Date.now, itemMaxMinutes)),
    defaultValues: { startAt: query.get('from') ?? '', endAt: query.get('to') ?? '', purpose: '' },
  });
  const create = useMutation({
    mutationFn: async (values: ReservationForm) => {
      const { data } = await api.POST('/api/v1/reservations', {
        body: {
          equipmentId,
          startAt: localToIso(values.startAt)!,
          endAt: localToIso(values.endAt)!,
          purpose: values.purpose.trim() || undefined,
        },
      });
      return data!;
    },
    onSuccess: async (created) => {
      await client.invalidateQueries({ queryKey: reservationKeys.all });
      await client.invalidateQueries({ queryKey: equipmentKeys.all });
      navigate('/reservations', { state: { created } });
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        const p = e.problem as typeof e.problem & { violations?: Violation[] };
        if (e.status === 400 && p.errors?.length) {
          for (const f of p.errors)
            if (f.field === 'startAt' || f.field === 'endAt' || f.field === 'purpose')
              setError(f.field, { message: f.message });
        }
        if (e.status === 409) void availability.refetch();
        setFailure({ detail: message(e), violations: p.violations ?? [] });
      } else setFailure({ detail: message(e), violations: [] });
    },
  });
  if (availability.isPending)
    return (
      <div className="grid gap-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-1/2" />
        <Card className="p-6">
          <SkeletonBlock lines={4} />
        </Card>
      </div>
    );
  if (availability.isError)
    return (
      <ErrorState
        message={message(availability.error)}
        onRetry={() => void availability.refetch()}
      />
    );
  const a = availability.data;
  const blocked = a.equipment.status === 'UNDER_MAINTENANCE' || a.openMaintenance;
  return (
    <div className="grid gap-6">
      <Link
        className="inline-flex items-center gap-1.5 justify-self-start text-xs text-muted-foreground hover:text-foreground"
        to="/equipment"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to search
      </Link>
      <PageHeader
        eyebrow={`RESERVE · ${a.equipment.assetTag}`}
        title={a.equipment.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {a.equipment.category} · {a.equipment.location}
            <StatusBadge status={equipmentStatus[a.equipment.status]} />
          </span>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Your reservation</CardTitle>
            <CardDescription>Choose the time in Singapore time.</CardDescription>
          </CardHeader>
          <CardContent>
            {blocked ? (
              <Notice tone="warning" role="status">
                <Wrench size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
                This equipment has a reported fault or is being repaired, so it cannot be reserved
                right now.
              </Notice>
            ) : (
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={handleSubmit((v) => {
                  setFailure(null);
                  create.mutate(v);
                })}
                noValidate
              >
                <Field label="Start (SGT)" id="startAt" error={errors.startAt?.message}>
                  <Input type="datetime-local" {...register('startAt')} />
                </Field>
                <Field label="End (SGT)" id="endAt" error={errors.endAt?.message}>
                  <Input type="datetime-local" {...register('endAt')} />
                </Field>
                <Field
                  label="Purpose (optional)"
                  id="purpose"
                  className="sm:col-span-2"
                  error={errors.purpose?.message}
                >
                  <Textarea rows={3} {...register('purpose')} />
                </Field>
                {(itemMaxMinutes !== null || a.equipment.requiresApproval) && (
                  <ul className="m-0 grid list-disc gap-1 pl-5 text-xs leading-relaxed text-muted-foreground sm:col-span-2">
                    {itemMaxMinutes !== null && (
                      <li>This item can be reserved for at most {durationText(itemMaxMinutes)}.</li>
                    )}
                    {a.equipment.requiresApproval && (
                      <li>
                        This equipment needs approval. Your request waits for an approver before it
                        is confirmed.
                      </li>
                    )}
                  </ul>
                )}
                {failure && (
                  <Notice tone="danger" role="alert" className="block sm:col-span-2">
                    <strong>{failure.detail}</strong>
                    {failure.violations.length > 1 && (
                      <ul className="mb-0 mt-1.5 pl-5">
                        {failure.violations.map((v) => (
                          <li key={v.code}>{v.message}</li>
                        ))}
                      </ul>
                    )}
                  </Notice>
                )}
                <Button type="submit" className="justify-self-start" disabled={create.isPending}>
                  <CalendarPlus size={16} aria-hidden="true" />
                  {create.isPending
                    ? 'Reserving…'
                    : a.equipment.requiresApproval
                      ? 'Request reservation'
                      : 'Reserve'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Taken in the next {LOOKAHEAD_DAYS} days
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                {a.busySlots.length}
              </span>
            </CardTitle>
            <CardDescription>Pick a time outside these slots.</CardDescription>
          </CardHeader>
          {a.busySlots.length === 0 ? (
            <CardContent>
              <p className="m-0 text-sm text-muted-foreground">
                Nothing booked yet — every slot is open.
              </p>
            </CardContent>
          ) : (
            <ul className="m-0 list-none border-t border-border p-0" aria-label="Taken time slots">
              {a.busySlots.map((s) => (
                <li
                  key={s.startAt}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-3 text-sm last:border-b-0"
                >
                  <span>{formatRange(s.startAt, s.endAt)}</span>
                  <Badge tone={s.reason === 'PENDING_APPROVAL' ? 'pending' : 'muted'}>
                    {slotReason[s.reason] ?? s.reason}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
