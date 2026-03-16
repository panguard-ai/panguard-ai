'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulse: number; // 0 = idle, 1 = fully pulsing
  pulseDecay: number;
  isSource: boolean;
}

const NODE_COUNT = 60;
const CONNECT_DIST = 120;
const SAGE = { r: 139, g: 154, b: 142 };
const RED = { r: 239, g: 68, b: 68 };
const PULSE_INTERVAL = 3000;

export default function DefenseNetwork({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animRef = useRef<number>(0);
  const lastPulseRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  const initNodes = useCallback((w: number, h: number) => {
    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1.5 + Math.random() * 1.5,
        pulse: 0,
        pulseDecay: 0,
        isSource: false,
      });
    }
    nodesRef.current = nodes;
  }, []);

  const triggerPulse = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;
    // Pick random source node
    const src = Math.floor(Math.random() * nodes.length);
    nodes[src].pulse = 1;
    nodes[src].pulseDecay = 0.015;
    nodes[src].isSource = true;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const nodes = nodesRef.current;
    const now = Date.now();

    // Periodic pulse
    if (now - lastPulseRef.current > PULSE_INTERVAL) {
      triggerPulse();
      lastPulseRef.current = now;
    }

    ctx.clearRect(0, 0, w, h);

    // Propagate pulses to nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.pulse > 0.3) {
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST && b.pulse < a.pulse * 0.8) {
            b.pulse = Math.max(b.pulse, a.pulse * 0.7);
            b.pulseDecay = 0.012;
          }
        }
      }
    }

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.15;
          const pulse = Math.max(a.pulse, b.pulse);
          if (pulse > 0.1) {
            // Pulse color: sage → bright sage
            const intensity = pulse * 0.6;
            ctx.strokeStyle = `rgba(${SAGE.r}, ${SAGE.g}, ${SAGE.b}, ${alpha + intensity * 0.4})`;
            ctx.lineWidth = 0.5 + pulse * 1.5;
          } else {
            ctx.strokeStyle = `rgba(${SAGE.r}, ${SAGE.g}, ${SAGE.b}, ${alpha})`;
            ctx.lineWidth = 0.5;
          }
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes + update
    for (const node of nodes) {
      // Move
      node.x += node.vx;
      node.y += node.vy;

      // Bounce
      if (node.x < 0 || node.x > w) node.vx *= -1;
      if (node.y < 0 || node.y > h) node.vy *= -1;
      node.x = Math.max(0, Math.min(w, node.x));
      node.y = Math.max(0, Math.min(h, node.y));

      // Draw
      const pulse = node.pulse;
      if (pulse > 0.1) {
        // Pulsing: glow ring
        const glowRadius = node.radius + pulse * 12;
        const gradient = ctx.createRadialGradient(
          node.x, node.y, node.radius,
          node.x, node.y, glowRadius
        );
        const color = node.isSource ? RED : SAGE;
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse * 0.6})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core dot
      const coreAlpha = 0.4 + pulse * 0.6;
      const color = node.isSource && pulse > 0.1 ? RED : SAGE;
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${coreAlpha})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + pulse * 2, 0, Math.PI * 2);
      ctx.fill();

      // Decay pulse
      if (node.pulse > 0) {
        node.pulse -= node.pulseDecay;
        if (node.pulse <= 0) {
          node.pulse = 0;
          node.isSource = false;
        }
      }
    }
  }, [triggerPulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      sizeRef.current = { w, h };
      if (nodesRef.current.length === 0) initNodes(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      draw(ctx, sizeRef.current.w, sizeRef.current.h);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [draw, initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
