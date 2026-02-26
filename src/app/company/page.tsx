import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import CompanyContent from "./CompanyContent";

export const metadata: Metadata = {
  title: "About",
};

export default function CompanyPage() {
  return (
    <>
      <NavBar />
      <main>
        <CompanyContent />
      </main>
      <Footer />
    </>
  );
}
