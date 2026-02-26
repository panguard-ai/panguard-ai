import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import StatusContent from "./StatusContent";

export const metadata: Metadata = {
  title: "System Status | Panguard AI",
  description:
    "Real-time system status and uptime history for all Panguard AI services.",
};

export default function StatusPage() {
  return (
    <>
      <NavBar />
      <main>
        <StatusContent />
      </main>
      <Footer />
    </>
  );
}
