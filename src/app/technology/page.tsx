import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import TechnologyContent from "./TechnologyContent";

export const metadata: Metadata = {
  title: "Technology",
};

export default function TechnologyPage() {
  return (
    <>
      <NavBar />
      <main>
        <TechnologyContent />
      </main>
      <Footer />
    </>
  );
}
