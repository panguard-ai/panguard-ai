"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import FadeInUp from "@/components/FadeInUp";

const faqs = [
  {
    q: "How does the 30-day free trial work?",
    a: "When you sign up for any plan, you get full access to all features in that tier for 30 days -- no credit card required. At the end of the trial, you can choose to subscribe or your account will automatically downgrade to the free Scan-only tier. No data is lost.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Absolutely. You can upgrade or downgrade your plan at any point. When upgrading, you get immediate access to the new features and we prorate the difference. When downgrading, the change takes effect at the start of your next billing cycle.",
  },
  {
    q: "What counts as an endpoint?",
    a: "An endpoint is any device or server running the Panguard agent. This includes workstations, laptops, cloud VMs, and bare-metal servers. Containers within a single host count as one endpoint. Deactivated agents do not count toward your limit.",
  },
  {
    q: "Do you offer annual billing discounts?",
    a: "Yes. Annual billing saves you 20% compared to monthly pricing. That brings Starter to $15/mo, Pro to $39/mo, and Business to $79/mo -- billed annually. Contact our sales team for multi-year agreements with additional discounts.",
  },
  {
    q: "Is there a free plan?",
    a: "Panguard Scan is always free. You can run unlimited security audits on your endpoints and receive a PDF report with every scan. When you are ready for 24/7 protection, automated responses, and AI-powered reporting, upgrade to a paid plan.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your data remains accessible in read-only mode for 30 days after cancellation. During that window, you can export all reports, logs, and configurations. After 30 days, data is securely deleted in accordance with our data retention policy and GDPR requirements.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-text-primary font-medium pr-4">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-text-tertiary shrink-0 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[400px] pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm text-text-secondary leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export default function FAQAccordion() {
  return (
    <FadeInUp>
      <div>
        {faqs.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>
    </FadeInUp>
  );
}
