import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  CheckIcon, ShieldIcon, EnterpriseIcon, ResponseIcon,
} from "@/components/ui/BrandIcons";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import FAQAccordion from "./FAQAccordion";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for AI-powered endpoint security. 30-day free trial on every plan. No credit card required. Choose Starter, Pro, or Enterprise.",
};

/* ────────────────────────────  Plans  ──────────────────────────── */

const plans = [
  {
    name: "Starter",
    audience: "For solo developers & freelancers",
    price: "49",
    isCustom: false,
    iconName: "Zap" as const,
    features: [
      "Up to 5 endpoints",
      "Layer 1 + Layer 3 AI detection",
      "LINE / Telegram / Email alerts",
      "Community support",
      "Panguard Scan (unlimited)",
      "Panguard Chat (basic)",
      "7-day log retention",
      "99% uptime SLA",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: false,
  },
  {
    name: "Pro",
    audience: "For small businesses (5-50 employees)",
    price: "149",
    isCustom: false,
    iconName: "Shield" as const,
    features: [
      "Up to 50 endpoints",
      "Full 3-layer AI detection",
      "Slack / Email / Webhook alerts",
      "Priority email support",
      "Custom alert rules",
      "Panguard Trap (5 honeypots)",
      "Panguard Chat (advanced)",
      "30-day log retention",
      "Team dashboard",
      "Custom integrations",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: true,
  },
  {
    name: "Enterprise",
    audience: "For compliance-driven organizations",
    price: "Custom",
    isCustom: true,
    iconName: "Building" as const,
    features: [
      "Unlimited endpoints",
      "Custom AI models",
      "SIEM integration (Splunk, ELK)",
      "Dedicated support + SLA 99.99%",
      "Compliance ready (ISO 27001, SOC 2)",
      "On-premise deployment option",
      "Panguard Trap (unlimited)",
      "Panguard Report (full suite)",
      "90-day log retention",
      "SSO & RBAC",
      "Custom integrations",
      "Quarterly security review",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    popular: false,
  },
];

const iconMap = { Zap: ResponseIcon, Shield: ShieldIcon, Building: EnterpriseIcon };

/* ────────────────────  Feature Comparison Matrix  ──────────────── */

type FeatureValue = boolean | string;

interface FeatureRow {
  feature: string;
  starter: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

const comparisonCategories: { category: string; rows: FeatureRow[] }[] = [
  {
    category: "Detection & Protection",
    rows: [
      { feature: "AI threat detection layers", starter: "Layer 1 + 3", pro: "All 3 layers", enterprise: "All 3 + custom" },
      { feature: "Real-time monitoring", starter: true, pro: true, enterprise: true },
      { feature: "Automated threat response", starter: false, pro: true, enterprise: true },
      { feature: "Custom AI models", starter: false, pro: false, enterprise: true },
      { feature: "Behavioral analysis", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Products Included",
    rows: [
      { feature: "Panguard Scan", starter: "Unlimited", pro: "Unlimited", enterprise: "Unlimited" },
      { feature: "Panguard Guard", starter: "Basic", pro: "Full", enterprise: "Full + custom" },
      { feature: "Panguard Chat", starter: "Basic", pro: "Advanced", enterprise: "Advanced + API" },
      { feature: "Panguard Trap (honeypots)", starter: false, pro: "5 honeypots", enterprise: "Unlimited" },
      { feature: "Panguard Report", starter: false, pro: "Weekly", enterprise: "Full suite" },
    ],
  },
  {
    category: "Alerts & Integrations",
    rows: [
      { feature: "Email alerts", starter: true, pro: true, enterprise: true },
      { feature: "LINE / Telegram alerts", starter: true, pro: true, enterprise: true },
      { feature: "Slack integration", starter: false, pro: true, enterprise: true },
      { feature: "Webhook support", starter: false, pro: true, enterprise: true },
      { feature: "SIEM integration", starter: false, pro: false, enterprise: true },
      { feature: "Custom integrations", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Compliance & Reporting",
    rows: [
      { feature: "Daily security digest", starter: true, pro: true, enterprise: true },
      { feature: "Weekly AI report", starter: false, pro: true, enterprise: true },
      { feature: "ISO 27001 compliance", starter: false, pro: false, enterprise: true },
      { feature: "SOC 2 compliance", starter: false, pro: false, enterprise: true },
      { feature: "Custom compliance reports", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Support & Infrastructure",
    rows: [
      { feature: "Community support", starter: true, pro: true, enterprise: true },
      { feature: "Priority email support", starter: false, pro: true, enterprise: true },
      { feature: "Dedicated account manager", starter: false, pro: false, enterprise: true },
      { feature: "SLA guarantee", starter: false, pro: "99.5%", enterprise: "99.9%" },
      { feature: "Log retention", starter: "7 days", pro: "30 days", enterprise: "90 days" },
      { feature: "SSO & RBAC", starter: false, pro: false, enterprise: true },
      { feature: "On-premise deployment", starter: false, pro: false, enterprise: true },
      { feature: "Quarterly security review", starter: false, pro: false, enterprise: true },
    ],
  },
];

/* ────────────────────  Comparison Cell  ──────────────────────── */

function ComparisonCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return <CheckIcon className="w-4 h-4 text-status-safe mx-auto" />;
  }
  if (value === false) {
    return <X className="w-4 h-4 text-text-muted mx-auto" />;
  }
  return (
    <span className="text-xs text-text-secondary text-center block">
      {value}
    </span>
  );
}

/* ════════════════════════  Page Component  ═══════════════════════ */

export default function PricingPage() {
  return (
    <>
      <NavBar />
      <main>
        {/* ───────────── Hero ───────────── */}
        <section className="pt-24 pb-4 px-6 text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              Pricing
            </p>
            <h1 className="text-[clamp(40px,5vw,64px)] font-bold text-text-primary leading-[1.08] max-w-3xl mx-auto">
              Simple, transparent pricing
            </h1>
            <p className="text-text-secondary mt-4 text-lg max-w-xl mx-auto leading-relaxed">
              30-day free trial on every plan. No credit card required.
              Start protecting your endpoints in under 60 seconds.
            </p>
          </FadeInUp>
        </section>

        {/* ───────────── Pricing Cards ───────────── */}
        <SectionWrapper>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {plans.map((plan, i) => {
              const Icon = iconMap[plan.iconName];
              return (
                <FadeInUp key={plan.name} delay={i * 0.08}>
                  <div
                    className={`relative bg-surface-1 rounded-2xl p-9 border h-full flex flex-col ${
                      plan.popular ? "border-brand-sage" : "border-border"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-sage text-surface-0 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-brand-sage" />
                      <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">
                        {plan.name}
                      </p>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      {plan.audience}
                    </p>

                    <div className="mt-4 mb-6">
                      {plan.isCustom ? (
                        <>
                          <span className="text-5xl font-extrabold text-text-primary">Custom</span>
                          <p className="text-lg text-text-tertiary mt-1">Contact us</p>
                        </>
                      ) : (
                        <>
                          <span className="text-5xl font-extrabold text-text-primary">
                            ${plan.price}
                          </span>
                          <span className="text-lg text-text-tertiary">/mo</span>
                        </>
                      )}
                    </div>

                    <ul className="space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 text-sm text-text-secondary"
                        >
                          <CheckIcon className="w-4 h-4 text-brand-sage mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={plan.ctaHref}
                      className={`mt-8 block text-center font-semibold rounded-full px-6 py-3 transition-all duration-200 active:scale-[0.98] ${
                        plan.popular
                          ? "bg-brand-sage text-surface-0 hover:bg-brand-sage-light"
                          : "border border-border text-text-secondary hover:border-brand-sage hover:text-text-primary"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </FadeInUp>
              );
            })}
          </div>

          <FadeInUp>
            <p className="text-sm text-text-tertiary text-center mt-8">
              All plans include 30-day money-back guarantee &middot; Free
              Panguard Scan included &middot; Save 20% with annual billing
            </p>
          </FadeInUp>
        </SectionWrapper>

        {/* ───────────── Feature Comparison ───────────── */}
        <SectionWrapper dark>
          <SectionTitle
            overline="Compare Plans"
            title="Feature comparison"
            subtitle="Every feature at a glance. Pick the plan that fits your team."
          />

          <FadeInUp>
            <div className="mt-12 overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-sm text-text-tertiary font-normal py-4 pr-4 w-[40%]" />
                    <th className="text-center text-sm text-text-muted font-semibold uppercase tracking-wider py-4 w-[20%]">
                      Starter
                    </th>
                    <th className="text-center text-sm text-brand-sage font-semibold uppercase tracking-wider py-4 w-[20%]">
                      Pro
                    </th>
                    <th className="text-center text-sm text-text-muted font-semibold uppercase tracking-wider py-4 w-[20%]">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonCategories.map((cat) => (
                    <Fragment key={cat.category}>
                      <tr>
                        <td
                          colSpan={4}
                          className="pt-8 pb-3 text-xs uppercase tracking-wider text-brand-sage font-semibold"
                        >
                          {cat.category}
                        </td>
                      </tr>
                      {cat.rows.map((row) => (
                        <tr
                          key={row.feature}
                          className="border-b border-border/50"
                        >
                          <td className="py-3 pr-4 text-sm text-text-secondary">
                            {row.feature}
                          </td>
                          <td className="py-3 text-center">
                            <ComparisonCell value={row.starter} />
                          </td>
                          <td className="py-3 text-center bg-brand-sage/[0.03]">
                            <ComparisonCell value={row.pro} />
                          </td>
                          <td className="py-3 text-center">
                            <ComparisonCell value={row.enterprise} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInUp>
        </SectionWrapper>

        {/* ───────────── FAQ ───────────── */}
        <SectionWrapper>
          <SectionTitle
            overline="FAQ"
            title="Frequently asked questions"
            subtitle="Everything you need to know about pricing and plans."
          />

          <div className="mt-12 max-w-2xl mx-auto">
            <FAQAccordion />
          </div>
        </SectionWrapper>

        {/* ───────────── Enterprise CTA ───────────── */}
        <SectionWrapper dark>
          <FadeInUp>
            <div className="text-center max-w-2xl mx-auto">
              <EnterpriseIcon className="w-10 h-10 text-brand-sage mx-auto mb-6" />
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary leading-[1.1]">
                Need a custom solution?
              </h2>
              <p className="text-text-secondary mt-4 leading-relaxed">
                For organizations with 500+ endpoints, dedicated compliance
                requirements, or custom deployment needs, our Enterprise plan
                offers white-glove onboarding, unlimited everything, and a
                dedicated security engineer assigned to your account.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <Link
                  href="/contact"
                  className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
                >
                  Talk to Sales
                </Link>
                <Link
                  href="/demo"
                  className="border border-border text-text-secondary font-semibold rounded-full px-8 py-3 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
                >
                  Request a Demo
                </Link>
              </div>
            </div>
          </FadeInUp>
        </SectionWrapper>

        {/* ───────────── Guarantee Footer ───────────── */}
        <section className="py-10 px-6 text-center border-b border-border">
          <FadeInUp>
            <div className="flex items-center justify-center gap-2">
              <ShieldIcon className="w-4 h-4 text-brand-sage" />
              <p className="text-sm text-text-tertiary">
                30-day money-back guarantee on all plans. No questions asked.
              </p>
            </div>
          </FadeInUp>
        </section>
      </main>
      <Footer />
    </>
  );
}
