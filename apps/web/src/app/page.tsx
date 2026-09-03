import { Hero } from '@/components/layout/hero';
import { Features } from '@/components/layout/features';
import { SearchCTA } from '@/components/layout/search-cta';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Features />
      <SearchCTA />
    </main>
  );
}
