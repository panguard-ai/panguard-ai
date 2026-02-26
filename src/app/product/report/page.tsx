import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductReportContent from "./ProductReportContent";

export const metadata: Metadata = {
  title: "Panguard Report",
};

export default function ProductReportPage() {
  return (
    <>
      <NavBar />
      <main>
        <ProductReportContent />
      </main>
      <Footer />
    </>
  );
}
