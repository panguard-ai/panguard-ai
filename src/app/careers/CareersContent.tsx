"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import {
  GlobalIcon,
  DeployIcon,
  ShieldIcon,
  AnalyticsIcon,
  CheckIcon,
} from "@/components/ui/BrandIcons";
import {
  departments,
  jobListings,
  type JobListing,
} from "@/data/job-listings";

/* ─── Culture Values ─── */

const cultureValues = [
  {
    icon: GlobalIcon,
    title: "Remote-First",
    description:
      "Work from anywhere. We're distributed across Asia-Pacific and beyond.",
  },
  {
    icon: DeployIcon,
    title: "Ship Fast",
    description:
      "Weekly releases, rapid iteration, real impact from day one.",
  },
  {
    icon: ShieldIcon,
    title: "Security Obsessed",
    description:
      "We practice what we preach. Security is in our DNA.",
  },
  {
    icon: AnalyticsIcon,
    title: "Learn Together",
    description:
      "Weekly knowledge shares, conference budget, continuous growth.",
  },
];

/* ─── Benefits ─── */

const benefits = [
  "Competitive equity package",
  "Flexible remote work",
  "Health insurance",
  "Annual learning budget ($2,000)",
  "Conference attendance",
  "Latest equipment provided",
  "Unlimited PTO",
  "Team retreats (2x/year)",
];

/* ─── Job Card ─── */

function JobCard({ job }: { job: JobListing }) {
  return (
    <Link
      href={`/careers/${job.id}`}
      className="bg-surface-1 border border-border rounded-xl p-5 hover:border-brand-sage/40 transition-all flex items-center justify-between group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <h3 className="text-sm font-semibold text-text-primary">
          {job.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-brand-sage/10 text-brand-sage">
            {job.department}
          </span>
          <span className="text-xs text-text-tertiary">{job.location}</span>
          <span className="text-xs text-text-muted">{job.type}</span>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand-sage transition-colors shrink-0 ml-4" />
    </Link>
  );
}

/* ════════════════════════  Main Component  ═══════════════════════ */

export default function CareersContent() {
  const [activeDept, setActiveDept] = useState("All");

  const filteredJobs =
    activeDept === "All"
      ? jobListings
      : jobListings.filter((j) => j.department === activeDept);

  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper spacing="spacious">
        <SectionTitle
          overline="CAREERS"
          title="Build the Future of Cybersecurity"
          subtitle="We're a mission-driven, remote-first team making enterprise-grade security accessible to every developer and business on the planet. Come build with us."
          serif
        />
      </SectionWrapper>

      {/* ── Mission Statement ── */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-lg sm:text-xl text-text-secondary leading-relaxed">
              We believe every team deserves enterprise-grade security. We&apos;re
              building AI that makes it possible. If you want to protect the
              people nobody else is protecting, this is the place.
            </p>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ── Culture Values ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Culture"
          title="How we work."
          subtitle="Four principles that shape everything we do."
        />
        <div className="grid sm:grid-cols-2 gap-6 mt-14">
          {cultureValues.map((v, i) => (
            <FadeInUp key={v.title} delay={i * 0.08}>
              <div className="bg-surface-1 border border-border rounded-2xl p-6 card-glow h-full">
                <v.icon className="w-6 h-6 text-brand-sage mb-4" />
                <p className="text-sm font-bold text-text-primary mb-2">
                  {v.title}
                </p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {v.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Benefits ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Benefits"
          title="What you get."
          subtitle="We take care of the team so the team can take care of the mission."
        />
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-4 mt-14 max-w-2xl mx-auto">
          {benefits.map((b, i) => (
            <FadeInUp key={b} delay={i * 0.04}>
              <div className="flex items-center gap-3">
                <CheckIcon className="w-4 h-4 text-brand-sage shrink-0" />
                <span className="text-sm text-text-secondary">{b}</span>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Open Positions ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Open Positions"
          title="Join the team."
          subtitle={`${jobListings.length} roles open across ${departments.length - 1} departments. All positions are remote-friendly.`}
        />

        {/* Department filter tabs */}
        <FadeInUp>
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setActiveDept(dept)}
                className={`text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
                  activeDept === dept
                    ? "bg-brand-sage text-surface-0"
                    : "bg-surface-1 border border-border text-text-secondary hover:border-brand-sage/40 hover:text-text-primary"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </FadeInUp>

        {/* Job listings */}
        <div className="mt-8 space-y-3 max-w-3xl mx-auto">
          {filteredJobs.map((job, i) => (
            <FadeInUp key={job.id} delay={i * 0.05}>
              <JobCard job={job} />
            </FadeInUp>
          ))}
          {filteredJobs.length === 0 && (
            <FadeInUp>
              <p className="text-center text-text-tertiary text-sm py-8">
                No open positions in this department right now. Check back soon
                or send us your resume below.
              </p>
            </FadeInUp>
          )}
        </div>
      </SectionWrapper>

      {/* ── Apply CTA ── */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary leading-[1.1]">
              Don&apos;t see your role?
            </h2>
            <p className="text-text-secondary mt-4 leading-relaxed">
              We&apos;re always looking for talented people who are passionate about
              security and AI. Send your resume and a note about what excites you
              to{" "}
              <a
                href="mailto:careers@panguard.ai"
                className="text-brand-sage hover:underline"
              >
                careers@panguard.ai
              </a>{" "}
              and we&apos;ll be in touch.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Get in Touch <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:careers@panguard.ai"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3 transition-all duration-200"
              >
                Email Us Directly
              </a>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}
