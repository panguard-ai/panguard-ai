import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import WaitlistForm from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Early Access",
  description:
    "Be the first to experience AI security that speaks human. Join the Panguard AI waitlist for priority access, founding member pricing, and a direct feedback channel.",
};

/* ════════════════════════  Page Component  ═══════════════════════ */

export default function EarlyAccessPage() {
  return (
    <>
      <NavBar />
      <main>
        {/* ───────────── Hero ───────────── */}
        <section className="pt-24 pb-4 px-6 text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              Early Access
            </p>
            <h1 className="text-[clamp(40px,5vw,64px)] font-bold text-text-primary leading-[1.08] max-w-3xl mx-auto">
              Be the first to experience
              <br />
              <span className="text-brand-sage">
                AI security that speaks human.
              </span>
            </h1>
            <p className="text-text-secondary mt-4 text-lg max-w-xl mx-auto leading-relaxed">
              Panguard AI is launching soon. Join the waitlist to get priority
              access, shape the product with direct feedback, and lock in
              founding member pricing.
            </p>
          </FadeInUp>
        </section>

        {/* ───────────── Form Section ───────────── */}
        <SectionWrapper>
          <WaitlistForm />
        </SectionWrapper>

        {/* ───────────── What You Get ───────────── */}
        <SectionWrapper dark>
          <FadeInUp>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary leading-[1.1] text-center">
                What early access members get
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                {[
                  {
                    title: "Priority Access",
                    desc: "Be among the first to install Panguard on your endpoints. Early access members onboard weeks before public launch.",
                  },
                  {
                    title: "Direct Feedback Channel",
                    desc: "Join our private Slack community. Speak directly with engineers. Your feedback shapes the features we build next.",
                  },
                  {
                    title: "Founding Member Pricing",
                    desc: "Lock in a permanent discount on any plan. Founding members keep their rate for life, even as prices increase.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-surface-0 rounded-2xl border border-border p-6"
                  >
                    <div className="w-2 h-2 rounded-full bg-brand-sage mb-4" />
                    <h3 className="text-text-primary font-semibold mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </SectionWrapper>

        {/* ───────────── Timeline ───────────── */}
        <SectionWrapper>
          <FadeInUp>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-[clamp(24px,3vw,32px)] font-bold text-text-primary leading-[1.1]">
                Launch timeline
              </h2>
              <div className="mt-10 space-y-0">
                {[
                  { phase: "Now", label: "Waitlist open -- join today" },
                  {
                    phase: "Q2 2026",
                    label: "Private beta for early access members",
                  },
                  { phase: "Q3 2026", label: "Public launch" },
                ].map((step, i) => (
                  <div key={step.phase} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          i === 0
                            ? "bg-brand-sage"
                            : "bg-surface-2 border border-border"
                        }`}
                      />
                      {i < 2 && (
                        <div className="w-px h-10 bg-border" />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className="text-xs uppercase tracking-wider text-brand-sage font-semibold">
                        {step.phase}
                      </p>
                      <p className="text-text-secondary text-sm mt-1">
                        {step.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  );
}
