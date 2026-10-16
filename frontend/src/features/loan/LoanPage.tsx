import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Boxes, CircleCheck, PackageCheck, Search } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { ApiError, message } from '@/api/client';
import { EmptyState, ErrorState, Notice } from '@/components/Feedback';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Pager } from '@/components/ui/pager';
import { Select } from '@/components/ui/select';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { loanDisplay, reservationStatus } from '@/lib/status';
import { formatDateTime, formatRange } from '@/lib/time';
import {
  checkoutEquipment,
  receiveReturn,
  useCheckouts,
  useLoans,
  type Checkout,
  type Loan,
} from './queries';

const PAGE = 20;
const time = formatDateTime;

/** One reservation or loan in a list: what it is, who has it, and the action on the right. */
function Item({
  title,
  badges,
  lines,
  action,
}: {
  title: string;
  badges: ReactNode;
  lines: ReactNode[];
  action?: ReactNode;
}) {
  return (
    <li className="border-t border-border first:border-t-0">
      <article className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-sm font-semibold [overflow-wrap:anywhere]">{title}</h3>
            {badges}
          </div>
          {lines.map((line, index) => (
            <p
              key={index}
              className="m-0 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]"
            >
              {line}
            </p>
          ))}
        </div>
        {action}
      </article>
    </li>
  );
}

function List({
  label,
  query,
  empty,
  children,
}: {
  label: string;
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  empty: ReactNode;
  children: ReactNode[] | undefined;
}) {
  if (query.isPending) return <SkeletonBlock className="px-6 pb-6" />;
  if (query.isError)
    return <ErrorState message={message(query.error)} onRetry={() => void query.refetch()} />;
  if (!children?.length) return <>{empty}</>;
  return (
    <ul aria-label={label} className="m-0 list-none border-t border-border p-0">
      {children}
    </ul>
  );
}

