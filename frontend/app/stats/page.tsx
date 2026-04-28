import { GlobalStatsHub } from "../../components/GlobalStatsHub";
import { SiteHeader } from "../../components/SiteHeader";

export default function StatsPage() {
  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-4 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-[96rem] gap-5">
        <SiteHeader />
        <GlobalStatsHub />
      </div>
    </main>
  );
}
