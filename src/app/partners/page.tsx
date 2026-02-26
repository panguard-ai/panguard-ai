import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import PartnersContent from "./PartnersContent";

export const metadata: Metadata = {
  title: "Partners | Panguard AI",
  description:
    "Join the Panguard AI partner ecosystem. MSP, technology, and reseller partnership programs.",
};

export default function PartnersPage() {
  return (
    <>
      <NavBar />
      <main>
        <PartnersContent />
      </main>
      <Footer />
    </>
  );
}
