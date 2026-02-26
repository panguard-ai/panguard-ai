import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ScanContent from "./ScanContent";

export const metadata: Metadata = {
  title: "Free Security Scan",
};

export default function ScanPage() {
  return (
    <>
      <NavBar />
      <main>
        <ScanContent />
      </main>
      <Footer />
    </>
  );
}
