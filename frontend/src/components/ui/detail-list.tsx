import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Label and value pairs, such as the facts of one reservation or case. Two columns from tablet
 * width up, stacked on a phone. Fill it with `Detail`.
 */
export function DetailList({ className, ...props }: HTMLAttributes<HTMLDListElement>) {
  return (
    <dl
      className={cn(
        'm-0 grid grid-cols-1 gap-x-4 text-sm leading-relaxed sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-y-2.5',
        className,
      )}
      {...props}
    />
  );
}

/** One row of a `DetailList`; long values such as identifiers wrap instead of widening the page. */
export function Detail({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd className={cn('m-0 mb-3 [overflow-wrap:anywhere] sm:mb-0', className)}>{children}</dd>
    </>
  );
}
