import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Detail, DetailList } from '@/components/ui/detail-list';
import { maintenanceStatus } from '@/lib/status';
import type { MaintenanceCase } from './queries';
import { enumLabel, personLabel, singaporeDate } from './format';
import { EquipmentName } from './EquipmentName';
export function MaintenanceCaseCard({
  item,
  historyLink = false,
  children,
}: {
  item: MaintenanceCase;
  /** Link the equipment to the operator lookup; only for views that operators see. */
  historyLink?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className="grid min-w-0 content-start gap-3 rounded-lg border border-border bg-card p-5">
      <StatusBadge status={maintenanceStatus[item.status]} className="justify-self-start" />
      <h3 className="m-0 text-sm font-semibold leading-snug">
        <Link
          to={'/maintenance/cases/' + item.maintenanceCaseId}
          className="text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
        >
          {item.faultDescription}
        </Link>
      </h3>
      <DetailList className="text-[13px] sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-y-1.5">
        <Detail label="Equipment">
          <EquipmentName item={item} linked={historyLink} />
        </Detail>
        <Detail label="Category">{enumLabel(item.faultCategory)}</Detail>
        <Detail label="Priority">{enumLabel(item.priority)}</Detail>
        <Detail label="Reported">{singaporeDate(item.reportedAt)}</Detail>
        <Detail label="Reporter">{personLabel(item.reportedByName, item.reportedBy)}</Detail>
        {item.assignedTo && (
          <Detail label="Technician">{personLabel(item.assignedToName, item.assignedTo)}</Detail>
        )}
        <Detail label="Version">{item.version}</Detail>
      </DetailList>
      {item.resolutionNote && (
        <p className="m-0 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
          {item.resolutionNote}
        </p>
      )}
      {children}
    </article>
  );
}
