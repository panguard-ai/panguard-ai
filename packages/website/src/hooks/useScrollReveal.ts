'use client';
import { useCallback, useRef } from 'react';

/**
 * Custom hook using IntersectionObserver to add 'is-visible' class
 * when an element enters the viewport (once).
 *
 * Returns a ref callback to attach to the target element.
 */
export function useScrollReveal(
  options: { margin?: string; threshold?: number } = {}
): (node: HTMLElement | null) => void {
  const { margin = '-80px', threshold = 0 } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Clean up previous observer
      if (observerRef.current && nodeRef.current) {
        observerRef.current.unobserve(nodeRef.current);
        observerRef.current.disconnect();
      }

      if (!node) {
        nodeRef.current = null;
        return;
      }

      nodeRef.current = node;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observerRef.current?.unobserve(entry.target);
          }
        },
        { rootMargin: margin, threshold }
      );

      observerRef.current.observe(node);
    },
    [margin, threshold]
  );

  return ref;
}
