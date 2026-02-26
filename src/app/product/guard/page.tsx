import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductGuardContent from "./ProductGuardContent";

export const metadata: Metadata = {
  title: "Panguard Guard",
};

export default function ProductGuardPage() {
  return (
    <>
      <NavBar />
      <main>
        <ProductGuardContent />
      </main>
      <Footer />
    </>
  );
}
