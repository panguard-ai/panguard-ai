import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ShieldIcon, TeamIcon, NetworkIcon, AnalyticsIcon, SettingsIcon, SupportIcon,
  LockIcon,
} from "@/components/ui/BrandIcons";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";

export const metadata: Metadata = {
  title: "For Mid-size Companies",
};

const benefits = [
  {
    icon: TeamIcon,
    title: "Team Management and RBAC",
    description:
      "Fine-grained role-based access control lets you assign Owner, Admin, Analyst, and Viewer roles across your organization. Create custom roles to match your team structure and ensure least-privilege access.",
  },
  {
    icon: NetworkIcon,
    title: "Centralized Multi-Site Dashboard",
    description:
      "Monitor all your endpoints, offices, and cloud environments from a single pane of glass. Real-time threat maps, consolidated alerting, and organization-wide security posture scoring.",
  },
  {
    icon: AnalyticsIcon,
    title: "Automated Compliance Reporting",
    description:
      "Generate audit-ready reports for SOC 2, ISO 27001, and Taiwan Cyber Security Act (TCSA) at the click of a button. Schedule recurring reports and share them with auditors, investors, and partners.",
  },
  {
    icon: LockIcon,
    title: "SSO and Advanced Authentication",
    description:
      "SAML 2.0 and OIDC integration for single sign-on with your identity provider. Enforce multi-factor authentication, session policies, and conditional access rules organization-wide.",
  },
  {
    icon: SettingsIcon,
    title: "API and Integration Ecosystem",
    description:
      "Integrate Panguard into your existing toolchain with our comprehensive REST API. Native integrations with Slack, Microsoft Teams, PagerDuty, Jira, and leading SIEM platforms.",
  },
  {
    icon: SupportIcon,
    title: "Dedicated Support and Onboarding",
    description:
      "Business plan customers receive a dedicated customer success manager, priority support SLA, and guided onboarding to ensure a smooth rollout across your organization.",
  },
];

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <NavBar />
      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 lg:px-[120px] pt-20 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 bg-surface-1 border border-border rounded-full px-4 py-1.5 mb-6">
                <TeamIcon className="w-3.5 h-3.5 text-brand-sage" />
                <span className="text-xs text-text-secondary font-medium">
                  For organizations with 50 to 500 employees
                </span>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <h1 className="text-4xl lg:text-5xl font-bold text-text-primary leading-tight mb-6">
                Scale security
                <br />
                <span className="text-brand-sage">without scaling complexity.</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-2xl mx-auto">
                Mid-size companies face enterprise-level threats but often
                lack enterprise-level security teams. Panguard bridges that
                gap with AI-powered protection that deploys fast, scales
                effortlessly, and provides the visibility and compliance
                your growing organization demands.
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
                  href="/contact"
                  className="border border-border text-text-secondary font-semibold text-sm rounded-full px-8 py-3.5 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
                >
                  Talk to Sales
                </Link>
              </div>
            </FadeInUp>
          </div>
        </section>

        {/* SLA bar */}
        <section className="px-6 lg:px-[120px] py-12 border-t border-border">
          <FadeInUp>
            <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-text-primary">99.9%</p>
                <p className="text-xs text-text-tertiary mt-1">
                  guaranteed uptime SLA
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-text-primary">500+</p>
                <p className="text-xs text-text-tertiary mt-1">
                  endpoints per organization
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-brand-sage">24/7</p>
                <p className="text-xs text-text-tertiary mt-1">
                  priority support response
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
                Built for growing organizations
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
                Custom pricing for your organization
              </h2>
              <p className="text-text-secondary mb-8 max-w-xl mx-auto">
                500+ endpoints, custom AI models, dedicated support, on-premise deployment options, and SLA guarantees tailored to your requirements.
              </p>
              <div className="bg-surface-0 rounded-2xl p-8 border border-border max-w-sm mx-auto text-center">
                <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-2">Enterprise</p>
                <p className="text-3xl font-extrabold text-text-primary">Custom</p>
                <p className="text-sm text-text-tertiary mt-2">Volume discounts starting at 500 endpoints</p>
                <Link
                  href="/contact"
                  className="mt-5 block text-center bg-brand-sage text-surface-0 font-semibold rounded-full px-5 py-3 text-sm hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </FadeInUp>
        </section>

        {/* Integrations */}
        <section className="px-6 lg:px-[120px] py-12 border-t border-border">
          <FadeInUp>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-6">
                Enterprise integrations
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {["SIEM", "SSO (SAML/OIDC)", "PagerDuty", "Jira", "Slack", "Microsoft Teams", "REST API", "Webhooks"].map((tool) => (
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
                See Panguard in action
              </h2>
              <p className="text-text-secondary mb-6">
                Schedule a personalized demo with our team.
              </p>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Request a Demo
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
