"use client";
import { X } from "lucide-react";
import { CheckIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const rows = [
  { feature: "Price", cs: "$59.99/device/yr", def: "Included in M365", pg: "From $9/mo" },
  { feature: "Setup", cs: "Dashboard configuration", def: "Azure Console", pg: "One command, zero config" },
  { feature: "Interface", cs: "Professional dashboard", def: "Azure portal", pg: "AI Chat in plain language" },
  { feature: "After detection", cs: "Shows alert \u2192 you handle", def: "Shows alert \u2192 you handle", pg: "Auto-responds + explains" },
  { feature: "Reporting", cs: "Technical reports", def: "Technical reports", pg: "\u201CThis week: blocked 847. You\u2019re safe.\u201D" },
  { feature: "Best for", cs: "Teams with IT staff", def: "M365 organizations", pg: "Anyone. No expertise needed." },
  { feature: "Developer plan", cs: "no", def: "no", pg: "yes" },
  { feature: "Auto compliance", cs: "no", def: "no", pg: "yes" },
  { feature: "AI Chat", cs: "no", def: "no", pg: "yes" },
];

function Cell({ val, highlight = false }: { val: string; highlight?: boolean }) {
  if (val === "yes") return <CheckIcon size={16} className="text-status-safe mx-auto" />;
  if (val === "no") return <X className="w-4 h-4 text-text-muted mx-auto" />;
  return <span className={highlight ? "text-text-primary font-medium" : "text-text-tertiary"}>{val}</span>;
}

export default function Comparison() {
  return (
    <SectionWrapper>
      <SectionTitle
        overline="Why Panguard"
        title="You deserve more than a dashboard."
        subtitle="Other tools detect threats and show you a dashboard. Panguard detects, responds, and explains."
      />

      {/* Desktop table */}
      <FadeInUp delay={0.1} className="hidden md:block mt-12">
        <div className="bg-surface-1 rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-0">
                <th className="text-left p-4 text-text-tertiary font-medium text-xs uppercase tracking-wider">Feature</th>
                <th className="p-4 text-text-tertiary font-medium text-xs uppercase tracking-wider">CrowdStrike Falcon Go</th>
                <th className="p-4 text-text-tertiary font-medium text-xs uppercase tracking-wider">Microsoft Defender</th>
                <th className="p-4 text-text-primary font-semibold text-xs uppercase tracking-wider border-l-2 border-brand-sage">Panguard AI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="border-t border-border hover:bg-surface-1/50">
                  <td className="p-4 text-text-secondary font-medium">{r.feature}</td>
                  <td className="p-4 text-center"><Cell val={r.cs} /></td>
                  <td className="p-4 text-center"><Cell val={r.def} /></td>
                  <td className="p-4 text-center border-l-2 border-brand-sage"><Cell val={r.pg} highlight /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FadeInUp>

      {/* Mobile cards */}
      <div className="md:hidden mt-12 space-y-3">
        {rows.map((r, i) => (
          <FadeInUp key={r.feature} delay={i * 0.04}>
            <div className="bg-surface-1 rounded-xl border border-border p-4">
              <p className="text-text-muted text-xs uppercase tracking-wide mb-3">{r.feature}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-tertiary">CrowdStrike</span><span className="text-text-tertiary"><Cell val={r.cs} /></span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Defender</span><span className="text-text-tertiary"><Cell val={r.def} /></span></div>
                <div className="flex justify-between pt-2 border-t border-border"><span className="text-brand-sage font-medium">Panguard</span><span><Cell val={r.pg} highlight /></span></div>
              </div>
            </div>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.2}>
        <p className="text-text-tertiary text-sm italic mt-6 text-center max-w-2xl mx-auto">
          &ldquo;Falcon Go is a security camera. Panguard is a security
          company &mdash; cameras, plus someone watching, responding, and
          reporting.&rdquo;
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
