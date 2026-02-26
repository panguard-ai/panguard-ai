import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ResourcesContent from "./ResourcesContent";

export const metadata: Metadata = {
  title: "Resources | Panguard AI",
  description:
    "Whitepapers, reports, guides, and webinars on AI-powered cybersecurity for modern teams.",
};

export default function ResourcesPage() {
  return (
    <>
      <NavBar />
      <main>
        <ResourcesContent />
      </main>
      <Footer />
    </>
  );
}
