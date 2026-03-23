import { SeasonStatsBoard } from "../../../components/SeasonStatsBoard";

export default function RoomStatsPage({ params }: { params: { roomSlug: string } }) {
  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-28 pt-6 text-arenaText md:px-8">
      <div className="mx-auto max-w-7xl">
        <SeasonStatsBoard roomSlug={params.roomSlug} />
      </div>
    </main>
  );
}
