import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ShieldIcon, TerminalIcon, HistoryIcon, ResponseIcon, LockIcon,
} from "@/components/ui/BrandIcons";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";

export const metadata: Metadata = {
  title: "For Developers",
};

const benefits = [
  {
    icon: TerminalIcon,
    title: "One Command Setup",
    description:
      "Install Panguard with a single CLI command. No complex configuration files, no YAML sprawl, no agent conflicts. Just run the installer and you are protected in under 60 seconds.",
  },
  {
    icon: HistoryIcon,
    title: "Zero Time Overhead",
    description:
      "Panguard runs silently in the background. Less than 1% CPU overhead and minimal memory footprint. It never interrupts your flow with false positives or intrusive alerts.",
  },
  {
    icon: ResponseIcon,
    title: "AI-Powered Explanations",
    description:
      "When Panguard detects something, it tells you what happened in plain language. No need to interpret cryptic CVE codes or parse security jargon. Understand threats instantly.",
  },
  {
    icon: LockIcon,
    title: "Secure Your Side Projects",
    description:
      "Protect your personal servers, VPS instances, and cloud deployments with the same enterprise-grade security used by large organizations, at a price that makes sense for individuals.",
  },
  {
    icon: TerminalIcon,
    title: "Developer-First API",
    description:
      "Integrate Panguard into your CI/CD pipelines, scripts, and automation workflows. Our REST API and CLI tools are built for developers who want programmatic control over their security posture.",
  },
];

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <NavBar />
      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 lg:px-[120px] pt-20 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 bg-surface-1 border border-border rounded-full px-4 py-1.5 mb-6">
                <TerminalIcon className="w-3.5 h-3.5 text-brand-sage" />
                <span className="text-xs text-text-secondary font-medium">
                  Built for solo devs and indie hackers
                </span>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <h1 className="text-4xl lg:text-5xl font-bold text-text-primary leading-tight mb-6">
                Enterprise security.
                <br />
                <span className="text-brand-sage">Developer simplicity.</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-2xl mx-auto">
                You ship code, not security configurations. Panguard gives solo
                developers and indie hackers the same AI-powered protection that
                enterprises use -- without the complexity, the overhead, or the
                enterprise price tag.
              </p>
            </FadeInUp>
            <FadeInUp delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/early-access"
                  className="bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
                >
                  Start Free Trial
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

        {/* Benefits */}
        <section className="px-6 lg:px-[120px] py-16 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <FadeInUp>
              <h2 className="text-2xl font-bold text-text-primary text-center mb-12">
                Why developers choose Panguard
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

        {/* Pricing Context */}
        <section className="px-6 lg:px-[120px] py-16 border-t border-border bg-surface-1">
          <FadeInUp>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-3">
                Priced for developers, not enterprises
              </h2>
              <p className="text-text-secondary mb-8">
                Start free with Panguard Scan. Upgrade to Solo for full protection.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                <div className="bg-surface-0 rounded-2xl p-6 border border-border text-center">
                  <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-2">Free Scan</p>
                  <p className="text-3xl font-extrabold text-text-primary">$0</p>
                  <p className="text-sm text-text-tertiary mt-2">1 endpoint, basic scan + PDF report</p>
                </div>
                <div className="bg-surface-0 rounded-2xl p-6 border border-brand-sage card-glow text-center">
                  <p className="text-xs uppercase tracking-wider text-brand-sage font-semibold mb-2">Solo</p>
                  <p className="text-3xl font-extrabold text-text-primary">$9<span className="text-sm text-text-tertiary font-normal">/mo</span></p>
                  <p className="text-sm text-text-tertiary mt-2">Guard + Chat + Scan, LINE/Telegram alerts</p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm text-brand-sage hover:text-brand-sage-light font-medium mt-6"
              >
                See all plans <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </FadeInUp>
        </section>

        {/* Integrations */}
        <section className="px-6 lg:px-[120px] py-12 border-t border-border">
          <FadeInUp>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-6">
                Fits your workflow
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {["CLI", "REST API", "GitHub Actions", "Docker", "SSH", "Webhooks"].map((tool) => (
                  <span
                    key={tool}
                    className="bg-surface-1 border border-border rounded-full px-4 py-2 text-sm text-text-secondary"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </FadeInUp>
        </section>

        {/* CTA */}
        <section className="px-6 lg:px-[120px] py-16 border-t border-border">
          <FadeInUp>
            <div className="max-w-2xl mx-auto text-center">
              <ShieldIcon className="w-10 h-10 text-brand-sage mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-3">
                Secure your stack in 60 seconds
              </h2>
              <p className="text-text-secondary mb-6">
                Free for personal projects. No credit card required.
              </p>
              <Link
                href="/early-access"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Get Started
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
