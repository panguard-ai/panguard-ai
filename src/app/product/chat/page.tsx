import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductChatContent from "./ProductChatContent";

export const metadata: Metadata = {
  title: "Panguard Chat",
};

export default function ProductChatPage() {
  return (
    <>
      <NavBar />
      <main>
        <ProductChatContent />
      </main>
      <Footer />
    </>
  );
}
