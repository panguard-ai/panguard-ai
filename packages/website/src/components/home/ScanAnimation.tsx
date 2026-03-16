'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { STATS } from '@/lib/stats';

const PHASES = [
  { icon: '01', label: 'Fetching skill content...' },
  { icon: '02', label: `Running ATR detection (${STATS.atrRules} rules, ${STATS.atrPatterns}+ patterns)...` },
  { icon: '03', label: 'Checking secrets, permissions, injection vectors...' },
  { icon: '04', label: 'Generating report...' },
];

interface ScanAnimationProps {
  phase: number; // 1-4, 0 = hidden
}

export default function ScanAnimation({ phase }: ScanAnimationProps) {
  if (phase === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-5 overflow-hidden"
    >
      <div className="bg-surface-1 border border-border rounded-xl p-4 space-y-2">
        {PHASES.map((p, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === phase;
          const isDone = stepNum < phase;
          const isPending = stepNum > phase;

          return (
            <motion.div
              key={p.icon}
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: isPending ? 0.3 : 1,
                x: 0,
              }}
              transition={{ delay: i * 0.1, duration: 0.2 }}
              className="flex items-center gap-3"
            >
              {/* Status indicator */}
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {isDone ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-emerald-400 text-sm font-bold"
                  >
                    &#10003;
                  </motion.span>
                ) : isActive ? (
                  <span className="inline-block w-4 h-4 border-2 border-brand-sage/30 border-t-brand-sage rounded-full animate-spin" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs font-mono ${
                  isDone
                    ? 'text-emerald-400'
                    : isActive
                      ? 'text-text-primary'
                      : 'text-text-muted/50'
                }`}
              >
                {p.label}
              </span>

              {/* Progress bar for active step */}
              {isActive && (
                <div className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden ml-2">
                  <motion.div
                    className="h-full rounded-full bg-brand-sage"
                    initial={{ width: '0%' }}
                    animate={{ width: '80%' }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
