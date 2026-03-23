import { notFound } from "next/navigation";
import { LiveStageBoard } from "../../../../components/LiveStageBoard";
import { RoomChrome } from "../../../../components/RoomChrome";
import { isStageKey } from "../../../../lib/rooms";

export default function LiveStagePage({
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
      pageKey="live"
    >
      <LiveStageBoard roomSlug={params.roomSlug} stageKey={params.stageKey} />
    </RoomChrome>
  );
}
