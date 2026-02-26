"use client";
import Link from "next/link";
import { CheckIcon } from "@/components/ui/BrandIcons";
import BrandLogo from "../ui/BrandLogo";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const plans = [
  {
    name: "Starter",
    label: "STARTER",
    price: "49",
    priceLabel: "/month",
    features: [
      "Up to 5 endpoints",
      "Basic AI detection",
      "Email support",
      "99% uptime SLA",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: false,
  },
  {
    name: "Pro",
    label: "MOST POPULAR",
    price: "149",
    priceLabel: "/month",
    features: [
      "Up to 50 endpoints",
      "Advanced AI detection",
      "Priority support",
      "99.9% uptime SLA",
      "Custom integrations",
    ],
    cta: "Start Free Trial",
    ctaHref: "/early-access",
    popular: true,
  },
  {
    name: "Enterprise",
    label: "ENTERPRISE",
    price: "Custom",
    priceLabel: "Contact us",
    features: [
      "Unlimited endpoints",
      "Custom AI models",
      "Dedicated support",
      "99.99% uptime SLA",
      "On-premise option",
      "SSO & compliance",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <SectionWrapper id="pricing" dark>
      <SectionTitle
        overline="Pricing"
        title="Choose Your Plan"
        subtitle="30-day free trial on all plans"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12 max-w-4xl mx-auto">
        {plans.map((plan, i) => (
          <FadeInUp key={plan.name} delay={i * 0.08}>
            <div
              className={`relative bg-surface-0 rounded-2xl p-9 border h-full flex flex-col ${
                plan.popular
                  ? "border-brand-sage card-glow"
                  : "border-border"
              }`}
            >
              <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-sm mb-5 ${
                plan.popular
                  ? "bg-[#41523E]/20 border border-brand-sage text-brand-sage"
                  : "bg-surface-2 border border-border text-text-secondary"
              }`}>
                {plan.label}
              </span>

              <div className="flex justify-center mb-4">
                <BrandLogo size={40} className={plan.popular ? "text-brand-sage" : "text-text-tertiary"} />
              </div>

              <div className="text-center mb-6">
                {plan.price === "Custom" ? (
                  <>
                    <span className="text-5xl font-extrabold text-text-primary">
                      Custom
                    </span>
                    <p className="text-lg text-text-tertiary mt-1">Contact us</p>
                  </>
                ) : (
                  <>
                    <span className="text-5xl font-extrabold text-text-primary">
                      ${plan.price}
                    </span>
                    <span className="text-lg text-text-tertiary">{plan.priceLabel}</span>
                  </>
                )}
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <CheckIcon size={16} className="text-brand-sage mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`mt-8 block text-center font-semibold rounded-full px-6 py-3.5 transition-all duration-200 active:scale-[0.98] ${
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

      <p className="text-sm text-text-tertiary text-center mt-8 flex items-center justify-center gap-3">
        All plans include 30-day money-back guarantee
        <CheckIcon size={16} className="text-status-safe" />
        <CheckIcon size={16} className="text-status-safe" />
        <BrandLogo size={16} className="text-text-muted" />
      </p>
    </SectionWrapper>
  );
}
