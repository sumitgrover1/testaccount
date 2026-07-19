import { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400',
            'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500',
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';
