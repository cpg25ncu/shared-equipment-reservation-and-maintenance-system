import { useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { EmptyState } from '@/components/Feedback';
import { Pager } from './pager';
import { Skeleton } from './skeleton';
declare module '@tanstack/react-table' {
  // The type parameters must match TanStack's own declaration.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Classes for the column's header and cells, for example `hidden xl:table-cell` to drop a
     * secondary column on tablets. Repeat what it shows in another cell for those widths.
     */
    className?: string;
  }
}

/** Paging done by the API: the table shows `data` as one page and asks for another. */
export type ServerPaging = {
  /** Zero-based, as in the API's `page` parameter. */
  page: number;
  /** Omit when the API returns a plain list without a total, and pass `hasNext` instead. */
  pageCount?: number;
  /** A full page came back, so another may follow. Only used without `pageCount`. */
  hasNext?: boolean;
  onPageChange: (page: number) => void;
  /** Disables the buttons while the next page loads. */
  busy?: boolean;
};
type Props<Row> = {
  // Columns of one table carry different value types, which only `any` can express here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<Row, any>[];
  data: Row[];
  /** Read by screen readers; say what the rows are. */
  caption: string;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Shows placeholder rows; pass the query's `isPending`. */
  loading?: boolean;
  /** Rows per page when the table pages its own data. Ignored with `paging`. */
  pageSize?: number;
  /** Pass this when the API pages the data; sorting by header is then switched off. */
  paging?: ServerPaging;
  getRowId?: (row: Row) => string;
  /** Extra classes for one row, for example to mark unread items. */
  rowClassName?: (row: Row) => string | undefined;
  initialSorting?: SortingState;
};
/**
 * Table with sortable headers, paging and loading and empty states (TanStack Table).
 * Columns come from `createColumnHelper<Row>()`; give sortable columns an accessor.
 */
export function DataTable<Row>({
  columns,
  data,
  caption,
  empty,
  loading = false,
  pageSize = 10,
  paging,
  getRowId,
  rowClassName,
  initialSorting = [],
}: Props<Row>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: paging ? undefined : { sorting },
    onSortingChange: setSorting,
    enableSorting: !paging,
    manualPagination: !!paging,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: paging ? undefined : getSortedRowModel(),
    getPaginationRowModel: paging ? undefined : getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });
  if (!loading && !data.length)
    return (
      <>
        {empty ?? <EmptyState title="Nothing to show yet" description="" />}
        {/* A later page of an open-ended list can come back empty; keep the way back. */}
        {paging && paging.page > 0 && (
          <Pager page={paging.page} onPageChange={paging.onPageChange} disabled={paging.busy} />
        )}
      </>
    );
  const page = paging ? paging.page : table.getState().pagination.pageIndex;
  const pageCount = paging ? paging.pageCount : Math.max(1, table.getPageCount());
  const goTo = (next: number) => (paging ? paging.onPageChange(next) : table.setPageIndex(next));
  const headers = table.getHeaderGroups();
  return (
    <>
      <div className="table-scroll">
        <table className="data-table" aria-busy={loading || undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            {headers.map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const label = flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={header.column.columnDef.meta?.className}
                      aria-sort={
                        !header.column.getCanSort()
                          ? undefined
                          : sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : 'none'
                      }
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 uppercase hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {label}
                          {sorted === 'asc' ? (
                            <ArrowUp size={12} aria-hidden="true" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown size={12} aria-hidden="true" />
                          ) : (
                            <ArrowUpDown size={12} aria-hidden="true" className="opacity-50" />
                          )}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }, (_, row) => (
                  <tr key={row}>
                    {(headers[0]?.headers ?? []).map((header) => (
                      <td key={header.id} className={header.column.columnDef.meta?.className}>
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className={rowClassName?.(row.original)}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <p className="sr-only" role="status">
          Loading…
        </p>
      )}
      <Pager
        page={page}
        pageCount={pageCount}
        hasNext={paging?.hasNext}
        onPageChange={goTo}
        disabled={loading || paging?.busy}
      />
    </>
  );
}
