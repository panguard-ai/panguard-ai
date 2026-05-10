import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className = '', ...rest }: Props) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage ${className}`}
        {...rest}
      />
      {hint && !error ? <p className="text-xs text-text-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-status-danger">{error}</p> : null}
    </div>
  );
}
