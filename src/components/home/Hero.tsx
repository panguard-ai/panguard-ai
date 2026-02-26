"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Copy, Check } from "lucide-react";
import FadeInUp from "../FadeInUp";

/* Brand logo paths (3D cube-shield) - viewBox 0 0 48 52 */
const logoPaths = {
  body: "M12 22 L36 22 L36 38 L24 48 L12 38 Z",
  leftPillar: "M12 22 L12 12",
  rightPillar: "M36 22 L36 12",
  topBridge: "M12 12 L24 4 L36 12",
  innerFace: "M12 22 L24 14 L36 22",
};

/* Node positions for the network graph */
const nodes = [
  { x: 200, y: 200, scale: 1.0 },   // center
  { x: 80, y: 100, scale: 0.55 },
  { x: 320, y: 80, scale: 0.55 },
  { x: 340, y: 240, scale: 0.6 },
  { x: 100, y: 300, scale: 0.5 },
  { x: 260, y: 340, scale: 0.45 },
  { x: 60, y: 200, scale: 0.4 },
];

/* Connections between nodes (indices) */
const edges: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 2], [1, 6], [3, 5], [4, 6], [2, 3],
];

function ShieldNetworkSVG() {
  return (
    <div className="relative w-full aspect-square max-w-[420px]">
      {/* Multi-layer glow (brand hero reference) */}
      <div className="absolute inset-0 bg-brand-sage/8 rounded-full blur-[100px]" />
      <div className="absolute inset-[15%] bg-brand-sage/5 rounded-full blur-[60px]" />

      <svg viewBox="0 0 400 400" fill="none" className="w-full h-full relative">
        <defs>
          {/* Radial glow behind center node */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B9A8E" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#8B9A8E" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#8B9A8E" stopOpacity="0" />
          </radialGradient>
          {/* Edge glow filter */}
          <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
        </defs>

        {/* Center radial glow */}
        <circle cx={nodes[0].x} cy={nodes[0].y} r="100" fill="url(#centerGlow)" />

        {/* Connection glow layer (behind main lines) */}
        {edges.map(([a, b], i) => (
          <motion.line
            key={`eg-${i}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="#8B9A8E"
            strokeWidth={2.5}
            filter="url(#edgeGlow)"
            animate={{ strokeOpacity: [0.05, 0.15, 0.05] }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}

        {/* Connection lines */}
        {edges.map(([a, b], i) => (
          <motion.line
            key={`e-${i}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="#8B9A8E"
            strokeWidth={0.8}
            strokeOpacity={0.2}
            animate={{ strokeOpacity: [0.15, 0.4, 0.15] }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}

        {/* Brand logo nodes (3D cube-shield) */}
        {nodes.map((node, i) => {
          const s = node.scale;
          return (
            <motion.g
              key={`n-${i}`}
              transform={`translate(${node.x - 24 * s}, ${node.y - 26 * s}) scale(${s})`}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            >
              {/* Glow circle behind center node */}
              {i === 0 && (
                <motion.circle
                  cx={24}
                  cy={26}
                  r={30}
                  fill="#8B9A8E"
                  fillOpacity={0.08}
                  animate={{ r: [28, 40, 28], fillOpacity: [0.06, 0.15, 0.06] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              {/* Subtle glow behind satellite nodes */}
              {i > 0 && (
                <circle cx={24} cy={26} r={20} fill="#8B9A8E" fillOpacity={0.04} />
              )}
              {Object.values(logoPaths).map((d, j) => (
                <path
                  key={j}
                  d={d}
                  stroke="#8B9A8E"
                  strokeWidth={i === 0 ? 2.5 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
            </motion.g>
          );
        })}

        {/* Floating data particles on edges */}
        {[0, 2, 4, 7, 9].map((edgeIdx) => {
          const [a, b] = edges[edgeIdx];
          return (
            <motion.circle
              key={`dot-${edgeIdx}`}
              r={edgeIdx === 0 ? 2.5 : 1.8}
              fill="#8B9A8E"
              fillOpacity={0.6}
              animate={{
                cx: [nodes[a].x, nodes[b].x],
                cy: [nodes[a].y, nodes[b].y],
              }}
              transition={{
                duration: 3.5 + edgeIdx * 0.5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
                delay: edgeIdx * 0.6,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

const installCmd = "curl -fsSL https://get.panguard.ai | sh";

function CopyButton() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="text-text-muted hover:text-text-secondary transition-colors p-1"
      aria-label="Copy install command"
    >
      {copied ? <Check className="w-4 h-4 text-status-safe" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function Hero() {
  return (
    <section className="min-h-[calc(100vh-64px)] flex items-center px-6 lg:px-[120px] py-16 border-b border-border relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 right-[10%] w-[500px] h-[500px] bg-brand-sage/8 rounded-full blur-[180px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 w-full max-w-[1200px] mx-auto relative">
        {/* Left */}
        <div className="flex-1 lg:max-w-[55%]">
          <FadeInUp>
            <h1 className="text-[clamp(36px,5.5vw,60px)] font-display italic leading-[1.08] tracking-tight text-text-primary">
              Your AI
              <br />
              Security Guard.
              <br />
              <span className="text-brand-sage font-sans not-italic font-bold text-[clamp(24px,3.5vw,36px)]">Starting at $49/month.</span>
            </h1>
          </FadeInUp>

          <FadeInUp delay={0.08}>
            <p className="text-lg text-text-secondary max-w-lg leading-relaxed mt-6">
              CrowdStrike costs $36K/year and needs a SOC team.
              Panguard installs in 30 seconds, detects threats automatically,
              and tells you what happened in a LINE message.
            </p>
          </FadeInUp>

          <FadeInUp delay={0.12}>
            <div className="flex items-center gap-3 mt-8 bg-surface-1 border border-border rounded-xl px-4 py-3 max-w-md font-mono text-sm">
              <span className="text-brand-sage select-none">$</span>
              <code className="text-text-secondary flex-1 select-all">{installCmd}</code>
              <CopyButton />
            </div>
          </FadeInUp>

          <FadeInUp delay={0.18}>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/early-access"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Join Early Access <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#demo"
                className="border border-text-tertiary/40 text-text-secondary hover:text-text-primary hover:border-text-secondary font-medium rounded-full px-8 py-3.5 transition-all duration-200"
              >
                See How It Works
              </Link>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.24}>
            <div className="flex flex-wrap gap-6 mt-6 text-sm text-text-tertiary">
              <span>
                <span className="text-status-safe mr-1">&#10003;</span> No credit card
              </span>
              <span>
                <span className="text-status-safe mr-1">&#10003;</span> 30-second setup
              </span>
              <span>
                <span className="text-status-safe mr-1">&#10003;</span> Open source (MIT)
              </span>
            </div>
          </FadeInUp>
        </div>

        {/* Right — Animated shield network */}
        <FadeInUp delay={0.1} className="flex-1 w-full max-w-md lg:max-w-[45%] hidden sm:flex items-center justify-center">
          <ShieldNetworkSVG />
        </FadeInUp>
      </div>
    </section>
  );
}
