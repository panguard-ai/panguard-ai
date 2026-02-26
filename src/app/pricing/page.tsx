import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import FAQAccordion from "./FAQAccordion";
import PricingCards from "./PricingCards";
import { ShieldIcon, EnterpriseIcon } from "@/components/ui/BrandIcons";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for AI-powered endpoint security. Free Scan, Solo $9/mo, Starter $19/mo, Team $14/endpoint/mo, Business $10/endpoint/mo, Enterprise custom. 30-day free trial.",
};

export default function PricingPage() {
  return (
    <>
      <NavBar />
      <main>
        {/* Hero */}
        <section className="pt-24 pb-4 px-6 text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              Pricing
            </p>
            <h1 className="text-[clamp(40px,5vw,64px)] font-bold text-text-primary leading-[1.08] max-w-3xl mx-auto">
              Simple, transparent pricing
            </h1>
            <p className="text-text-secondary mt-4 text-lg max-w-xl mx-auto leading-relaxed">
              30-day free trial on every paid plan. No credit card required.
              Start protecting your endpoints in under 60 seconds.
            </p>
          </FadeInUp>
        </section>

        {/* Pricing Cards (client component with toggle) */}
        <SectionWrapper>
          <PricingCards />
        </SectionWrapper>

        {/* Compliance Add-ons */}
        <SectionWrapper dark>
          <SectionTitle
            overline="Add-ons"
            title="Compliance report add-ons"
            subtitle="Available on Starter plans and above. Add compliance reporting to any plan."
          />
          <FadeInUp>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 max-w-4xl mx-auto">
              {[
                { name: "ISO 27001", price: "$5/endpoint/mo", desc: "Gap analysis and audit-ready documentation" },
                { name: "SOC 2", price: "$5/endpoint/mo", desc: "Type II evidence and continuous monitoring" },
                { name: "Taiwan Cyber Security Act", price: "$3/endpoint/mo", desc: "Bilingual compliance reports (EN + zh-TW)" },
                { name: "Full Bundle", price: "$10/endpoint/mo", desc: "All frameworks included, save 30%" },
              ].map((addon) => (
                <div key={addon.name} className="bg-surface-2 rounded-xl border border-border p-5">
                  <p className="text-sm font-bold text-text-primary mb-1">{addon.name}</p>
                  <p className="text-brand-sage font-semibold text-lg mb-2">{addon.price}</p>
                  <p className="text-xs text-text-secondary">{addon.desc}</p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </SectionWrapper>

        {/* FAQ */}
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

        {/* Enterprise CTA */}
        <SectionWrapper dark>
          <FadeInUp>
            <div className="text-center max-w-2xl mx-auto">
              <EnterpriseIcon className="w-10 h-10 text-brand-sage mx-auto mb-6" />
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary leading-[1.1]">
                Need a custom solution?
              </h2>
              <p className="text-text-secondary mt-4 leading-relaxed">
                For organizations with 500+ endpoints, dedicated compliance
                requirements, or custom deployment needs. White-glove onboarding,
                custom SLA, and a dedicated security engineer.
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

        {/* Guarantee */}
        <section className="py-10 px-6 text-center border-b border-border">
          <FadeInUp>
            <div className="flex items-center justify-center gap-2">
              <ShieldIcon className="w-4 h-4 text-brand-sage" />
              <p className="text-sm text-text-tertiary">
                30-day money-back guarantee on all paid plans. No questions asked.
              </p>
            </div>
          </FadeInUp>
        </section>
      </main>
      <Footer />
    </>
  );
}
