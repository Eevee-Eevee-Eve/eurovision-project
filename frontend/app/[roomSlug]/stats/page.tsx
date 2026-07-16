import { SeasonStatsBoard } from "../../../components/SeasonStatsBoard";
import { BrandLogo } from "../../../components/BrandLogo";

export default async function RoomStatsPage({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = await params;
  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <BrandLogo variant="header" />
        <SeasonStatsBoard roomSlug={roomSlug} />
      </div>
    </main>
  );
}
