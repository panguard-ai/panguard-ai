import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ShieldIcon, EnterpriseIcon, TeamIcon, AnalyticsIcon, HistoryIcon, CheckIcon,
} from "@/components/ui/BrandIcons";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";

export const metadata: Metadata = {
  title: "For Small Business",
};

const benefits = [
  {
    icon: ShieldIcon,
    title: "No Security Team Required",
    description:
      "Panguard acts as your virtual security team. AI-powered threat detection and automated response mean you get enterprise-level protection without hiring dedicated security staff.",
  },
  {
    icon: HistoryIcon,
    title: "Deploy in Minutes, Not Months",
    description:
      "Traditional security solutions require weeks of consulting and configuration. Panguard deploys across your entire organization in under an hour with centralized management.",
  },
  {
    icon: TeamIcon,
    title: "Protect Every Endpoint",
    description:
      "From employee laptops to cloud servers, Panguard covers your entire attack surface. Support for macOS, Linux, and Windows ensures every device is protected.",
  },
  {
    icon: AnalyticsIcon,
    title: "Compliance Made Simple",
    description:
      "Automatically generate compliance reports for SOC 2, ISO 27001, and GDPR requirements. Demonstrate your security posture to clients and partners with one-click reports.",
  },
  {
    icon: CheckIcon,
    title: "Predictable Pricing",
    description:
      "Simple per-endpoint pricing that scales with your business. No hidden fees, no surprise overages, and no long-term contracts. Start with our free tier and upgrade when ready.",
  },
];

export default function SMBPage() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <NavBar />
      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 lg:px-[120px] pt-20 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 bg-surface-1 border border-border rounded-full px-4 py-1.5 mb-6">
                <EnterpriseIcon className="w-3.5 h-3.5 text-brand-sage" />
                <span className="text-xs text-text-secondary font-medium">
                  For teams of 5 to 50
                </span>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <h1 className="text-4xl lg:text-5xl font-bold text-text-primary leading-tight mb-6">
                Big company security.
                <br />
                <span className="text-brand-sage">Small company budget.</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-2xl mx-auto">
                Small businesses are the number one target for cyberattacks,
                yet most security tools are built for enterprises with
                dedicated IT teams. Panguard changes that. AI-powered
                protection that works out of the box, so you can focus on
                growing your business.
              </p>
            </FadeInUp>
            <FadeInUp delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/demo"
                  className="bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
                >
                  Request a Demo
                </Link>
                <Link
                  href="/pricing"
                  className="border border-border text-text-secondary font-semibold text-sm rounded-full px-8 py-3.5 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
                >
                  View Pricing
                </Link>
              </div>
            </FadeInUp>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 lg:px-[120px] py-12 border-t border-border">
          <FadeInUp>
            <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-text-primary">43%</p>
                <p className="text-xs text-text-tertiary mt-1">
                  of cyberattacks target small businesses
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-text-primary">$4.9M</p>
                <p className="text-xs text-text-tertiary mt-1">
                  average cost of a data breach in 2025
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-brand-sage">&lt;60s</p>
                <p className="text-xs text-text-tertiary mt-1">
                  to deploy Panguard on any endpoint
                </p>
              </div>
            </div>
          </FadeInUp>
        </section>

        {/* Benefits */}
        <section className="px-6 lg:px-[120px] py-16 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <FadeInUp>
              <h2 className="text-2xl font-bold text-text-primary text-center mb-12">
                Security that works for small teams
              </h2>
            </FadeInUp>
            <div className="grid md:grid-cols-2 gap-8">
              {benefits.map((benefit, i) => (
                <FadeInUp key={benefit.title} delay={i * 0.1}>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-surface-1 border border-border flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-brand-sage" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-text-primary mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 lg:px-[120px] py-16 border-t border-border">
          <FadeInUp>
            <div className="max-w-2xl mx-auto text-center">
              <ShieldIcon className="w-10 h-10 text-brand-sage mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-3">
                Protect your business today
              </h2>
              <p className="text-text-secondary mb-6">
                30-day free trial. No credit card required.
              </p>
              <Link
                href="/early-access"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </section>
      </main>
      <Footer />
    </div>
  );
}
