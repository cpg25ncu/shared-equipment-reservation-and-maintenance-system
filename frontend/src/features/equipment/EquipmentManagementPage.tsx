import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { PackagePlus, Pencil, Tags } from 'lucide-react';
import { api, ApiError, message } from '@/api/client';
import { EmptyState, ErrorState, Notice } from '@/components/Feedback';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { durationMinutes, durationText } from '@/features/reservation/rules';
import { equipmentStatus } from '@/lib/status';

type ManagedEquipment = {
  equipmentId: string;
  assetTag: string;
  serialNumber: string | null;
  name: string;
  description: string | null;
  category: string;
  location: string;
  condition: 'GOOD' | 'FAIR' | 'POOR';
  status: string;
  requiresApproval: boolean;
  maxBorrowDuration: string | null;
  version: number;
};
type FormState = {
  assetTag: string;
  serialNumber: string;
  name: string;
  description: string;
  category: string;
  location: string;
  condition: 'GOOD' | 'FAIR' | 'POOR';
  requiresApproval: boolean;
  maxBorrowDuration: string;
};
type TextField = Exclude<keyof FormState, 'requiresApproval' | 'condition'>;
const emptyForm: FormState = {
  assetTag: '',
  serialNumber: '',
  name: '',
  description: '',
  category: '',
  location: '',
  condition: 'GOOD',
  requiresApproval: false,
  maxBorrowDuration: '',
};
const conditions: Record<FormState['condition'], string> = {
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
};
function fromEquipment(item: ManagedEquipment): FormState {
  return {
    assetTag: item.assetTag,
    serialNumber: item.serialNumber ?? '',
    name: item.name,
    description: item.description ?? '',
    category: item.category,
    location: item.location,
    condition: item.condition,
    requiresApproval: item.requiresApproval,
    maxBorrowDuration: item.maxBorrowDuration ?? '',
  };
}
function fieldErrors(cause: unknown): Record<string, string> {
  return Object.fromEntries(
    cause instanceof ApiError
      ? (cause.problem.errors ?? []).map((entry) => [entry.field, entry.message])
      : [],
  );
}
/** The API allows up to 100 rows per page; one page holds a team's whole inventory. */
const BLOCK = 100;
const PAGE_SIZE = 20;
const column = createColumnHelper<ManagedEquipment>();
/** Columns shown from 1280px; narrower screens read them under the equipment name. */
const secondary = 'hidden xl:table-cell';

