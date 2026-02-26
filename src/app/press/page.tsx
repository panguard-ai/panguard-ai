import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import PressContent from "./PressContent";

export const metadata: Metadata = {
  title: "Press & Media | Panguard AI",
  description:
    "Press releases, media coverage, and brand assets for Panguard AI.",
};

export default function PressPage() {
  return (
    <>
      <NavBar />
      <main>
        <PressContent />
      </main>
      <Footer />
    </>
  );
}
