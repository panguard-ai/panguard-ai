'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const FLYWHEEL_NODES = [
  'installPanguard',
  'detectThreats',
  'uploadToCloud',
  'generateRules',
  'distribute',
  'betterProtection',
] as const;

function FlywheelDiagram({ labels }: { labels: string[] }) {
  const cx = 200;
  const cy = 200;
  const r = 150;
  const nodeCount = 6;

  const positions = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / nodeCount - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-[400px] mx-auto" aria-hidden="true">
      {/* Connecting arrows */}
      {positions.map((pos, i) => {
        const next = positions[(i + 1) % nodeCount];
        const dx = next.x - pos.x;
        const dy = next.y - pos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len;
        const uy = dy / len;
        const startX = pos.x + ux * 36;
        const startY = pos.y + uy * 36;
        const endX = next.x - ux * 36;
        const endY = next.y - uy * 36;

        return (
          <line
            key={`arrow-${i}`}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="#8B9A8E"
            strokeWidth={1.5}
            strokeOpacity={0.4}
            markerEnd="url(#arrowhead)"
          />
        );
      })}

      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#8B9A8E" fillOpacity={0.6} />
        </marker>
      </defs>

      {/* Nodes */}
      {positions.map((pos, i) => (
        <g key={`node-${i}`}>
          <circle
            cx={pos.x}
            cy={pos.y}
            r={32}
            fill="#0a0a0a"
            stroke="#8B9A8E"
            strokeWidth={1.5}
            strokeOpacity={0.5}
          />
          <text
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#F5F1E8"
            fontSize={9}
            fontWeight={500}
          >
            {labels[i]?.split(' ').length > 2 ? (
              <>
                <tspan x={pos.x} dy="-0.5em">
                  {labels[i].split(' ').slice(0, 2).join(' ')}
                </tspan>
                <tspan x={pos.x} dy="1.1em">
                  {labels[i].split(' ').slice(2).join(' ')}
                </tspan>
              </>
            ) : (
              labels[i]
            )}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function CommunityFlywheel() {
  const t = useTranslations('revolution.flywheel');

  const labels = FLYWHEEL_NODES.map((key) => t(`nodes.${key}`));

  return (
    <section className="bg-gradient-to-b from-[#0d2614] to-[#0a0a0a] px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary text-center mb-12 sm:mb-16"
        >
          {t('title')}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease }}
        >
          <FlywheelDiagram labels={labels} />
        </motion.div>

        <motion.blockquote
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          className="mt-12 text-center max-w-2xl mx-auto"
        >
          <p className="text-lg sm:text-xl text-text-secondary italic leading-relaxed">
            {t('quote')}
          </p>
        </motion.blockquote>
      </div>
    </section>
  );
}