export function EquipmentManagementPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<ManagedEquipment | null | undefined>();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [retiring, setRetiring] = useState<ManagedEquipment>();
  const [newCategory, setNewCategory] = useState('');
  const [oldCategory, setOldCategory] = useState('');
  const [renamedCategory, setRenamedCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState('');
  const [renameError, setRenameError] = useState('');
  const equipment = useQuery({
    queryKey: ['managed-equipment', page],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/equipment/manage', {
        params: { query: { page, size: BLOCK } },
      });
      return data! as ManagedEquipment[];
    },
  });
  const categories = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/equipment/manage/categories');
      return data! as string[];
    },
  });

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['managed-equipment'] }),
      client.invalidateQueries({ queryKey: ['equipment-categories'] }),
      client.invalidateQueries({ queryKey: ['equipment'] }),
    ]);
  }
  function openEditor(item: ManagedEquipment | null) {
    setEditing(item);
    setForm(item ? fromEquipment(item) : { ...emptyForm, category: categories.data?.[0] ?? '' });
    setFormError('');
    setErrors({});
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setErrors({});
    const body = {
      ...form,
      serialNumber: form.serialNumber.trim() || undefined,
      description: form.description.trim() || undefined,
      maxBorrowDuration: form.maxBorrowDuration.trim() || undefined,
      expectedVersion: editing?.version,
    };
    try {
      if (editing)
        await api.PUT('/api/v1/equipment/manage/{id}', {
          params: { path: { id: editing.equipmentId } },
          body,
        });
      else await api.POST('/api/v1/equipment/manage', { body });
      setEditing(undefined);
      // One id per kind of action: a repeated save replaces the toast instead of stacking it.
      toast.success(editing ? 'Equipment updated.' : 'Equipment registered.', {
        id: 'equipment-saved',
      });
      await refresh();
    } catch (cause) {
      const found = fieldErrors(cause);
      setErrors(found);
      if (!Object.keys(found).length) setFormError(message(cause));
    } finally {
      setSaving(false);
    }
  }
  async function retire() {
    if (!retiring) return;
    setSaving(true);
    try {
      await api.POST('/api/v1/equipment/manage/{id}/retire', {
        params: { path: { id: retiring.equipmentId } },
        body: { expectedVersion: retiring.version },
      });
      toast.success('Equipment retired.', { id: 'equipment-retired' });
      await refresh();
    } catch (cause) {
      toast.error(message(cause), { id: 'equipment-retired' });
      await refresh();
    } finally {
      setRetiring(undefined);
      setSaving(false);
    }
  }
  async function createCategory(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setCreateError('');
    try {
      await api.POST('/api/v1/equipment/manage/categories', { body: { name: newCategory.trim() } });
      setNewCategory('');
      toast.success('Category created.', { id: 'category-saved' });
      await refresh();
    } catch (cause) {
      setCreateError(fieldErrors(cause).name ?? message(cause));
    } finally {
      setSaving(false);
    }
  }
  async function renameCategory(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setRenameError('');
    try {
      await api.PATCH('/api/v1/equipment/manage/categories/{name}', {
        params: { path: { name: oldCategory } },
        body: { name: renamedCategory.trim() },
      });
      setOldCategory('');
      setRenamedCategory('');
      toast.success('Category renamed.', { id: 'category-saved' });
      await refresh();
    } catch (cause) {
      setRenameError(fieldErrors(cause).name ?? message(cause));
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      column.accessor('name', {
        header: 'Equipment',
        cell: (info) => (
          <>
            <strong>{info.getValue()}</strong>
            <span className="cell-sub">
              {info.row.original.assetTag}
              {info.row.original.serialNumber && ` · Serial ${info.row.original.serialNumber}`}
            </span>
            {/* The location, condition and booking columns give way to this line below 1280px. */}
            <span className="cell-sub xl:hidden">
              {info.row.original.location} ·{' '}
              {conditions[info.row.original.condition] ?? info.row.original.condition} ·{' '}
              {info.row.original.requiresApproval ? 'Needs approval' : 'Reserve directly'}
            </span>
          </>
        ),
      }),
      column.accessor('category', { header: 'Category' }),
      column.accessor('location', { header: 'Location', meta: { className: secondary } }),
      column.accessor('condition', {
        header: 'Condition',
        meta: { className: secondary },
        cell: (info) => conditions[info.getValue()] ?? info.getValue(),
      }),
      column.accessor('requiresApproval', {
        header: 'Booking rules',
        meta: { className: secondary },
        cell: (info) => {
          const minutes = durationMinutes(info.row.original.maxBorrowDuration);
          return (
            <>
              {info.getValue() ? 'Needs approval' : 'Reserve directly'}
              <span className="cell-sub">
                {minutes === null ? 'Global time limit' : `Up to ${durationText(minutes)}`}
              </span>
            </>
          );
        },
      }),
      column.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <StatusBadge status={equipmentStatus[info.getValue() as keyof typeof equipmentStatus]} />
        ),
      }),
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => {
          const item = info.row.original;
          if (item.status === 'RETIRED') return null;
          return (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label={'Edit ' + item.name}
                onClick={() => openEditor(item)}
              >
                <Pencil size={14} aria-hidden="true" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-tone-bad"
                aria-label={'Retire ' + item.name}
                onClick={() => setRetiring(item)}
              >
                Retire
              </Button>
            </div>
          );
        },
      }),
    ],
    // openEditor only reads the latest categories; recreating columns per render is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories.data],
  );
  const rows = equipment.data ?? [];
  // A first page shorter than the block is the whole inventory: sort and page it here.
  const complete = page === 0 && rows.length < BLOCK;
  const text = (name: TextField, label: string, required = false, hint?: string) => (
    <Field label={label} hint={hint} error={errors[name]}>
      <Input
        required={required}
        value={form[name]}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
      />
    </Field>
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="INVENTORY"
        title="Manage equipment"
        description="Register, update and retire equipment. Retired items stay in history."
        actions={
          <Button onClick={() => openEditor(null)}>
            <PackagePlus size={16} aria-hidden="true" />
            Register equipment
          </Button>
        }
      />
      <Card>
        <section aria-label="Equipment records">
          <CardHeader>
            <CardTitle>Equipment records</CardTitle>
            <CardDescription>
              Sort from the column headers. Retired equipment keeps its history and can no longer be
              reserved.
            </CardDescription>
          </CardHeader>
          {equipment.isError ? (
            <ErrorState
              message={message(equipment.error)}
              onRetry={() => void equipment.refetch()}
            />
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              caption="Equipment records"
              loading={equipment.isPending}
              getRowId={(item) => item.equipmentId}
              // Twenty per page, as the API pages and as this page showed before #26.
              pageSize={PAGE_SIZE}
              empty={
                <EmptyState
                  icon={<PackagePlus size={26} />}
                  title="No equipment yet"
                  description="Use Register equipment above to add the first item; it then becomes searchable and reservable."
                />
              }
              paging={
                complete
                  ? undefined
                  : {
                      page,
                      hasNext: rows.length === BLOCK,
                      onPageChange: setPage,
                      busy: equipment.isFetching,
                    }
              }
            />
          )}
        </section>
      </Card>
      <Card>
        <section aria-label="Categories">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              Renaming a category moves every item in it to the new name.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {categories.isPending ? (
              <SkeletonBlock lines={1} />
            ) : categories.isError ? (
              <ErrorState
                message={message(categories.error)}
                onRetry={() => void categories.refetch()}
              />
            ) : categories.data.length ? (
              <ul
                aria-label="Existing categories"
                className="m-0 flex list-none flex-wrap gap-2 p-0"
              >
                {categories.data.map((name) => (
                  <li key={name}>
                    <Badge>{name}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">No categories yet.</p>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <form
                className="grid content-start gap-3 rounded-lg border border-border p-4"
                onSubmit={(event) => void createCategory(event)}
              >
                <Field label="New category" error={createError}>
                  <Input
                    required
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                  />
                </Field>
                <Button
                  type="submit"
                  variant="outline"
                  className="justify-self-start"
                  disabled={saving}
                >
                  <Tags size={15} aria-hidden="true" />
                  Create category
                </Button>
              </form>
              <form
                className="grid content-start gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
                onSubmit={(event) => void renameCategory(event)}
              >
                <Field label="Category to rename">
                  <Select
                    required
                    value={oldCategory}
                    onChange={(event) => setOldCategory(event.target.value)}
                  >
                    <option value="">Choose a category</option>
                    {categories.data?.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="New name" error={renameError}>
                  <Input
                    required
                    value={renamedCategory}
                    onChange={(event) => setRenamedCategory(event.target.value)}
                  />
                </Field>
                <Button
                  type="submit"
                  variant="outline"
                  className="justify-self-start sm:col-span-2"
                  disabled={saving}
                >
                  Rename category
                </Button>
              </form>
            </div>
          </CardContent>
        </section>
      </Card>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open && !saving) setEditing(undefined);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Register equipment'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Asset ${editing.assetTag}. Saving checks that nobody changed it in the meantime.`
                : 'Enter the details printed on the asset label. New equipment starts as available.'}
            </DialogDescription>
          </DialogHeader>
          <form
            aria-label="Equipment form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => void save(event)}
          >
            {text('assetTag', 'Asset tag', true)}
            {text('serialNumber', 'Serial number')}
            {text('name', 'Name', true)}
            <Field label="Category" error={errors.category}>
              <Select
                required
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                <option value="">Choose a category</option>
                {categories.data?.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            {text('location', 'Location', true)}
            <Field label="Condition" error={errors.condition}>
              <Select
                value={form.condition}
                onChange={(event) =>
                  setForm({ ...form, condition: event.target.value as FormState['condition'] })
                }
              >
                {Object.entries(conditions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Maximum borrowing duration"
              hint="ISO-8601, for example PT72H. Leave blank to use the global limit."
              error={errors.maxBorrowDuration}
            >
              <Input
                value={form.maxBorrowDuration}
                placeholder="PT72H"
                onChange={(event) => setForm({ ...form, maxBorrowDuration: event.target.value })}
              />
            </Field>
            <div className="grid content-start gap-1.5 sm:pt-6">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={form.requiresApproval}
                  onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })}
                />
                Requires approval
              </label>
              <p className="m-0 text-xs leading-relaxed text-muted-foreground">
                Reservations wait for an approver before they are confirmed.
              </p>
            </div>
            <Field label="Description" className="sm:col-span-2" error={errors.description}>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            {formError && (
              <Notice tone="danger" role="alert" className="sm:col-span-2">
                {formError}
              </Notice>
            )}
            <DialogFooter className="sm:col-span-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save equipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!retiring}
        onOpenChange={(open) => {
          if (!open) setRetiring(undefined);
        }}
        title="Retire this equipment?"
        description={
          retiring
            ? `${retiring.name} (${retiring.assetTag}) keeps its history but can no longer be reserved. An item on loan must be returned first.`
            : ''
        }
        confirmLabel="Retire equipment"
        destructive
        pending={saving}
        onConfirm={retire}
      />
    </div>
  );
}
