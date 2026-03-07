import { ReactNode } from 'react';

type Spacing = 'tight' | 'default' | 'spacious';

const spacingClasses: Record<Spacing, string> = {
  tight: 'py-12 sm:py-16',
  default: 'py-16 sm:py-24',
  spacious: 'py-24 sm:py-32',
};

export default function SectionWrapper({
  children,
  className = '',
  id,
  dark = false,
  bg,
  spacing = 'default',
  fadeBorder = true,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  dark?: boolean;
  bg?: string;
  spacing?: Spacing;
  fadeBorder?: boolean;
}) {
  const bgClass = bg ?? (dark ? 'bg-surface-1' : 'bg-surface-0');

  return (
    <section
      id={id}
      className={`${spacingClasses[spacing]} px-5 sm:px-6 lg:px-[120px] ${
        fadeBorder ? 'section-fade' : ''
      } ${bgClass} ${className}`}
    >
      <div className="max-w-[1200px] mx-auto">{children}</div>
    </section>
  );
}
