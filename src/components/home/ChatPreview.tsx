"use client";
import { ShieldIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const messages = [
  {
    role: "ai",
    text: "Someone is brute-forcing your SSH. Origin: Berlin, Germany. 47 attempts, all failed. I\u2019ve blocked the IP.",
  },
  {
    role: "user",
    text: "Is this serious? Do I need to do anything?",
  },
  {
    role: "ai",
    text: "Not serious. This is a common automated attack. Your password was not compromised \u2014 SSH key auth is working correctly. No action needed.\n\nThis week\u2019s summary: 2,847 attack attempts blocked. You\u2019re safe.",
  },
];

const platforms = ["LINE", "Telegram", "Slack", "Discord", "Email", "Webhook"];

export default function ChatPreview() {
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline="AI Copilot"
        title="Your security guard speaks human."
        subtitle="Not a dashboard. Not alert codes. A conversation. Ask questions, get answers in the language you understand."
      />

      <div className="max-w-lg mx-auto mt-12">
        <FadeInUp>
          <div className="bg-surface-0 rounded-3xl border border-border shadow-2xl overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-full bg-brand-sage/20 flex items-center justify-center">
                <ShieldIcon size={16} className="text-brand-sage" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Panguard AI</p>
                <p className="text-xs text-status-safe flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-safe inline-block" />
                  Protecting &middot; 3 endpoints
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4">
              {messages.map((m, i) => (
                <FadeInUp key={i} delay={0.2 + i * 0.15}>
                  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        m.role === "ai"
                          ? "bg-surface-2 text-text-secondary rounded-2xl rounded-bl-sm"
                          : "bg-brand-sage/15 text-text-primary rounded-2xl rounded-br-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </FadeInUp>
              ))}
            </div>
          </div>
        </FadeInUp>

        {/* Platform badges */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {platforms.map((p) => (
            <span
              key={p}
              className="border border-border text-xs text-text-tertiary px-3 py-1 rounded-full"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
