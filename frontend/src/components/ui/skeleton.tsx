import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
/** Placeholder block while content loads; size it with `h-*` and `w-*`. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)}
      {...props}
    />
  );
}

const widths = ['w-2/3', 'w-5/6', 'w-1/2'];
/**
 * A few placeholder lines for a card or section that is loading, announced once as "Loading…".
 * Use it inside a page; `LoadingState` is for the whole workspace.
 */
export function SkeletonBlock({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('grid gap-3 py-2', className)}>
      {Array.from({ length: lines }, (_, line) => (
        <Skeleton key={line} className={cn('h-4', widths[line % widths.length])} />
      ))}
      <p className="sr-only" role="status">
        Loading…
      </p>
    </div>
  );
}
