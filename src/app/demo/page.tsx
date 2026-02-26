import type { Metadata } from "next";
import { MonitorIcon, HistoryIcon } from "@/components/ui/BrandIcons";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import DemoRequestForm from "./DemoRequestForm";

export const metadata: Metadata = {
  title: "Request Demo",
  description:
    "See Panguard AI in action. Request a personalized demo with our security team or explore the self-guided product tour.",
};

/* ════════════════════════  Page Component  ═══════════════════════ */

export default function DemoPage() {
  return (
    <>
      <NavBar />
      <main>
        {/* ───────────── Hero ───────────── */}
        <section className="pt-24 pb-4 px-6 text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              Demo
            </p>
            <h1 className="text-[clamp(40px,5vw,64px)] font-bold text-text-primary leading-[1.08] max-w-3xl mx-auto">
              See Panguard in action.
            </h1>
            <p className="text-text-secondary mt-4 text-lg max-w-xl mx-auto leading-relaxed">
              Choose a self-guided tour or schedule a personalized walkthrough
              with our security team. Either way, you will see how Panguard
              protects your endpoints from day one.
            </p>
          </FadeInUp>
        </section>

        {/* ───────────── Two Options ───────────── */}
        <SectionWrapper>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Self-Guided Demo */}
            <FadeInUp>
              <div className="bg-surface-1 rounded-2xl border border-border p-8 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-5">
                  <MonitorIcon className="w-5 h-5 text-brand-sage" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">
                  Self-Guided Demo
                </h2>
                <p className="text-text-secondary text-sm mt-2 leading-relaxed flex-1">
                  Explore the Panguard platform at your own pace. Walk through a
                  simulated environment with real threat scenarios, see how the
                  AI detection engine responds, and review sample reports -- all
                  without scheduling a call.
                </p>
                <div className="mt-6 p-4 rounded-xl bg-surface-2 border border-border text-center">
                  <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-1">
                    Coming Soon
                  </p>
                  <p className="text-sm text-text-tertiary">
                    The interactive product tour is under development. Join the
                    waitlist to be notified when it launches.
                  </p>
                </div>
                <button
                  disabled
                  className="mt-6 block w-full text-center font-semibold rounded-full px-6 py-3 border border-border text-text-muted cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </FadeInUp>

            {/* Request a Demo */}
            <FadeInUp delay={0.08}>
              <div className="bg-surface-1 rounded-2xl border border-brand-sage p-8 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-5">
                  <HistoryIcon className="w-5 h-5 text-brand-sage" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">
                  Request a Demo
                </h2>
                <p className="text-text-secondary text-sm mt-2 mb-6 leading-relaxed">
                  Schedule a 30-minute walkthrough with our team. We will tailor
                  the demo to your infrastructure, show relevant threat
                  scenarios, and answer every question.
                </p>
                <DemoRequestForm />
              </div>
            </FadeInUp>
          </div>
        </SectionWrapper>

        {/* ───────────── What to Expect ───────────── */}
        <SectionWrapper dark>
          <FadeInUp>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-[clamp(24px,3vw,32px)] font-bold text-text-primary leading-[1.1]">
                What to expect in your demo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 text-left">
                {[
                  {
                    step: "01",
                    title: "Discovery",
                    desc: "We learn about your infrastructure, team size, and current security stack so the demo is relevant to you.",
                  },
                  {
                    step: "02",
                    title: "Live Walkthrough",
                    desc: "See Panguard Scan, Guard, Chat, Trap, and Report in action against simulated real-world threats on a live environment.",
                  },
                  {
                    step: "03",
                    title: "Q&A & Next Steps",
                    desc: "Ask anything. We will discuss pricing, deployment options, and a timeline to get Panguard running on your endpoints.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="bg-surface-0 rounded-2xl border border-border p-6"
                  >
                    <p className="text-xs font-mono text-brand-sage mb-3">
                      {item.step}
                    </p>
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
      </main>
      <Footer />
    </>
  );
}
