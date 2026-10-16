import { Link, useParams } from 'react-router';
import { useAuth } from '@/app/AuthProvider';
import { ErrorState } from '@/components/Feedback';
import { StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Detail, DetailList } from '@/components/ui/detail-list';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, SkeletonBlock } from '@/components/ui/skeleton';
import { maintenanceStatus } from '@/lib/status';
import { message } from '@/api/client';
import { enumLabel, hasAnyRole, personLabel, singaporeDate, uuid } from './format';
import { useCase, useHistory } from './queries';
import { MaintenanceHistory } from './MaintenanceHistory';
import { MaintenanceActions } from './MaintenanceActions';
import { EquipmentName } from './EquipmentName';
const backToWorkspace = (
  <Link
    to="/maintenance"
    className="justify-self-start text-xs text-primary underline underline-offset-4"
  >
    ← Maintenance workspace
  </Link>
);
function CaseDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const query = useCase(id);
  const history = useHistory(id);
  if (query.isPending)
    return (
      <div className="grid gap-6">
        {backToWorkspace}
        <Skeleton className="h-10 w-1/3" />
        <Card className="p-6">
          <SkeletonBlock lines={6} />
        </Card>
      </div>
    );
  if (query.isError)
    return <ErrorState message={message(query.error)} onRetry={() => void query.refetch()} />;
  const item = query.data;
  return (
    <div className="grid min-w-0 gap-6">
      {backToWorkspace}
      <PageHeader
        eyebrow="MAINTENANCE CASE"
        title="Case details"
        actions={<StatusBadge status={maintenanceStatus[item.status]} />}
      />
      <Card>
        <CardHeader>
          <CardTitle className="whitespace-pre-wrap text-base [overflow-wrap:anywhere]">
            {item.faultDescription}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Case ID">{item.maintenanceCaseId}</Detail>
            <Detail label="Equipment">
              <EquipmentName item={item} linked={hasAnyRole(user?.roles, 'CUSTODIAN', 'ADMIN')} />
            </Detail>
            <Detail label="Fault category">{enumLabel(item.faultCategory)}</Detail>
            <Detail label="Priority">{enumLabel(item.priority)}</Detail>
            <Detail label="Reporter">{personLabel(item.reportedByName, item.reportedBy)}</Detail>
            <Detail label="Assigned technician">
              {item.assignedTo ? personLabel(item.assignedToName, item.assignedTo) : 'Not assigned'}
            </Detail>
            <Detail label="Reported time">{singaporeDate(item.reportedAt)}</Detail>
            {item.loanId && <Detail label="Loan ID">{item.loanId}</Detail>}
            <Detail label="Version">{item.version}</Detail>
            {(item.status === 'RESOLVED' || item.status === 'UNREPAIRABLE') && (
              <>
                <Detail label="Resolution note" className="whitespace-pre-wrap">
                  {item.resolutionNote}
                </Detail>
                <Detail label="Completed time">{singaporeDate(item.resolvedAt)}</Detail>
              </>
            )}
          </DetailList>
        </CardContent>
      </Card>
      {hasAnyRole(user?.roles, 'MAINTAINER') && item.assignedTo === user?.userId && (
        <MaintenanceActions item={item} />
      )}
      <Card className="p-6">
        {history.isPending ? (
          <SkeletonBlock />
        ) : history.isError ? (
          <ErrorState message={message(history.error)} onRetry={() => void history.refetch()} />
        ) : (
          <MaintenanceHistory entries={history.data} />
        )}
      </Card>
    </div>
  );
}
export function MaintenanceCasePage() {
  const { caseId = '' } = useParams();
  const { user } = useAuth();
  if (!hasAnyRole(user?.roles, 'CUSTODIAN', 'ADMIN', 'MAINTAINER'))
    return <ErrorState message="Your account does not have access to maintenance case details." />;
  if (!uuid.safeParse(caseId).success)
    return <ErrorState message="Enter a valid maintenance case UUID." />;
  return <CaseDetail id={caseId} />;
}
