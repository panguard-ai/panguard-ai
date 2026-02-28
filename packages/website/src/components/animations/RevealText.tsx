'use client';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function RevealText({
  text,
  className = '',
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useScrollReveal({ margin: '-60px' });
  const words = text.split(' ');

  return (
    <span ref={ref} className={`reveal-text-container ${className}`}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block mr-[0.3em] reveal-word"
          style={{ transitionDelay: `${delay + i * 0.05}s` }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
