import { notFound } from "next/navigation";
import { LiveStageBoard } from "../../../../components/LiveStageBoard";
import { RoomChrome } from "../../../../components/RoomChrome";
import { isStageKey } from "../../../../lib/rooms";

export default async function LiveStagePage({
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
      pageKey="live"
    >
      <LiveStageBoard roomSlug={roomSlug} stageKey={stageKey} />
    </RoomChrome>
  );
}
