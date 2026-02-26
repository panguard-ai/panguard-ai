import NavBar from "@/components/NavBar";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import WhyPanguard from "@/components/home/WhyPanguard";
import ProductSuite from "@/components/home/ProductSuite";
import ProblemStatement from "@/components/home/ProblemStatement";
import InstallDemo from "@/components/home/InstallDemo";
import ChatPreview from "@/components/home/ChatPreview";
import HowItWorks from "@/components/home/HowItWorks";
import TechOverview from "@/components/home/TechOverview";
import Comparison from "@/components/home/Comparison";
import SecurityBadges from "@/components/home/SecurityBadges";
import SocialProof from "@/components/home/SocialProof";
import Pricing from "@/components/home/Pricing";
import FinalCTA from "@/components/home/FinalCTA";
import Footer from "@/components/Footer";
import DashboardMockup from "@/components/ui/DashboardMockup";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";

export default function Home() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <TrustBar />
        <WhyPanguard />
        <ProductSuite />
        <SectionWrapper>
          <SectionTitle
            overline="The Product"
            title="See Panguard in action."
            subtitle="A unified dashboard for threat detection, automated response, and compliance reporting."
          />
          <div className="mt-14">
            <DashboardMockup />
          </div>
        </SectionWrapper>
        <ProblemStatement />
        <InstallDemo />
        <ChatPreview />
        <HowItWorks />
        <TechOverview />
        <Comparison />
        <SecurityBadges />
        <SocialProof />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
