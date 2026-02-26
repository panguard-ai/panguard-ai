import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, User, Calendar } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import { blogPosts } from "@/data/blog-posts";
import { notFound } from "next/navigation";

/* ─── Static Params ─── */

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

/* ─── Metadata ─── */

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) {
    return { title: "Post Not Found | Panguard AI" };
  }
  return {
    title: `${post.title} | Panguard AI Blog`,
    description: post.excerpt,
  };
}

/* ─── Helper ─── */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ════════════════════════  Page Component  ═══════════════════════ */

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = blogPosts.find((p) => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <NavBar />
      <main>
        {/* ───────────── Back Link ───────────── */}
        <section className="pt-24 pb-0 px-6">
          <div className="max-w-[800px] mx-auto">
            <FadeInUp>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-brand-sage transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
            </FadeInUp>
          </div>
        </section>

        {/* ───────────── Post Header ───────────── */}
        <SectionWrapper spacing="default">
          <div className="max-w-[800px] mx-auto">
            <FadeInUp>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-brand-sage/10 text-brand-sage">
                {post.category}
              </span>
            </FadeInUp>

            <FadeInUp delay={0.05}>
              <h1 className="text-[clamp(32px,4vw,48px)] font-bold text-text-primary leading-[1.1] mt-5">
                {post.title}
              </h1>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <div className="flex flex-wrap items-center gap-5 mt-6 text-sm text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.readingTime} read
                </span>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.15}>
              <div className="border-t border-border mt-8 pt-8">
                <p className="text-lg text-text-secondary leading-relaxed">
                  {post.excerpt}
                </p>
              </div>
            </FadeInUp>

            {/* ───────────── Coming Soon Notice ───────────── */}
            <FadeInUp delay={0.2}>
              <div className="mt-12 bg-surface-1 rounded-2xl border border-border p-8 text-center">
                <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-3">
                  Coming Soon
                </p>
                <h2 className="text-xl font-bold text-text-primary">
                  Full article in progress
                </h2>
                <p className="text-sm text-text-secondary mt-3 max-w-md mx-auto leading-relaxed">
                  This article is currently being finalized by the Panguard AI
                  team. Subscribe to our newsletter to be notified when it
                  publishes.
                </p>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-6 py-3 mt-6 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Browse All Posts
                </Link>
              </div>
            </FadeInUp>
          </div>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  );
}
