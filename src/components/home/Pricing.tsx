"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const plans = [
  {
    name: "Free Scan",
    price: 0,
    unit: "",
    features: [
      "1 endpoint",
      "Basic security scan",
      "PDF report",
    ],
    cta: "Scan Free",
    ctaHref: "/early-access",
    popular: false,
  },
  {
    name: "Solo",
    price: 9,
    unit: "/mo",
    features: [
      "1 endpoint",
      "Guard + Chat + Scan",
      "LINE / Telegram alerts",
      "7-day log retention",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: false,
  },
  {
    name: "Team",
    price: 14,
    unit: "/endpoint/mo",
    features: [
      "5-50 endpoints",
      "Guard + Chat + Scan + Report + Trap",
      "Slack / LINE / Telegram / Email",
      "30-day log retention",
      "Team dashboard",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: true,
  },
  {
    name: "Enterprise",
    price: null,
    unit: "",
    features: [
      "500+ endpoints",
      "Custom AI models",
      "Dedicated support",
      "SIEM integration",
      "On-premise option",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    popular: false,
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const displayPrice = (price: number | null) => {
    if (price === null) return null;
    if (price === 0) return "$0";
    const effective = annual ? Math.round(price * 0.8 * 100) / 100 : price;
    return `$${effective % 1 === 0 ? effective : effective.toFixed(2)}`;
  };

  return (
    <SectionWrapper id="pricing" dark>
      <SectionTitle
        overline="Pricing"
        title="Simple, transparent pricing."
        subtitle="30-day free trial on all paid plans. No credit card required."
      />

      {/* Annual toggle */}
      <FadeInUp delay={0.05}>
        <div className="flex items-center justify-center gap-3 mt-8">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 max-w-5xl mx-auto">
        {plans.map((plan, i) => (
          <FadeInUp key={plan.name} delay={i * 0.06}>
            <div
              className={`relative bg-surface-0 rounded-2xl p-7 border h-full flex flex-col ${
                plan.popular
                  ? "border-brand-sage card-glow"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-sage text-surface-0 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </span>
              )}

              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-3">
                {plan.name}
              </p>

              <div className="mb-5">
                {plan.price === null ? (
                  <>
                    <span className="text-3xl font-extrabold text-text-primary">Custom</span>
                    <p className="text-sm text-text-tertiary mt-1">Contact us</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-text-primary">
                      {displayPrice(plan.price)}
                    </span>
                    {plan.unit && (
                      <span className="text-sm text-text-tertiary">{plan.unit}</span>
                    )}
                    {annual && plan.price > 0 && (
                      <p className="text-[11px] text-text-muted mt-1">
                        billed annually
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                    <CheckIcon size={14} className="text-brand-sage mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`mt-6 block text-center font-semibold rounded-full px-5 py-3 text-sm transition-all duration-200 active:scale-[0.98] ${
                  plan.popular
                    ? "bg-brand-sage text-surface-0 hover:bg-brand-sage-light"
                    : "border border-text-tertiary/40 text-text-secondary hover:text-text-primary hover:border-text-secondary"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.3}>
        <p className="text-sm text-text-tertiary text-center mt-8">
          <Link href="/pricing" className="text-brand-sage hover:text-brand-sage-light underline underline-offset-2">
            See all 6 plans, add-ons, and full feature comparison
          </Link>
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
