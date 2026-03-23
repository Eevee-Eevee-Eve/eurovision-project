import { notFound } from "next/navigation";
import { ActsDirectory } from "../../../../components/ActsDirectory";
import { RoomChrome } from "../../../../components/RoomChrome";
import { isStageKey } from "../../../../lib/rooms";

export default function ActsStagePage({
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
      pageKey="acts"
    >
      <ActsDirectory roomSlug={params.roomSlug} stageKey={params.stageKey} />
    </RoomChrome>
  );
}
