"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { CheckIcon } from "@/components/ui/BrandIcons";
import FadeInUp from "@/components/FadeInUp";
import SectionTitle from "@/components/ui/SectionTitle";

/* ── Plan data ── */

interface Plan {
  name: string;
  audience: string;
  price: number | null;
  unit: string;
  endpoints: string;
  features: string[];
  cta: string;
  ctaHref: string;
  popular: boolean;
}

const plans: Plan[] = [
  {
    name: "Free Scan",
    audience: "Try before you buy",
    price: 0,
    unit: "",
    endpoints: "1 endpoint",
    features: [
      "Basic security scan",
      "PDF report with risk score",
      "Unlimited scans",
    ],
    cta: "Scan Free",
    ctaHref: "/early-access",
    popular: false,
  },
  {
    name: "Solo",
    audience: "Solo developers & freelancers",
    price: 9,
    unit: "/mo",
    endpoints: "1 endpoint",
    features: [
      "Guard (24/7 monitoring)",
      "Chat (LINE / Telegram alerts)",
      "Scan (unlimited)",
      "7-day log retention",
      "Community support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: false,
  },
  {
    name: "Starter",
    audience: "Small teams (2-5 people)",
    price: 19,
    unit: "/mo",
    endpoints: "Up to 5 endpoints",
    features: [
      "Everything in Solo",
      "Report (basic compliance)",
      "Email + LINE + Telegram alerts",
      "14-day log retention",
      "Team dashboard",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: false,
  },
  {
    name: "Team",
    audience: "Growing businesses (5-50)",
    price: 14,
    unit: "/endpoint/mo",
    endpoints: "5-50 endpoints",
    features: [
      "Everything in Starter",
      "Trap (honeypots)",
      "Slack integration",
      "30-day log retention",
      "Custom alert rules",
      "Priority support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: true,
  },
  {
    name: "Business",
    audience: "Mid-market (50-500 endpoints)",
    price: 10,
    unit: "/endpoint/mo",
    endpoints: "50-500 endpoints",
    features: [
      "Everything in Team",
      "API access",
      "Webhook integration",
      "90-day log retention",
      "SSO & RBAC",
      "Dedicated account manager",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: false,
  },
  {
    name: "Enterprise",
    audience: "Large organizations (500+)",
    price: null,
    unit: "",
    endpoints: "500+ endpoints",
    features: [
      "Everything in Business",
      "Custom AI models",
      "SIEM integration (Splunk, ELK)",
      "On-premise deployment",
      "Custom SLA (up to 99.99%)",
      "Quarterly security review",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    popular: false,
  },
];

/* ── Feature comparison ── */

type FeatureValue = boolean | string;
type TierKey = "free" | "solo" | "starter" | "team" | "business" | "enterprise";

interface FeatureRow {
  feature: string;
  free: FeatureValue;
  solo: FeatureValue;
  starter: FeatureValue;
  team: FeatureValue;
  business: FeatureValue;
  enterprise: FeatureValue;
}

const comparisonCategories: { category: string; rows: FeatureRow[] }[] = [
  {
    category: "Products Included",
    rows: [
      { feature: "Panguard Scan", free: "Basic", solo: "Full", starter: "Full", team: "Full", business: "Full", enterprise: "Full + custom" },
      { feature: "Panguard Guard", free: false, solo: true, starter: true, team: true, business: true, enterprise: true },
      { feature: "Panguard Chat", free: false, solo: "Basic", starter: "Basic", team: "Advanced", business: "Advanced", enterprise: "Advanced + API" },
      { feature: "Panguard Report", free: false, solo: false, starter: "Basic", team: "Full", business: "Full", enterprise: "Full + custom" },
      { feature: "Panguard Trap", free: false, solo: false, starter: false, team: true, business: true, enterprise: true },
    ],
  },
  {
    category: "Alerts & Integrations",
    rows: [
      { feature: "Email alerts", free: false, solo: true, starter: true, team: true, business: true, enterprise: true },
      { feature: "LINE / Telegram", free: false, solo: true, starter: true, team: true, business: true, enterprise: true },
      { feature: "Slack", free: false, solo: false, starter: false, team: true, business: true, enterprise: true },
      { feature: "Webhook / API", free: false, solo: false, starter: false, team: false, business: true, enterprise: true },
      { feature: "SIEM integration", free: false, solo: false, starter: false, team: false, business: false, enterprise: true },
    ],
  },
  {
    category: "Support & Infrastructure",
    rows: [
      { feature: "Community support", free: true, solo: true, starter: true, team: true, business: true, enterprise: true },
      { feature: "Priority support", free: false, solo: false, starter: false, team: true, business: true, enterprise: true },
      { feature: "Dedicated manager", free: false, solo: false, starter: false, team: false, business: true, enterprise: true },
      { feature: "Log retention", free: false, solo: "7 days", starter: "14 days", team: "30 days", business: "90 days", enterprise: "Custom" },
      { feature: "SSO & RBAC", free: false, solo: false, starter: false, team: false, business: true, enterprise: true },
      { feature: "On-premise option", free: false, solo: false, starter: false, team: false, business: false, enterprise: true },
    ],
  },
];

const tierKeys: TierKey[] = ["free", "solo", "starter", "team", "business", "enterprise"];
const tierLabels = ["Free", "Solo", "Starter", "Team", "Business", "Enterprise"];

function ComparisonCell({ value }: { value: FeatureValue }) {
  if (value === true) return <CheckIcon className="w-4 h-4 text-status-safe mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-text-muted mx-auto" />;
  return <span className="text-xs text-text-secondary text-center block">{value}</span>;
}

/* ── Main component ── */

export default function PricingCards() {
  const [annual, setAnnual] = useState(false);

  const displayPrice = (price: number | null) => {
    if (price === null) return null;
    if (price === 0) return "$0";
    const effective = annual ? Math.round(price * 0.8 * 100) / 100 : price;
    return `$${effective % 1 === 0 ? effective : effective.toFixed(2)}`;
  };

  return (
    <>
      {/* Annual toggle */}
      <FadeInUp>
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm ${!annual ? "text-text-primary font-medium" : "text-text-tertiary"}`}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              annual ? "bg-brand-sage" : "bg-surface-3"
            }`}
            aria-label="Toggle annual billing"
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface-0 transition-transform duration-200 ${
                annual ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className={`text-sm ${annual ? "text-text-primary font-medium" : "text-text-tertiary"}`}>
            Annual
          </span>
          {annual && (
            <span className="text-xs text-brand-sage font-semibold bg-brand-sage/10 px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          )}
        </div>
      </FadeInUp>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {plans.map((plan, i) => (
          <FadeInUp key={plan.name} delay={i * 0.05}>
            <div
              className={`relative bg-surface-1 rounded-2xl p-7 border h-full flex flex-col ${
                plan.popular ? "border-brand-sage" : "border-border"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-sage text-surface-0 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </span>
              )}

              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">
                {plan.name}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5 mb-3">
                {plan.audience}
              </p>

              <div className="mb-1">
                {plan.price === null ? (
                  <span className="text-3xl font-extrabold text-text-primary">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-text-primary">
                      {displayPrice(plan.price)}
                    </span>
                    {plan.unit && (
                      <span className="text-sm text-text-tertiary">{plan.unit}</span>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-text-muted mb-4">{plan.endpoints}</p>
              {annual && plan.price !== null && plan.price > 0 && (
                <p className="text-[11px] text-text-muted -mt-3 mb-4">billed annually</p>
              )}

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                    <CheckIcon className="w-3.5 h-3.5 text-brand-sage mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`mt-6 block text-center font-semibold rounded-full px-5 py-3 text-sm transition-all duration-200 active:scale-[0.98] ${
                  plan.popular
                    ? "bg-brand-sage text-surface-0 hover:bg-brand-sage-light"
                    : "border border-border text-text-secondary hover:border-brand-sage hover:text-text-primary"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp>
        <p className="text-sm text-text-tertiary text-center mt-8">
          All paid plans include 30-day money-back guarantee. Save 20% with annual billing.
        </p>
      </FadeInUp>

      {/* Feature Comparison */}
      <div className="mt-20">
        <SectionTitle
          overline="Compare Plans"
          title="Feature comparison"
          subtitle="Every feature at a glance."
        />
        <FadeInUp>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-sm text-text-tertiary font-normal py-4 pr-4 w-[25%]" />
                  {tierLabels.map((label, idx) => (
                    <th
                      key={label}
                      className={`text-center text-xs font-semibold uppercase tracking-wider py-4 ${
                        tierKeys[idx] === "team" ? "text-brand-sage" : "text-text-muted"
                      }`}
                      style={{ width: `${75 / 6}%` }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonCategories.map((cat) => (
                  <Fragment key={cat.category}>
                    <tr>
                      <td
                        colSpan={7}
                        className="pt-8 pb-3 text-xs uppercase tracking-wider text-brand-sage font-semibold"
                      >
                        {cat.category}
                      </td>
                    </tr>
                    {cat.rows.map((row) => (
                      <tr key={row.feature} className="border-b border-border/50">
                        <td className="py-3 pr-4 text-sm text-text-secondary">{row.feature}</td>
                        {tierKeys.map((key) => (
                          <td
                            key={key}
                            className={`py-3 text-center ${key === "team" ? "bg-brand-sage/[0.03]" : ""}`}
                          >
                            <ComparisonCell value={row[key]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </FadeInUp>
      </div>
    </>
  );
}
