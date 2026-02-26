import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import CustomersContent from "./CustomersContent";

export const metadata: Metadata = {
  title: "Customer Stories | Panguard AI",
  description:
    "See how companies use Panguard AI to protect their infrastructure and achieve compliance.",
};

export default function CustomersPage() {
  return (
    <>
      <NavBar />
      <main>
        <CustomersContent />
      </main>
      <Footer />
    </>
  );
}
