import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ComplianceContent from "./ComplianceContent";

export const metadata: Metadata = {
  title: "Compliance Automation | ISO 27001, SOC 2, TCSA | Panguard AI",
  description:
    "Automated compliance reports for ISO 27001, SOC 2, and Taiwan Cyber Security Act. Bilingual output, audit-ready evidence, fraction of consultant cost.",
};

export default function CompliancePage() {
  return (
    <>
      <NavBar />
      <main>
        <ComplianceContent />
      </main>
      <Footer />
    </>
  );
}
