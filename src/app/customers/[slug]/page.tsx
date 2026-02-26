import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import CaseStudyContent from "./CaseStudyContent";
import { caseStudies } from "@/data/case-studies";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return caseStudies.map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cs = caseStudies.find((c) => c.slug === slug);

  if (!cs) {
    return { title: "Case Study Not Found | Panguard AI" };
  }

  return {
    title: `${cs.company} - ${cs.headline} | Panguard AI`,
    description: cs.excerpt,
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const cs = caseStudies.find((c) => c.slug === slug);

  if (!cs) {
    notFound();
  }

  return (
    <>
      <NavBar />
      <main>
        <CaseStudyContent study={cs} />
      </main>
      <Footer />
    </>
  );
}
