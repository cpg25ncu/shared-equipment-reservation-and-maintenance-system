import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/Feedback';
import { message } from '@/api/client';
import { cardGrid, equipmentLabel, uuid } from './format';
import { useEquipmentCases, useEquipmentHistory } from './queries';
import { MaintenanceCaseCard } from './MaintenanceCaseCard';
import { MaintenanceHistory } from './MaintenanceHistory';
const schema = z.object({ equipmentId: uuid });
export function EquipmentHistoryLookup({
  initialEquipmentId = '',
}: {
  initialEquipmentId?: string;
}) {
  const [id, setId] = useState(initialEquipmentId);
  const section = useRef<HTMLElement>(null);
  const form = useForm<{ equipmentId: string }>({
    resolver: zodResolver(schema),
    defaultValues: { equipmentId: initialEquipmentId },
  });
  const cases = useEquipmentCases(id);
  const scrolled = useRef(false);
  useEffect(() => {
    // Opened from an equipment link: scroll once the cases are on the page. Scrolling earlier lets
    // the browser's scroll anchoring follow the inserted results to the bottom of the page.
    // jsdom has no scrollIntoView.
    if (!initialEquipmentId || scrolled.current || cases.isPending) return;
    scrolled.current = true;
    section.current?.scrollIntoView?.({ block: 'start' });
  }, [initialEquipmentId, cases.isPending]);
  const history = useEquipmentHistory(id);
  return (
    <Card>
      <section ref={section} aria-label="Equipment maintenance lookup" className="scroll-mt-6">
        <CardHeader>
          <CardTitle>Equipment maintenance lookup</CardTitle>
          <CardDescription>
            See every case and the full history of one item, including retired equipment. Select the
            equipment on a case to open it here, or enter its equipment ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <form
            noValidate
            className="flex flex-wrap items-start gap-3"
            onSubmit={form.handleSubmit(({ equipmentId }) => setId(equipmentId))}
          >
            <Field
              label="Equipment ID for history"
              id="lookup-equipment"
              className="min-w-0 flex-1 basis-72"
              error={form.formState.errors.equipmentId?.message}
            >
              <Input {...form.register('equipmentId')} />
            </Field>
            <Button className="sm:mt-6">Look up maintenance</Button>
          </form>
          {id && (
            <div className="grid gap-5 border-t border-border pt-5">
              <h3 className="m-0 text-base font-semibold [overflow-wrap:anywhere]">
                {cases.data?.[0] ? equipmentLabel(cases.data[0]) : 'Equipment ' + id}
              </h3>
              {cases.isPending ? (
                <SkeletonBlock />
              ) : cases.isError ? (
                <ErrorState message={message(cases.error)} onRetry={() => void cases.refetch()} />
              ) : !cases.data.length ? (
                <p className="m-0 text-sm text-muted-foreground">
                  No maintenance cases for this equipment.
                </p>
              ) : (
                <div className={cardGrid}>
                  {cases.data.map((item) => (
                    <MaintenanceCaseCard item={item} key={item.maintenanceCaseId} />
                  ))}
                </div>
              )}
              {history.isPending ? (
                <SkeletonBlock />
              ) : history.isError ? (
                <ErrorState
                  message={message(history.error)}
                  onRetry={() => void history.refetch()}
                />
              ) : (
                <MaintenanceHistory entries={history.data} />
              )}
            </div>
          )}
        </CardContent>
      </section>
    </Card>
  );
}
