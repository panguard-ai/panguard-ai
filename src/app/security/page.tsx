import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import SecurityContent from "./SecurityContent";

export const metadata: Metadata = {
  title: "Security & Trust",
};

export default function SecurityPage() {
  return (
    <>
      <NavBar />
      <main>
        <SecurityContent />
      </main>
      <Footer />
    </>
  );
}
