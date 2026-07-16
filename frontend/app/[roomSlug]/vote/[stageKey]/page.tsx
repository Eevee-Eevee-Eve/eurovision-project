import { notFound } from "next/navigation";
import { RoomChrome } from "../../../../components/RoomChrome";
import { VoteStudio } from "../../../../components/VoteStudio";
import { isStageKey } from "../../../../lib/rooms";

export default async function VoteStagePage({
  params,
}: {
  params: Promise<{ roomSlug: string; stageKey: string }>;
}) {
  const { roomSlug, stageKey } = await params;
  if (!isStageKey(stageKey)) {
    notFound();
  }

  return (
    <RoomChrome
      roomSlug={roomSlug}
      stageKey={stageKey}
      pageKey="vote"
    >
      <VoteStudio roomSlug={roomSlug} stageKey={stageKey} />
    </RoomChrome>
  );
}
