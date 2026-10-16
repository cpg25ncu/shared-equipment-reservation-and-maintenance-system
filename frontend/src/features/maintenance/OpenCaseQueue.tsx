import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/Feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { message } from '@/api/client';
import {
  useAssignment,
  useOpenCases,
  useTechnicians,
  type MaintenanceCase,
  type Priority,
} from './queries';
import { cardGrid, enumLabel, priorities } from './format';
import { MaintenanceCaseCard } from './MaintenanceCaseCard';
function Assignment({
  item,
  technicians,
}: {
  item: MaintenanceCase;
  technicians: NonNullable<ReturnType<typeof useTechnicians>['data']>;
}) {
  const [technician, setTechnician] = useState('');
  // A successful assignment removes this OPEN card, so the outcome is a toast, not card content.
  const mutation = useAssignment(item.maintenanceCaseId, () =>
    toast.success('Technician assigned successfully.', { id: 'technician-assigned' }),
  );
  const id = 'assign-' + item.maintenanceCaseId;
  return (
    <form
      className="grid gap-2 border-t border-border pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (technician) mutation.mutate(technician);
      }}
    >
      <Label htmlFor={id}>Assign technician</Label>
      <Select
        id={id}
        required
        value={technician}
        onChange={(event) => setTechnician(event.target.value)}
        disabled={mutation.isPending || !technicians.length}
      >
        <option value="">Select an active technician</option>
        {technicians.map((tech) => (
          <option key={tech.userId} value={tech.userId}>
            {tech.displayName} · {tech.email}
          </option>
        ))}
      </Select>
      <Button className="justify-self-start" disabled={!technician || mutation.isPending}>
        {mutation.isPending ? 'Assigning…' : 'Assign technician'}
      </Button>
      {mutation.isError && <ErrorState message={message(mutation.error)} />}
    </form>
  );
}
const rank = (priority: Priority) => priorities.indexOf(priority);
export function OpenCaseQueue() {
  const cases = useOpenCases();
  const technicians = useTechnicians();
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [sort, setSort] = useState<'oldest' | 'priority'>('oldest');
  // The server lists oldest first; filtering and the priority sort are view choices. The sort is
  // stable, so equal priorities keep the oldest-first order.
  const shown = (cases.data ?? []).filter(
    (item) => !priorityFilter || item.priority === priorityFilter,
  );
  if (sort === 'priority') shown.sort((a, b) => rank(a.priority) - rank(b.priority));
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <CardTitle>Open maintenance queue</CardTitle>
          <CardDescription>Review faults and assign an active maintainer.</CardDescription>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="queue-priority">Priority</Label>
            <Select
              id="queue-priority"
              className="min-h-10 w-auto min-w-40 py-2"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as Priority | '')}
            >
              <option value="">All priorities</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {enumLabel(priority)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="queue-sort">Sort</Label>
            <Select
              id="queue-sort"
              className="min-h-10 w-auto min-w-40 py-2"
              value={sort}
              onChange={(event) => setSort(event.target.value as 'oldest' | 'priority')}
            >
              <option value="oldest">Oldest report first</option>
              <option value="priority">Highest priority first</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {cases.isPending ? (
          <SkeletonBlock />
        ) : cases.isError ? (
          <ErrorState message={message(cases.error)} onRetry={() => void cases.refetch()} />
        ) : !cases.data.length ? (
          <EmptyState
            icon={<Wrench size={26} />}
            className="min-h-0 py-8"
            title="No open maintenance cases."
            description="Reported faults wait here until a technician is assigned."
          />
        ) : !shown.length ? (
          <EmptyState
            icon={<Wrench size={26} />}
            className="min-h-0 py-8"
            title="No open cases with this priority."
            description="Choose All priorities to see every open case."
          />
        ) : (
          <div className={cardGrid}>
            {shown.map((item) => (
              <MaintenanceCaseCard key={item.maintenanceCaseId} item={item} historyLink>
                {technicians.isPending ? (
                  <p role="status" className="m-0 text-xs text-muted-foreground">
                    Loading technicians…
                  </p>
                ) : technicians.isError ? (
                  <ErrorState
                    message={message(technicians.error)}
                    onRetry={() => void technicians.refetch()}
                  />
                ) : (
                  <>
                    <Assignment item={item} technicians={technicians.data} />
                    {!technicians.data.length && (
                      <p className="m-0 text-xs text-muted-foreground">
                        No active technicians available.
                      </p>
                    )}
                  </>
                )}
              </MaintenanceCaseCard>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
