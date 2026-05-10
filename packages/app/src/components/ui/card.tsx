import type { ReactNode } from 'react';

type Variant = 'default' | 'elevated' | 'featured';

const variants: Record<Variant, string> = {
  default: 'bg-surface-1 border border-border',
  elevated: 'bg-surface-1 border border-border shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
  featured: 'bg-surface-1 border border-brand-sage',
};

interface Props {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ variant = 'default', children, className = '', padding = 'md' }: Props) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${variants[variant]} ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
