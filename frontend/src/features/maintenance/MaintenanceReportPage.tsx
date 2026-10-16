import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/app/AuthProvider';
import { ChartColumn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/Feedback';
import { message } from '@/api/client';
import {
  durationLabel,
  hasAnyRole,
  periodSchema,
  singaporeDate,
  singaporeInstant,
  statusLabel,
  statuses,
} from './format';
import { useReport } from './queries';
function Report() {
  const [period, setPeriod] = useState({ from: '', to: '' });
  const form = useForm<{ from: string; to: string }>({
    resolver: zodResolver(periodSchema),
    defaultValues: { from: '', to: '' },
  });
  const query = useReport(period.from, period.to);
  return (
    <div className="grid min-w-0 gap-6">
      <Link
        to="/maintenance"
        className="justify-self-start text-xs text-primary underline underline-offset-4"
      >
        ← Maintenance workspace
      </Link>
      <PageHeader
        eyebrow="ADMIN INSIGHTS"
        title="Maintenance report"
        description="Choose a reporting period in Singapore time (SGT). End time is exclusive."
      />
      <Card>
        <form
          noValidate
          className="flex flex-wrap items-start gap-4 p-6"
          onSubmit={form.handleSubmit(({ from, to }) =>
            setPeriod({ from: singaporeInstant(from), to: singaporeInstant(to) }),
          )}
        >
          {(['from', 'to'] as const).map((field) => (
            <Field
              key={field}
              label={field === 'from' ? 'From (SGT, inclusive)' : 'To (SGT, exclusive)'}
              id={'report-' + field}
              className="min-w-0 flex-1 basis-56"
              error={form.formState.errors[field]?.message}
            >
              <Input type="datetime-local" {...form.register(field)} />
            </Field>
          ))}
          <Button className="sm:mt-6" disabled={query.isFetching}>
            <ChartColumn size={16} aria-hidden="true" />
            Generate report
          </Button>
        </form>
      </Card>
      {!period.from ? (
        <EmptyState
          icon={<ChartColumn size={26} />}
          className="min-h-0 py-10"
          title="No reporting period selected"
          description="Select both dates to view the report. No reporting period is selected."
        />
      ) : query.isPending ? (
        <Card className="p-6">
          <SkeletonBlock lines={4} />
        </Card>
      ) : query.isError ? (
        <ErrorState message={message(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <Card>
          <section aria-label="Report results" className="grid gap-6 p-6">
            <p className="m-0 text-xs text-muted-foreground">
              {singaporeDate(query.data.fromInclusive)} → {singaporeDate(query.data.toExclusive)}{' '}
              (exclusive)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Reported cases in selected period', query.data.reportedCaseCount],
                ['Completed cases in selected period', query.data.completedCaseCount],
                [
                  'Average completion duration',
                  durationLabel(query.data.averageCompletionDuration),
                ],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-3 rounded-lg bg-secondary/60 p-5">
                  <span className="text-xs leading-relaxed text-muted-foreground">{label}</span>
                  <strong className="text-2xl font-semibold tabular-nums [overflow-wrap:anywhere]">
                    {value}
                  </strong>
                </div>
              ))}
            </div>
            <div className="grid gap-1.5">
              <h2 className="m-0 text-sm font-semibold">Current cases by status</h2>
              <p className="m-0 text-xs text-muted-foreground">
                Current status totals; these counts are not limited to the selected reporting
                period.
              </p>
            </div>
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3">
              {statuses.map((status) => (
                <div key={status} className="grid gap-2 rounded-lg border border-border p-4">
                  <dt className="text-xs text-muted-foreground">{statusLabel(status)}</dt>
                  <dd className="m-0 text-xl font-semibold tabular-nums">
                    {query.data.casesByStatus[status] ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </Card>
      )}
    </div>
  );
}
export function MaintenanceReportPage() {
  const { user } = useAuth();
  return hasAnyRole(user?.roles, 'ADMIN') ? (
    <Report />
  ) : (
    <ErrorState message="Your account does not have access to maintenance reports." />
  );
}
