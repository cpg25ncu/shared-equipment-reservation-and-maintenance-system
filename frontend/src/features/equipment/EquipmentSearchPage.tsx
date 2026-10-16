import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { PackageSearch, Search } from 'lucide-react';
import type { components } from '@/api/schema';
import { message } from '@/api/client';
import { useAuth } from '@/app/AuthProvider';
import { EmptyState, ErrorState } from '@/components/Feedback';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { localToIso } from '@/lib/time';
import { equipmentStatus } from '@/lib/status';
import { useEquipmentFilters, useEquipmentSearch } from './queries';
type Equipment = components['schemas']['EquipmentView'];
const MAX_WINDOW_MS = 90 * 24 * 3600 * 1000;
export const searchSchema = z
  .object({
    q: z.string().max(100, 'Keep the search under 100 characters.'),
    category: z.string(),
    location: z.string(),
    from: z.string(),
    to: z.string(),
    availableOnly: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const from = localToIso(v.from);
    const to = localToIso(v.to);
    if (v.from && !from)
      ctx.addIssue({ code: 'custom', path: ['from'], message: 'Enter a valid start time.' });
    if (v.to && !to)
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Enter a valid end time.' });
    if (v.from && !v.to)
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Enter an end time too.' });
    if (!v.from && v.to)
      ctx.addIssue({ code: 'custom', path: ['from'], message: 'Enter a start time too.' });
    if (from && to) {
      const span = Date.parse(to) - Date.parse(from);
      if (span <= 0)
        ctx.addIssue({ code: 'custom', path: ['to'], message: 'The end must be after the start.' });
      else if (span > MAX_WINDOW_MS)
        ctx.addIssue({
          code: 'custom',
          path: ['to'],
          message: 'Search at most 90 days at a time.',
        });
    }
    if (v.availableOnly && !(v.from && v.to))
      ctx.addIssue({
        code: 'custom',
        path: ['availableOnly'],
        message: 'Choose a time window to see only free equipment.',
      });
  });
