import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import DocsContent from "./DocsContent";

export const metadata: Metadata = {
  title: "Documentation | Panguard AI",
  description:
    "Get started with Panguard AI. Installation guides, API reference, and product documentation.",
};

export default function DocsPage() {
  return (
    <>
      <NavBar />
      <main>
        <DocsContent />
      </main>
      <Footer />
    </>
  );
}
