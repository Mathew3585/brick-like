import { HomeView } from '@/components/home/HomeView';
import { LockedView } from '@/components/home/LockedView';
import { SummaryView } from '@/components/home/SummaryView';
import { active, lastSummary } from '@/lib/data';
import { useStore } from '@/lib/store';

/** Free (paper) → locked (ink) → summary (paper) → free. */
export default function Home() {
  const session = useStore(active);
  const summary = useStore(lastSummary);
  if (session) return <LockedView />;
  if (summary) return <SummaryView />;
  return <HomeView />;
}
