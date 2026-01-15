import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { NavigationCards } from '@/components/home/NavigationCards';
import { DiseaseAreaSection } from '@/components/home/DiseaseAreaSection';
import { InterventionSection } from '@/components/home/InterventionSection';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <NavigationCards />
      <DiseaseAreaSection />
      <InterventionSection />
    </Layout>
  );
};

export default Index;