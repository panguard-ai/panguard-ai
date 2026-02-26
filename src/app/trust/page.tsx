import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import TrustContent from "./TrustContent";

export const metadata: Metadata = {
  title: "Trust Center | Panguard AI",
  description:
    "Compliance certifications, security architecture, data handling practices, and subprocessor information for Panguard AI.",
};

export default function TrustPage() {
  return (
    <>
      <NavBar />
      <main>
        <TrustContent />
      </main>
      <Footer />
    </>
  );
}