export function LoanPage() {
  const { user } = useAuth();
  const custodian = user?.roles.includes('CUSTODIAN') ?? false;
  const [page, setPage] = useState(0);
  const [queuePage, setQueuePage] = useState(0);
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const loans = useLoans(activeOnly, page, custodian ? search : '');
  const checkouts = useCheckouts(custodian, queuePage, search);
  const client = useQueryClient();
  const [checkout, setCheckout] = useState<Checkout>();
  const [returning, setReturning] = useState<Loan>();
  const [confirmed, setConfirmed] = useState(false);
  const [condition, setCondition] = useState('GOOD');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const handover = checkout ?? returning;
  function close() {
    setCheckout(undefined);
    setReturning(undefined);
    setConfirmed(false);
  }
  async function submit() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (checkout) await checkoutEquipment(checkout, confirmed);
      else if (returning) await receiveReturn(returning, condition, note);
      close();
      // Stays on the page rather than in a toast: the custodian is mid-handover, and a second
      // handover replaces the message only once it has been saved.
      setSuccess('Handover recorded successfully.');
      await Promise.all(
        ['loans', 'checkouts', 'reservations', 'equipment', 'maintenance'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
    } catch (e) {
      setError(message(e));
      if (e instanceof ApiError && e.status === 409) close();
      await Promise.all(
        ['loans', 'checkouts'].map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
    } finally {
      setBusy(false);
    }
  }
  function clearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(0);
    setQueuePage(0);
  }
  const failure = error && (
    <Notice tone="danger" role="alert">
      {error}
    </Notice>
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={custodian ? 'PHYSICAL HANDOVER' : 'YOUR LOANS'}
        title={custodian ? 'Checkout and returns' : 'My loans'}
        description="Record physical handover and receipt. Times are shown in Singapore time."
      />
      {!handover && failure}
      {success && (
        <Notice tone="success" role="status">
          <CircleCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          {success}
        </Notice>
      )}
      {custodian && (
        <Card>
          <form
            className="flex flex-wrap items-end gap-3 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
              setPage(0);
              setQueuePage(0);
            }}
          >
            <Field
              label="Find reservation, borrower or equipment code"
              className="min-w-0 flex-1 basis-72"
            >
              <Input
                value={searchInput}
                maxLength={100}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </Field>
            <Button type="submit" className="min-h-[46px]">
              <Search size={16} aria-hidden="true" />
              Search
            </Button>
            {search && (
              <Button type="button" variant="ghost" className="min-h-[46px]" onClick={clearSearch}>
                Clear search
              </Button>
            )}
          </form>
        </Card>
      )}
      {custodian && (
        <Card>
          <section aria-label="Checkout queue">
            <CardHeader>
              <CardTitle>Confirmed reservations</CardTitle>
              <CardDescription>
                Check out once the reservation has started and you have seen the borrower.
              </CardDescription>
            </CardHeader>
            <List
              label="Reservations awaiting checkout"
              query={checkouts}
              empty={
                <EmptyState
                  icon={<PackageCheck size={26} />}
                  className="min-h-0 py-8"
                  title={search ? 'No reservations match your search.' : 'Nothing to hand over'}
                  description={
                    search
                      ? 'Try another code or name.'
                      : 'No confirmed reservations awaiting checkout.'
                  }
                />
              }
            >
              {checkouts.data?.map((item) => {
                const early = Date.now() < Date.parse(item.startAt);
                return (
                  <Item
                    key={item.reservationId}
                    title={`${item.equipmentName} (${item.assetTag})`}
                    badges={
                      early ? (
                        <Badge tone="pending">Starts later</Badge>
                      ) : (
                        <StatusBadge status={reservationStatus.CONFIRMED} />
                      )
                    }
                    lines={[
                      `${item.borrowerName} · borrower ID ${item.borrowerId}`,
                      `${formatRange(item.startAt, item.endAt)} SGT`,
                      `Reservation ${item.reservationId}`,
                    ]}
                    action={
                      <Button
                        disabled={busy || early}
                        onClick={() => {
                          setCheckout(item);
                          setReturning(undefined);
                          setConfirmed(false);
                          setError('');
                        }}
                      >
                        Check out
                      </Button>
                    }
                  />
                );
              })}
            </List>
            {(queuePage > 0 || (checkouts.data?.length ?? 0) >= PAGE) && (
              <Pager
                page={queuePage}
                hasNext={(checkouts.data?.length ?? 0) >= PAGE}
                onPageChange={setQueuePage}
                disabled={busy || checkouts.isFetching}
                previousLabel="Previous reservations"
                nextLabel="Next reservations"
              />
            )}
          </section>
        </Card>
      )}
      <Card>
        <section aria-label="Loan list">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1.5">
              <CardTitle>{activeOnly ? 'Active loans' : 'Loan history'}</CardTitle>
              <CardDescription>
                {custodian
                  ? 'Receive a return when the equipment is back in your hands.'
                  : 'Equipment you have collected, and when it is due back.'}
              </CardDescription>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={activeOnly}
                onChange={(e) => {
                  setActiveOnly(e.target.checked);
                  setPage(0);
                }}
              />
              Show active loans only
            </label>
          </CardHeader>
          <List
            label={activeOnly ? 'Active loans' : 'Loan history'}
            query={loans}
            empty={
              <EmptyState
                icon={<Boxes size={26} />}
                className="min-h-0 py-8"
                title={search ? 'No loans match your search.' : 'No loans found.'}
                description={
                  activeOnly ? 'Nothing is out on loan right now.' : 'No loans have been recorded.'
                }
              />
            }
          >
            {loans.data?.map((item) => (
              <Item
                key={item.loanId}
                title={`${item.equipmentName} (${item.assetTag})`}
                badges={<StatusBadge status={loanDisplay(item.status, item.overdue)} />}
                lines={[
                  item.borrowerName,
                  item.returnedAt
                    ? `Due ${time(item.dueAt)} · Returned ${time(item.returnedAt)} · ${
                        item.returnCondition === 'DAMAGED' ? 'Damaged' : 'Good condition'
                      }${item.overdue ? ' · Late return' : ''}`
                    : `Due ${time(item.dueAt)} SGT`,
                  ...(item.returnNote ? [item.returnNote] : []),
                  `Reservation ${item.reservationId}`,
                ]}
                action={
                  custodian &&
                  item.status === 'ACTIVE' && (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setReturning(item);
                        setCheckout(undefined);
                        setCondition('GOOD');
                        setNote('');
                        setError('');
                      }}
                    >
                      Receive return
                    </Button>
                  )
                }
              />
            ))}
          </List>
          {(page > 0 || (loans.data?.length ?? 0) >= PAGE) && (
            <Pager
              page={page}
              hasNext={(loans.data?.length ?? 0) >= PAGE}
              onPageChange={setPage}
              disabled={busy || loans.isFetching}
              previousLabel="Previous loans"
              nextLabel="Next loans"
            />
          )}
        </section>
      </Card>
      <Dialog
        open={!!handover}
        onOpenChange={(open) => {
          if (!open && !busy) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{checkout ? 'Confirm checkout' : 'Confirm physical return'}</DialogTitle>
            <DialogDescription>
              {handover?.equipmentName} ({handover?.assetTag}) · {handover?.borrowerName}
            </DialogDescription>
          </DialogHeader>
          {checkout ? (
            <label className="flex items-start gap-2.5 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={busy}
              />
              I checked the person's identity against borrower ID {checkout.borrowerId}.
            </label>
          ) : (
            <div className="grid gap-4">
              <Field label="Return condition">
                <Select
                  value={condition}
                  disabled={busy}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="GOOD">Good</option>
                  <option value="DAMAGED">Damaged</option>
                </Select>
              </Field>
              <Field
                label="Return note"
                hint={condition === 'DAMAGED' ? 'Describe the damage.' : 'Optional.'}
              >
                <Textarea
                  maxLength={2000}
                  value={note}
                  disabled={busy}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
              {condition === 'DAMAGED' && (
                <Notice tone="warning">
                  A damage description is required. A linked maintenance case will be created.
                </Notice>
              )}
              {returning?.overdue && (
                <Notice tone="danger">This return is overdue and will be recorded as late.</Notice>
              )}
            </div>
          )}
          {failure}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={busy || (checkout ? !confirmed : condition === 'DAMAGED' && !note.trim())}
              onClick={() => void submit()}
            >
              {busy ? 'Saving…' : 'Record handover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
