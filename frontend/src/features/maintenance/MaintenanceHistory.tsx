import type { MaintenanceHistoryEntry } from './queries';
import { enumLabel, personLabel, singaporeDate, statusLabel } from './format';
export function MaintenanceHistory({ entries }: { entries: MaintenanceHistoryEntry[] }) {
  return (
    <section aria-label="Maintenance history" className="grid gap-3">
      <h2 className="m-0 text-sm font-semibold">Maintenance history</h2>
      {!entries.length ? (
        <p className="m-0 text-sm text-muted-foreground">No maintenance history yet.</p>
      ) : (
        <ol className="m-0 grid list-none gap-0 border-l-2 border-border py-0 pl-5">
          {entries.map((entry, index) => (
            <li key={index} className="relative grid gap-1 py-3 text-sm [overflow-wrap:anywhere]">
              <span
                aria-hidden="true"
                className="absolute -left-[1.6rem] top-[1.05rem] size-2.5 rounded-full bg-primary"
              />
              <strong className="font-semibold">{enumLabel(entry.action)}</strong>
              <p className="m-0">
                {entry.fromStatus ? statusLabel(entry.fromStatus) + ' → ' : ''}
                {statusLabel(entry.toStatus)}
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                {singaporeDate(entry.occurredAt)} · By {personLabel(entry.actorName, entry.actorId)}
              </p>
              {entry.detail && <p className="m-0 whitespace-pre-wrap">{entry.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
