import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductTrapContent from "./ProductTrapContent";

export const metadata: Metadata = {
  title: "Panguard Trap",
};

export default function ProductTrapPage() {
  return (
    <>
      <NavBar />
      <main>
        <ProductTrapContent />
      </main>
      <Footer />
    </>
  );
}
