'use client';
import { ReactNode } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const directionClasses: Record<Direction, string> = {
  up: '',
  down: 'from-down',
  left: 'from-left',
  right: 'from-right',
  none: 'from-none',
};

export default function FadeIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className = '',
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useScrollReveal();
  const dirClass = directionClasses[direction];

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${dirClass} ${className}`}
      style={{
        ...(delay > 0 ? { transitionDelay: `${delay}s` } : {}),
        ...(duration !== 0.6 ? { transitionDuration: `${duration}s` } : {}),
      }}
    >
      {children}
    </div>
  );
}
