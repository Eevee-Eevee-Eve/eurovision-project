import { notFound } from "next/navigation";
import { PlayersBoard } from "../../../../components/PlayersBoard";
import { RoomChrome } from "../../../../components/RoomChrome";
import { isBoardKey, isStageKey } from "../../../../lib/rooms";

export default function PlayersBoardPage({
  params,
}: {
  params: { roomSlug: string; boardKey: string };
}) {
  if (!isBoardKey(params.boardKey)) {
    notFound();
  }

  return (
    <RoomChrome
      roomSlug={params.roomSlug}
      stageKey={isStageKey(params.boardKey) ? params.boardKey : undefined}
      pageKey="players"
    >
      <PlayersBoard roomSlug={params.roomSlug} boardKey={params.boardKey} />
    </RoomChrome>
  );
}
