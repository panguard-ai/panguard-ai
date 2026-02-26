import { GlobalIcon } from "@/components/ui/BrandIcons";

const companies = [
  "TechCorp",
  "GlobalFinance",
  "CyberSecure",
  "DataFlow",
  "InnovateIT",
  "SecureNet",
];

export default function TrustBar() {
  return (
    <section className="bg-surface-1 py-8 px-6 border-b border-border">
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
        <span className="text-[12px] text-text-muted uppercase tracking-wider shrink-0">
          Trusted by teams at
        </span>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          {companies.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1.5 text-[13px] text-text-tertiary font-medium opacity-50 hover:opacity-80 transition-opacity"
            >
              <GlobalIcon size={12} className="text-brand-sage/40" />
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
