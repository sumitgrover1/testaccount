import clsx from 'clsx';
import { statusColor, titleCase } from '@/lib/utils/format';

export function Badge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor(status))}>
      {label ?? titleCase(status)}
    </span>
  );
}
