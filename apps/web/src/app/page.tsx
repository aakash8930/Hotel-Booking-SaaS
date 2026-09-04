import { Hero } from '@/components/layout/hero';
import { JourneyStory } from '@/components/layout/journey-story';
import { Features } from '@/components/layout/features';
import { ThreeShowcase } from '@/components/layout/three-showcase';
import { SearchCTA } from '@/components/layout/search-cta';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <JourneyStory />
      <Features />
      <ThreeShowcase />
      <SearchCTA />
    </main>
  );
}
