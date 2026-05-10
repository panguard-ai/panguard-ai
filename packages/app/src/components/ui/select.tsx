import type { SelectHTMLAttributes } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: ReadonlyArray<Option>;
  hint?: string;
}

export function Select({ label, options, hint, id, className = '', ...rest }: Props) {
  const selectId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={`rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage ${className}`}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
