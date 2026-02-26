import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductScanContent from "./ProductScanContent";

export const metadata: Metadata = {
  title: "Panguard Scan",
};

export default function ProductScanPage() {
  return (
    <>
      <NavBar />
      <main>
        <ProductScanContent />
      </main>
      <Footer />
    </>
  );
}
