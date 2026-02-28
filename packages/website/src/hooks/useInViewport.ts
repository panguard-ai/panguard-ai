'use client';
import { useCallback, useRef, useState } from 'react';

/**
 * Custom hook that returns a boolean when an element enters the viewport.
 * Replaces framer-motion's useInView.
 */
export function useInViewport(
  options: { once?: boolean; margin?: string; threshold?: number } = {}
): [ref: (node: HTMLElement | null) => void, inView: boolean] {
  const { once = true, margin = '-50px', threshold = 0 } = options;
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
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
            setInView(true);
            if (once) {
              observerRef.current?.unobserve(entry.target);
            }
          } else if (!once) {
            setInView(false);
          }
        },
        { rootMargin: margin, threshold }
      );

      observerRef.current.observe(node);
    },
    [once, margin, threshold]
  );

  return [ref, inView];
}
