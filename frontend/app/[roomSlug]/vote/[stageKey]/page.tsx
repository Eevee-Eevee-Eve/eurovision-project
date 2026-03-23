import { notFound } from "next/navigation";
import { RoomChrome } from "../../../../components/RoomChrome";
import { VoteStudio } from "../../../../components/VoteStudio";
import { isStageKey } from "../../../../lib/rooms";

export default function VoteStagePage({
  params,
}: {
  params: { roomSlug: string; stageKey: string };
}) {
  if (!isStageKey(params.stageKey)) {
    notFound();
  }

  return (
    <RoomChrome
      roomSlug={params.roomSlug}
      stageKey={params.stageKey}
      pageKey="vote"
    >
      <VoteStudio roomSlug={params.roomSlug} stageKey={params.stageKey} />
    </RoomChrome>
  );
}