type SearchForm = z.infer<typeof searchSchema>;
const helper = createColumnHelper<Equipment>();
/** Columns shown from 1280px; narrower screens read them under the equipment name. */
const secondary = 'hidden xl:table-cell';
/** UC01 step 1: find equipment by name, category, location and a time window. */
export function EquipmentSearchPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const isBorrower = !!user?.roles?.includes('BORROWER');
  const canReportFault = !!user?.roles?.some((role) => ['BORROWER', 'CUSTODIAN'].includes(role));
  const current: SearchForm = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    location: params.get('location') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    availableOnly: params.get('available') === '1',
  };
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0);
  const valid = searchSchema.safeParse(current).success;
  const fromIso = localToIso(current.from) ?? undefined;
  const toIso = localToIso(current.to) ?? undefined;
  const filters = useEquipmentFilters();
  const results = useEquipmentSearch({
    q: current.q || undefined,
    category: current.category || undefined,
    location: current.location || undefined,
    from: valid ? fromIso : undefined,
    to: valid ? toIso : undefined,
    availableOnly: valid && current.availableOnly ? true : undefined,
    page,
  });
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<SearchForm>({ resolver: zodResolver(searchSchema), values: current });
  const hasWindow = !!(watch('from') && watch('to'));
  function search(values: SearchForm) {
    const next = new URLSearchParams();
    if (values.q.trim()) next.set('q', values.q.trim());
    if (values.category) next.set('category', values.category);
    if (values.location) next.set('location', values.location);
    if (values.from) next.set('from', values.from);
    if (values.to) next.set('to', values.to);
    if (values.availableOnly) next.set('available', '1');
    setParams(next);
  }
  function goTo(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set('page', String(nextPage));
    setParams(next);
  }
  const windowQuery =
    current.from && current.to && valid
      ? `?from=${encodeURIComponent(current.from)}&to=${encodeURIComponent(current.to)}`
      : '';
  const columns = useMemo(
    () => [
      helper.accessor('name', {
        header: 'Equipment',
        cell: (info) => (
          <div>
            <strong>{info.getValue()}</strong>
            <small className="cell-sub">
              {info.row.original.assetTag}
              {/* The category and location columns give way to this line below 1280px. */}
              <span className="xl:hidden">
                {' '}
                · {info.row.original.category} · {info.row.original.location}
              </span>
            </small>
          </div>
        ),
      }),
      helper.accessor('category', { header: 'Category', meta: { className: secondary } }),
      helper.accessor('location', { header: 'Location', meta: { className: secondary } }),
      helper.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={equipmentStatus[info.getValue()]} />,
      }),
      helper.accessor('availableInWindow', {
        header: 'Chosen time',
        cell: (info) =>
          info.getValue() == null ? (
            <span className="text-xs text-muted-foreground">Pick a time</span>
          ) : info.getValue() ? (
            <Badge tone="ok">Free</Badge>
          ) : (
            <Badge tone="bad">Not free</Badge>
          ),
      }),
      helper.display({
        id: 'action',
        header: () => <span className="sr-only">Action</span>,
        cell: (info) => {
          const e = info.row.original;
          const canTry =
            isBorrower && e.status !== 'UNDER_MAINTENANCE' && e.availableInWindow !== false;
          return (
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild size="sm" variant={canTry ? 'default' : 'outline'}>
                <Link
                  to={`/equipment/${e.equipmentId}/reserve${windowQuery}`}
                  aria-label={`${canTry ? 'Reserve' : 'View availability of'} ${e.name}`}
                >
                  {canTry ? 'Reserve' : 'Availability'}
                </Link>
              </Button>
              {canReportFault && (
                <Button asChild size="sm" variant="outline">
                  <Link
                    to={`/maintenance?equipmentId=${e.equipmentId}`}
                    aria-label={`Report a fault for ${e.name}`}
                  >
                    Report fault
                  </Link>
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [isBorrower, canReportFault, windowQuery],
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="SEARCH AND RESERVE"
        title="Find equipment"
        description="Search by name, category or location, and add a time to see what is free."
      />
      <Card>
        <form
          className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={handleSubmit(search)}
          noValidate
          aria-label="Search equipment"
        >
          <Field
            label="Name or asset tag"
            id="q"
            className="sm:col-span-2"
            error={errors.q?.message}
          >
            <Input placeholder="e.g. Canon, CAM-001" {...register('q')} />
          </Field>
          <Field label="Category" id="category">
            <Select {...register('category')}>
              <option value="">All categories</option>
              {filters.data?.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location" id="location">
            <Select {...register('location')}>
              <option value="">All locations</option>
              {filters.data?.locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From (SGT)" id="from" error={errors.from?.message}>
            <Input type="datetime-local" {...register('from')} />
          </Field>
          <Field label="Until (SGT)" id="to" error={errors.to?.message}>
            <Input type="datetime-local" {...register('to')} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-6">
            <div className="grid gap-1">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  disabled={!hasWindow}
                  {...register('availableOnly')}
                />
                Only show free equipment
              </label>
              {errors.availableOnly && (
                <p className="m-0 text-xs text-destructive">{errors.availableOnly.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset({
                    q: '',
                    category: '',
                    location: '',
                    from: '',
                    to: '',
                    availableOnly: false,
                  });
                  setParams(new URLSearchParams());
                }}
              >
                Clear
              </Button>
              <Button type="submit">
                <Search size={16} aria-hidden="true" />
                Search
              </Button>
            </div>
          </div>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            Results
            {results.data && (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                {results.data.totalElements}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Sorted by name. Times are Singapore time. “Free” means nobody holds the slot and the
            equipment is not under repair right now; the final check happens when you reserve.
          </CardDescription>
        </CardHeader>
        {results.isError ? (
          <ErrorState message={message(results.error)} onRetry={() => void results.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={results.data?.content ?? []}
            caption="Equipment matching your search"
            loading={results.isPending}
            getRowId={(item) => item.equipmentId}
            empty={
              <EmptyState
                icon={<PackageSearch size={26} />}
                title="No equipment matches"
                description="Try fewer filters or a different time."
              />
            }
            paging={{
              page,
              pageCount: Math.max(1, results.data?.totalPages ?? 1),
              onPageChange: goTo,
              busy: results.isFetching,
            }}
          />
        )}
      </Card>
    </div>
  );
}
