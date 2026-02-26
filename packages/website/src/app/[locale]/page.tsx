import { useTranslations } from "next-intl";
import NavBar from "@/components/NavBar";
import Hero from "@/components/home/Hero";
import WhyPanguard from "@/components/home/WhyPanguard";
import ProductSuite from "@/components/home/ProductSuite";
import InstallDemo from "@/components/home/InstallDemo";
import Comparison from "@/components/home/Comparison";
import SocialProof from "@/components/home/SocialProof";
import Pricing from "@/components/home/Pricing";
import FinalCTA from "@/components/home/FinalCTA";
import Footer from "@/components/Footer";
import CLIShowcase from "@/components/ui/CLIShowcase";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";

export default function Home() {
  const t = useTranslations("home.cliShowcase");

  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <WhyPanguard />
        <ProductSuite />
        <SectionWrapper>
          <SectionTitle
            overline={t("overline")}
            title={t("title")}
            subtitle={t("subtitle")}
          />
          <div className="mt-14">
            <CLIShowcase />
          </div>
        </SectionWrapper>
        <InstallDemo />
        <Comparison />
        <SocialProof />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
