import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { ErrorState, Notice } from '@/components/Feedback';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Detail, DetailList } from '@/components/ui/detail-list';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, SkeletonBlock } from '@/components/ui/skeleton';
import { message } from '@/api/client';
import { reservationStatus } from '@/lib/status';
import { isUuid, safeVersion, singaporeTime } from './format';
import { useApprovalDetail } from './queries';
import { DecisionForm } from './DecisionForm';

const backLink = (
  <Link
    to="/approvals"
    className="justify-self-start text-xs text-primary underline underline-offset-4"
  >
    ← Pending reservations
  </Link>
);

function RequestDetail({ id }: { id: string }) {
  const query = useApprovalDetail(id);
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const starts = Date.parse(query.data?.startAt ?? '');
  const pending = query.data?.status === 'PENDING_APPROVAL';
  const serverExpired = query.data?.expired;
  useEffect(() => {
    if (!pending || serverExpired || !Number.isFinite(starts) || starts <= Date.now()) return;
    const timer = window.setTimeout(
      () => setTick((value) => value + 1),
      Math.min(starts - Date.now() + 1, 2_147_483_647),
    );
    return () => window.clearTimeout(timer);
  }, [starts, pending, serverExpired, tick]);

  if (query.isPending)
    return (
      <div className="grid gap-6">
        {backLink}
        <Skeleton className="h-10 w-1/3" />
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <SkeletonBlock lines={6} />
          </Card>
          <Card className="p-6">
            <SkeletonBlock lines={4} />
          </Card>
        </div>
      </div>
    );
  if (!query.data)
    return <ErrorState message={message(query.error)} onRetry={() => void query.refetch()} />;
  const item = query.data;
  const expired = pending && (!!item.expired || (Number.isFinite(starts) && starts <= Date.now()));
  const own =
    !!item.requesterId &&
    !!user?.userId &&
    item.requesterId.toLowerCase() === user.userId.toLowerCase();
  const safe =
    isUuid(item.reservationId) &&
    item.reservationId.toLowerCase() === id.toLowerCase() &&
    isUuid(item.requesterId) &&
    isUuid(user?.userId) &&
    safeVersion(item.version) &&
    Number.isFinite(starts);
  async function refresh() {
    const result = await query.refetch();
    if (result.isError) throw result.error;
  }

  return (
    <div className="grid gap-6">
      {backLink}
      <PageHeader
        eyebrow="RESERVATION REVIEW"
        title="Request details"
        description="Check the equipment, applicant and reserved time before deciding."
        actions={
          <StatusBadge status={reservationStatus[item.status as keyof typeof reservationStatus]} />
        }
      />
      {query.isError && (
        <ErrorState message={message(query.error)} onRetry={() => void query.refetch()} />
      )}
      {expired && (
        <Notice tone="warning" role="status">
          This reservation has expired. You can still reject it to release the reserved time slot.
        </Notice>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <section aria-labelledby="reservation-heading">
            <CardHeader>
              <CardTitle id="reservation-heading" className="text-base">
                {item.equipment?.name ?? 'Reserved equipment'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList>
                <Detail label="Asset tag">{item.equipment?.assetTag ?? '—'}</Detail>
                <Detail label="Category">{item.equipment?.category ?? '—'}</Detail>
                <Detail label="Applicant">{item.requesterName ?? '—'}</Detail>
                <Detail label="Starts">{singaporeTime(item.startAt)}</Detail>
                <Detail label="Ends">{singaporeTime(item.endAt)}</Detail>
                <Detail label="Requested">{singaporeTime(item.createdAt)}</Detail>
                <Detail label="Purpose" className="whitespace-pre-wrap">
                  {item.purpose || 'Not provided'}
                </Detail>
              </DetailList>
            </CardContent>
          </section>
        </Card>
        <Card>
          <section aria-label="Approval decision" className="grid gap-4 p-6">
            {item.decision ? (
              <>
                <CardTitle className="text-base">Decision recorded</CardTitle>
                <DetailList>
                  <Detail label="Result">
                    {item.decision.decision === 'APPROVED'
                      ? 'Approved'
                      : item.decision.decision === 'REJECTED'
                        ? 'Rejected'
                        : 'Unavailable'}
                  </Detail>
                  <Detail label="Approver">{item.decision.approverId ?? '—'}</Detail>
                  <Detail label="Recorded">{singaporeTime(item.decision.decidedAt)}</Detail>
                  <Detail label="Comment" className="whitespace-pre-wrap">
                    {item.decision.comment || 'No comment'}
                  </Detail>
                </DetailList>
              </>
            ) : !pending ? (
              <>
                <CardTitle className="text-base">Reservation status</CardTitle>
                <p className="m-0 text-sm">This reservation is no longer waiting for approval.</p>
              </>
            ) : own ? (
              <Notice>You cannot approve or reject your own reservation.</Notice>
            ) : !safe ? (
              <ErrorState
                message="Unable to safely load this request. Refresh before continuing."
                onRetry={() => void query.refetch()}
              />
            ) : (
              <DecisionForm
                item={item}
                expired={expired}
                busy={query.isFetching || query.isError}
                refresh={refresh}
              />
            )}
          </section>
        </Card>
      </div>
      <Button
        variant="outline"
        className="justify-self-start"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        <RefreshCw size={16} aria-hidden="true" />
        Refresh details
      </Button>
    </div>
  );
}

export function ApprovalDetailPage() {
  const { reservationId = '' } = useParams();
  if (!isUuid(reservationId)) return <ErrorState message="This reservation link is invalid." />;
  return <RequestDetail key={reservationId} id={reservationId} />;
}
