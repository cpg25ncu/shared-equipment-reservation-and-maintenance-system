import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

type Props = {
  /** Zero-based. */
  page: number;
  /** Known number of pages; omit when the API returns a plain list without a total. */
  pageCount?: number;
  /** Whether another page may follow when `pageCount` is unknown (a full page came back). */
  hasNext?: boolean;
  onPageChange: (page: number) => void;
  /** Disables both buttons, for example while the next page loads. */
  disabled?: boolean;
  /** Button names; give each pager on a page its own, for example "Next loans". */
  previousLabel?: string;
  nextLabel?: string;
};

/** Previous and next page buttons with the current position, used under tables and lists. */
export function Pager({
  page,
  pageCount,
  hasNext,
  onPageChange,
  disabled = false,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
}: Props) {
  const last = pageCount === undefined ? !hasNext : page + 1 >= pageCount;
  return (
    <div className="pagination">
      <span>
        Page {page + 1}
        {pageCount !== undefined && ` of ${Math.max(1, pageCount)}`}
      </span>
      <div>
        <Button
          variant="outline"
          aria-label={previousLabel}
          disabled={disabled || page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="outline"
          aria-label={nextLabel}
          disabled={disabled || last}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
