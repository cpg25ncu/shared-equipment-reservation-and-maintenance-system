import { Wrench } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/Feedback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { message } from '@/api/client';
import { useAssignedCases } from './queries';
import { cardGrid, statusLabel, statuses } from './format';
import { MaintenanceCaseCard } from './MaintenanceCaseCard';
export function AssignedCaseList() {
  const query = useAssignedCases();
  return (
    <Card>
      <CardHeader>
        <CardTitle>My assigned cases</CardTitle>
        <CardDescription>
          Open a case to start work, record findings and resolve it.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {query.isPending ? (
          <SkeletonBlock />
        ) : query.isError ? (
          <ErrorState message={message(query.error)} onRetry={() => void query.refetch()} />
        ) : !query.data.some((item) => item.status !== 'OPEN') ? (
          <EmptyState
            icon={<Wrench size={26} />}
            className="min-h-0 py-8"
            title="No assigned maintenance cases."
            description="Cases a storekeeper assigns to you appear here."
          />
        ) : (
          statuses
            .filter((status) => status !== 'OPEN')
            .map((status) => {
              const items = query.data.filter((item) => item.status === status);
              return (
                items.length > 0 && (
                  <section key={status} aria-label={statusLabel(status)} className="grid gap-3">
                    <h3 className="m-0 text-sm font-semibold">
                      {statusLabel(status)}{' '}
                      <small className="font-normal text-muted-foreground">({items.length})</small>
                    </h3>
                    <div className={cardGrid}>
                      {items.map((item) => (
                        <MaintenanceCaseCard key={item.maintenanceCaseId} item={item} />
                      ))}
                    </div>
                  </section>
                )
              );
            })
        )}
      </CardContent>
    </Card>
  );
}
