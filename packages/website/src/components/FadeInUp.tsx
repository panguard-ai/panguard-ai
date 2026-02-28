'use client';
import { ReactNode } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function FadeInUp({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${className}`}
      style={delay > 0 ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
