import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Bell, LoaderCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
export function LoadingState() {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" />
      Loading your workspace…
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>Something needs your attention</strong>
        <p>{message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
type EmptyProps = {
  icon?: ReactNode;
  title?: string;
  /** Say what will appear here, or what to do next. */
  description?: string;
  /** For example a button that creates the first item. */
  action?: ReactNode;
  /** For example `min-h-0 py-8` inside a card, where the full-page height is too tall. */
  className?: string;
};
/** Without props it is the inbox message; pass a title and description for any other list. */
export function EmptyState({
  icon = <Bell size={26} />,
  title = 'You’re all caught up',
  description = 'Equipment reminders and reservation updates will appear here.',
  action,
  className,
}: EmptyProps = {}) {
  return (
    <div className={cn('state empty', className)}>
      <span className="state-icon">{icon}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

const noticeTones = {
  success: 'bg-tone-ok text-tone-ok-foreground',
  warning: 'bg-tone-pending text-tone-pending-foreground',
  danger: 'bg-tone-bad text-tone-bad-foreground',
  info: 'bg-tone-info text-tone-info-foreground',
};
/**
 * A message that stays on the page, for example a confirmation that carries a link or a warning
 * about the item being edited. Give it `role="status"` or `role="alert"` when it appears after an
 * action. Use a toast for the plain outcome of an action and `ErrorState` for a failed request.
 */
export function Notice({
  tone = 'info',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof noticeTones }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-current/15 px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere]',
        noticeTones[tone],
        className,
      )}
      {...props}
    />
  );
}
