"use client";
import { Terminal, Building, Users } from "lucide-react";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const personas = [
  {
    icon: Terminal,
    title: "Solo Developer",
    pain: "You deployed on DigitalOcean. Bots scan your ports daily. Your AI-generated code has vulnerabilities. One SSH breach = your SaaS is gone.",
    solution: "Panguard auto-configures for your stack, blocks attacks silently, alerts you on LINE/Telegram when something matters.",
  },
  {
    icon: Building,
    title: "Small Business (5\u201350 people)",
    pain: "No IT department. \u2018invoice.exe\u2019 = ransomware in 5 seconds. Average ransom: $10K\u2013$50K. 60% of SMBs close within 6 months of a breach.",
    solution: "Zero-config protection for every endpoint. AI blocks threats before they spread. Weekly summary, not a dashboard.",
  },
  {
    icon: Users,
    title: "Mid-size Company (50\u2013500 people)",
    pain: "IT but no security team. Biggest client demands supply chain compliance. No compliance = lost contracts. Market solutions cost $36K+/year.",
    solution: "Full AI protection + auto-generated compliance reports (ISO 27001, SOC 2). $99/mo, not $36K/year.",
  },
];

export default function Personas() {
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline="Who We Protect"
        title="Three audiences. All underserved."
        subtitle="Every funded AI security company targets Fortune 500. We protect the other 400 million."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        {personas.map((p, i) => (
          <FadeInUp key={p.title} delay={i * 0.08}>
            <div className="bg-surface-0 rounded-2xl p-8 border border-border h-full flex flex-col card-glow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-sage/10 flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-brand-sage" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">{p.title}</h3>
              </div>
              <p className="text-sm text-text-tertiary leading-relaxed flex-1">
                {p.pain}
              </p>
              <div className="border-t border-border mt-6 pt-6">
                <p className="text-sm text-text-secondary leading-relaxed">
                  <span className="text-brand-sage font-semibold">Panguard: </span>
                  {p.solution}
                </p>
              </div>
            </div>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}
