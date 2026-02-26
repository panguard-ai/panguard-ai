import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ChangelogContent from "./ChangelogContent";

export const metadata: Metadata = {
  title: "Changelog | Panguard AI",
  description:
    "Track every update, improvement, and fix in Panguard AI. We ship fast and transparently.",
};

export default function ChangelogPage() {
  return (
    <>
      <NavBar />
      <main>
        <ChangelogContent />
      </main>
      <Footer />
    </>
  );
}
