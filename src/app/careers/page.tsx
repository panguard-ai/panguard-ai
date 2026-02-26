import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import CareersContent from "./CareersContent";

export const metadata: Metadata = {
  title: "Careers | Panguard AI",
  description:
    "Join Panguard AI and help democratize cybersecurity with AI. Remote-first, mission-driven.",
};

export default function CareersPage() {
  return (
    <>
      <NavBar />
      <main>
        <CareersContent />
      </main>
      <Footer />
    </>
  );
}
