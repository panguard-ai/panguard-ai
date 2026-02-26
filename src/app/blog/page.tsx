import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import BlogContent from "./BlogContent";

export const metadata: Metadata = {
  title: "Blog | Panguard AI",
  description:
    "Security insights, product updates, and engineering deep-dives from the Panguard AI team.",
};

export default function BlogPage() {
  return (
    <>
      <NavBar />
      <main>
        <BlogContent />
      </main>
      <Footer />
    </>
  );
}
