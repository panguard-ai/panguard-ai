/**
 * The real pga scan capture (2026-07-02, OpenClaw malicious skill, ATR v3.5.3
 * bundle) — verbatim, do not update the version/count inside the capture.
 */
export default function Terminal({ className = '' }: { className?: string }) {
  return (
    <div
      className={`overflow-x-auto rounded-2xl border border-border bg-surface-hero p-5 font-mono text-[13px] leading-relaxed shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] sm:p-6 ${className}`}
    >
      <p className="whitespace-nowrap">
        <span className="select-none text-brand-sage">$ </span>
        <span className="text-text-primary">pga scan openclaw-skill-twitter-helper.md</span>
      </p>
      <p className="term-dim whitespace-nowrap">loading ATR v3.5.3 (655 rules)…</p>
      <p className="whitespace-nowrap">
        <span className="term-critical">✗ CRITICAL</span>
        <span className="text-text-secondary">
          {' '}
          ATR-2026-00220 · Base64-Encoded RCE via Raw IP · confidence 92%
        </span>
      </p>
      <p className="whitespace-nowrap">
        <span className="term-critical">✗ CRITICAL</span>
        <span className="text-text-secondary">
          {' '}
          ATR-2026-00121 · Malicious Code in Skill Package · confidence 91%
        </span>
      </p>
      <p className="whitespace-nowrap">
        <span className="term-high">✗ HIGH</span>
        <span className="text-text-secondary">
          {' '}
          ATR-2026-00225 · Hardcoded Suspicious IP in Skill · confidence 92%
        </span>
      </p>
      <p className="term-dim whitespace-nowrap">
        verdict: 3 threats — a live malware dropper, caught before the agent loaded it
      </p>
    </div>
  );
}
