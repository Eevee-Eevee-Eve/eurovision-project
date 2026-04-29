import { GlobalStatsHub } from "../../components/GlobalStatsHub";
import { SiteHeader } from "../../components/SiteHeader";

export const dynamic = "force-dynamic";

export default function StatsPage() {
  return (
    <main className="min-h-screen bg-arena-grid px-3 pb-28 pt-4 text-arenaText sm:px-4 md:px-8">
      <div className="stats-page-shell mx-auto grid w-full max-w-[96rem] min-w-0 gap-5">
        <SiteHeader />
        <GlobalStatsHub />
      </div>
    </main>
  );
}
