import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ScanContent from "./ScanContent";

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata" });
  return {
    title: t("scan.title"),
    description: t("scan.description"),
  };
}

export default function ScanPage() {
  return (
    <>
      <NavBar />
      <main>
        <ScanContent />
      </main>
      <Footer />
    </>
  );
}
