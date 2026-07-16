import { notFound } from "next/navigation";
import { PlayersBoard } from "../../../../components/PlayersBoard";
import { RoomChrome } from "../../../../components/RoomChrome";
import { isBoardKey, isStageKey } from "../../../../lib/rooms";

export default async function PlayersBoardPage({
  params,
}: {
  params: Promise<{ roomSlug: string; boardKey: string }>;
}) {
  const { roomSlug, boardKey } = await params;
  if (!isBoardKey(boardKey)) {
    notFound();
  }

  return (
    <RoomChrome
      roomSlug={roomSlug}
      stageKey={isStageKey(boardKey) ? boardKey : undefined}
      pageKey="players"
    >
      <PlayersBoard roomSlug={roomSlug} boardKey={boardKey} />
    </RoomChrome>
  );
}
