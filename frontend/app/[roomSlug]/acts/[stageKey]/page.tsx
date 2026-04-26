import { notFound, redirect } from "next/navigation";
import { isStageKey } from "../../../../lib/rooms";

export default function ActsStagePage({
  params,
}: {
  params: { roomSlug: string; stageKey: string };
}) {
  if (!isStageKey(params.stageKey)) {
    notFound();
  }

  redirect(`/${params.roomSlug}/vote/${params.stageKey}`);
}
