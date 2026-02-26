import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import IntegrationsContent from "./IntegrationsContent";

export const metadata: Metadata = {
  title: "Integrations | Panguard AI",
  description:
    "Connect Panguard AI with your existing tools and workflows. Slack, Teams, Splunk, AWS, Jira, and more. No custom code required.",
};

export default function IntegrationsPage() {
  return (
    <>
      <NavBar />
      <main>
        <IntegrationsContent />
      </main>
      <Footer />
    </>
  );
}
