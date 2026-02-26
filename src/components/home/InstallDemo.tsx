"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";

const lines = [
  { text: "$ curl -sSL panguard.ai/install | sh", color: "text-brand-sage" },
  { text: "Downloading Panguard AI v2.1.0...", color: "text-text-secondary", prefix: true },
  { text: "Detecting environment... Ubuntu 24.04 LTS", color: "text-text-secondary", prefix: true },
  { text: "Installing security agents...", color: "text-text-secondary", prefix: true },
  { text: "AI model loaded (Layer 1: 847 rules)", color: "text-text-secondary", prefix: true },
  { text: "Connected to Panguard Threat Cloud", color: "text-text-secondary", prefix: true },
  { text: "", color: "" },
  { text: "Protection active. Your system is now guarded.", color: "text-text-primary", shield: true },
  { text: "  Dashboard \u2192 https://app.panguard.ai", color: "text-text-tertiary" },
  { text: "  Status: PROTECTED", color: "text-status-safe", dot: true },
];

const metrics = [
  { value: "< 30s", label: "install time" },
  { value: "847", label: "built-in rules" },
  { value: "Zero", label: "configuration" },
];

export default function InstallDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [visibleLines, setVisibleLines] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    if (visibleLines >= lines.length) { setDone(true); return; }
    const cur = lines[visibleLines];
    if (!cur.text) {
      const t = setTimeout(() => { setVisibleLines((v) => v + 1); setCharIndex(0); }, 300);
      return () => clearTimeout(t);
    }
    if (charIndex < cur.text.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 25);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setVisibleLines((v) => v + 1); setCharIndex(0); }, 150);
    return () => clearTimeout(t);
  }, [isInView, visibleLines, charIndex]);

  return (
    <SectionWrapper dark id="demo">
      <SectionTitle
        title="One Command. Full Protection."
        subtitle="Install in 30 seconds. No configuration needed. AI auto-detects your environment."
      />

      <div ref={ref} className="max-w-2xl mx-auto mt-12">
        <div className="bg-surface-0 rounded-2xl border border-border overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 h-11 bg-surface-2 border-b border-border">
            <div className="w-3 h-3 rounded-full bg-status-danger" />
            <div className="w-3 h-3 rounded-full bg-status-caution" />
            <div className="w-3 h-3 rounded-full bg-status-safe" />
            <span className="ml-3 text-xs text-text-tertiary">Terminal &mdash; panguard</span>
          </div>

          <div className="p-6 font-mono text-[13px] leading-[1.8] min-h-[320px]">
            {lines.map((line, i) => {
              if (i > visibleLines) return null;
              const isCurrent = i === visibleLines;
              const displayText = isCurrent ? line.text.slice(0, charIndex) : line.text;
              if (!line.text) return <div key={i} className="h-4" />;
              return (
                <div key={i} className={`${line.color} whitespace-pre`}>
                  {line.prefix && <span className="text-status-safe">{"  \u2713 "}</span>}
                  {line.shield && <span className="text-brand-sage">{">> "}</span>}
                  {displayText}
                  {line.dot && !isCurrent && (
                    <span className="inline-block w-2 h-2 rounded-full bg-status-safe ml-2 align-middle animate-pulse" />
                  )}
                  {isCurrent && !done && (
                    <span className="inline-block w-[2px] h-4 bg-brand-sage ml-0.5 align-middle animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-10 justify-center mt-8">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-lg font-bold text-text-primary">{m.value}</p>
              <p className="text-xs text-text-tertiary">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
