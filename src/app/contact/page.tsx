import type { Metadata } from "next";
import {
  AnalyticsIcon, SupportIcon, TeamIcon, GlobalIcon,
} from "@/components/ui/BrandIcons";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Panguard AI team. Sales inquiries, technical support, partnership opportunities, or press requests -- we are here to help.",
};

/* ────────────────────────  Channel Cards  ─────────────────────── */

const channels = [
  {
    icon: AnalyticsIcon,
    title: "Sales",
    email: "sales@panguard.ai",
    description:
      "Interested in Panguard for your team? Talk to our sales team about plans, volume discounts, and custom enterprise deployments.",
  },
  {
    icon: SupportIcon,
    title: "Support",
    email: "support@panguard.ai",
    description:
      "Need help with your Panguard deployment? Our support engineers respond within 4 hours for Pro and Business plans.",
  },
  {
    icon: TeamIcon,
    title: "Partnerships",
    email: "partners@panguard.ai",
    description:
      "MSPs, resellers, and technology partners -- let us explore how Panguard can integrate with your offerings.",
  },
  {
    icon: AnalyticsIcon,
    title: "Press",
    email: "press@panguard.ai",
    description:
      "Media inquiries, interview requests, and press kit access. We are happy to share our story.",
  },
];

/* ════════════════════════  Page Component  ═══════════════════════ */

export default function ContactPage() {
  return (
    <>
      <NavBar />
      <main>
        {/* ───────────── Hero ───────────── */}
        <section className="pt-24 pb-4 px-6 text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              Contact
            </p>
            <h1 className="text-[clamp(40px,5vw,64px)] font-bold text-text-primary leading-[1.08] max-w-3xl mx-auto">
              Let&apos;s talk.
            </h1>
            <p className="text-text-secondary mt-4 text-lg max-w-xl mx-auto leading-relaxed">
              Whether you have a question about our product, need technical
              support, or want to explore a partnership -- we would love to hear
              from you.
            </p>
          </FadeInUp>
        </section>

        {/* ───────────── Channel Cards ───────────── */}
        <SectionWrapper>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {channels.map((ch, i) => (
              <FadeInUp key={ch.title} delay={i * 0.06}>
                <div className="card-glow bg-surface-1 rounded-2xl border border-border p-6 h-full flex flex-col">
                  <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center mb-4">
                    <ch.icon className="w-4 h-4 text-brand-sage" />
                  </div>
                  <h3 className="text-text-primary font-semibold">
                    {ch.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-2 leading-relaxed flex-1">
                    {ch.description}
                  </p>
                  <a
                    href={`mailto:${ch.email}`}
                    className="text-sm text-brand-sage hover:text-brand-sage-light font-medium mt-4 transition-colors"
                  >
                    {ch.email}
                  </a>
                </div>
              </FadeInUp>
            ))}
          </div>
        </SectionWrapper>

        {/* ───────────── Contact Form + Location ───────────── */}
        <SectionWrapper dark>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-5xl mx-auto">
            {/* Form */}
            <div className="lg:col-span-3">
              <FadeInUp>
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  Send us a message
                </h2>
                <p className="text-text-secondary text-sm mb-8">
                  Fill out the form below and we will get back to you within one
                  business day.
                </p>
                <ContactForm />
              </FadeInUp>
            </div>

            {/* Location */}
            <div className="lg:col-span-2">
              <FadeInUp delay={0.1}>
                <div className="bg-surface-0 rounded-2xl border border-border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GlobalIcon className="w-4 h-4 text-brand-sage" />
                    <h3 className="text-text-primary font-semibold">
                      Our Location
                    </h3>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Panguard AI, Inc.
                    <br />
                    Taipei, Taiwan
                  </p>
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-3">
                      Office Hours
                    </p>
                    <p className="text-sm text-text-secondary">
                      Monday - Friday
                      <br />
                      9:00 AM - 6:00 PM (GMT+8)
                    </p>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-3">
                      Response Time
                    </p>
                    <p className="text-sm text-text-secondary">
                      General inquiries: within 1 business day
                      <br />
                      Support (Pro/Business): within 4 hours
                      <br />
                      Security incidents: within 1 hour
                    </p>
                  </div>
                </div>
              </FadeInUp>
            </div>
          </div>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  );
}
