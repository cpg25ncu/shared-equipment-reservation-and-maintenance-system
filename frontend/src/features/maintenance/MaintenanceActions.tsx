import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ErrorState } from '@/components/Feedback';
import { message } from '@/api/client';
import { cardGrid, nonBlank } from './format';
import { useCaseAction, type Action, type MaintenanceCase } from './queries';
const labels: Record<Action, string> = {
  start: 'Start Maintenance',
  diagnosis: 'Record Diagnosis',
  'repair-actions': 'Record Repair Action',
  notes: 'Add Note',
  resolve: 'Resolve',
  unrepairable: 'Mark Unrepairable',
};
/** One id for every action on a case: the next outcome replaces the previous toast. */
const done = (text: string) => toast.success(text, { id: 'maintenance-action' });
const textSchema = z.object({ text: nonBlank });
function WorkForm({ caseId, action }: { caseId: string; action: Action }) {
  const mutation = useCaseAction(caseId);
  const [confirming, setConfirming] = useState(false);
  const form = useForm<{ text: string }>({
    resolver: zodResolver(textSchema),
    defaultValues: { text: '' },
  });
  const closing = action === 'resolve' || action === 'unrepairable';
  async function submit(text: string) {
    try {
      await mutation.mutateAsync({ action, text });
      form.reset();
      done(labels[action] + ' completed successfully.');
    } catch {
      /* The ProblemDetail is shown under the form. */
    } finally {
      setConfirming(false);
    }
  }
  return (
    <form
      className="grid content-start gap-3 rounded-lg border border-border bg-muted/40 p-4"
      noValidate
      onSubmit={form.handleSubmit(({ text }) => {
        if (action === 'unrepairable') setConfirming(true);
        else void submit(text);
      })}
    >
      <Field
        label={labels[action] + (closing ? ' — resolution note' : ' — details')}
        id={'work-' + action}
        error={form.formState.errors.text?.message}
      >
        <Textarea
          rows={3}
          className="bg-card"
          {...form.register('text')}
          disabled={mutation.isPending || confirming}
        />
      </Field>
      <Button
        className={
          action === 'unrepairable' ? 'justify-self-start text-destructive' : 'justify-self-start'
        }
        variant={action === 'unrepairable' ? 'outline' : 'default'}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Saving…' : labels[action]}
      </Button>
      {mutation.isError && <ErrorState message={message(mutation.error)} />}
      {action === 'unrepairable' && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Retire this equipment?"
          description="Marking this case not repairable retires the equipment: it keeps its history but can no longer be reserved. Confirm that it cannot be repaired."
          confirmLabel="Confirm unrepairable"
          destructive
          pending={mutation.isPending}
          onConfirm={() => submit(form.getValues('text'))}
        />
      )}
    </form>
  );
}
export function MaintenanceActions({ item }: { item: MaintenanceCase }) {
  const start = useCaseAction(item.maintenanceCaseId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance actions</CardTitle>
        <CardDescription>
          {item.status === 'ASSIGNED'
            ? 'Start the case when you begin work on the equipment.'
            : item.status === 'IN_PROGRESS'
              ? 'Record what you find and do; resolve the case or mark it not repairable.'
              : 'No further actions.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {item.status === 'ASSIGNED' && (
          <div className="grid justify-items-start gap-3">
            <Button
              disabled={start.isPending}
              onClick={() =>
                start.mutate(
                  { action: 'start', text: '' },
                  { onSuccess: () => done('Maintenance started successfully.') },
                )
              }
            >
              <Play size={16} aria-hidden="true" />
              {start.isPending ? 'Starting…' : 'Start Maintenance'}
            </Button>
            {start.isError && <ErrorState message={message(start.error)} />}
          </div>
        )}
        {item.status === 'IN_PROGRESS' && (
          <div className={cardGrid}>
            {(['diagnosis', 'repair-actions', 'notes', 'resolve', 'unrepairable'] as const).map(
              (action) => (
                <WorkForm key={action} action={action} caseId={item.maintenanceCaseId} />
              ),
            )}
          </div>
        )}
        {(item.status === 'RESOLVED' || item.status === 'UNREPAIRABLE') && (
          <p className="m-0 text-sm">This case is complete and read-only.</p>
        )}
      </CardContent>
    </Card>
  );
}
