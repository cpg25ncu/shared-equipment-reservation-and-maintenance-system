import { Link, useSearchParams } from 'react-router';
import { ChartColumn } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { ErrorState } from '@/components/Feedback';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { hasAnyRole, uuid, workspaceRoles } from './format';
import { ReportFaultForm } from './ReportFaultForm';
import { OpenCaseQueue } from './OpenCaseQueue';
import { AssignedCaseList } from './AssignedCaseList';
import { EquipmentHistoryLookup } from './EquipmentHistoryLookup';
export function MaintenanceHomePage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const requested = uuid.safeParse(params.get('history'));
  const history = requested.success ? requested.data : '';
  if (!hasAnyRole(user?.roles, ...workspaceRoles))
    return <ErrorState message="Your account does not have access to the maintenance workspace." />;
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        eyebrow="EQUIPMENT CARE"
        title="Maintenance"
        description="Report faults, coordinate repairs and track equipment care."
        actions={
          hasAnyRole(user?.roles, 'ADMIN') && (
            <Button asChild variant="outline">
              <Link to="/maintenance/report">
                <ChartColumn size={16} aria-hidden="true" />
                Maintenance report
              </Link>
            </Button>
          )
        }
      />
      {hasAnyRole(user?.roles, 'BORROWER', 'CUSTODIAN') && <ReportFaultForm />}
      {hasAnyRole(user?.roles, 'CUSTODIAN', 'ADMIN') && <OpenCaseQueue />}
      {hasAnyRole(user?.roles, 'MAINTAINER') && <AssignedCaseList />}
      {/* A new ?history= value remounts the lookup so it starts from that equipment. */}
      {hasAnyRole(user?.roles, 'CUSTODIAN', 'ADMIN') && (
        <EquipmentHistoryLookup key={history} initialEquipmentId={history} />
      )}
    </div>
  );
}
