import { notFound, redirect } from "next/navigation";
import { isStageKey } from "../../../../lib/rooms";

export default async function ActsStagePage({
  params,
}: {
  params: Promise<{ roomSlug: string; stageKey: string }>;
}) {
  const { roomSlug, stageKey } = await params;
  if (!isStageKey(stageKey)) {
    notFound();
  }

  redirect(`/${roomSlug}/vote/${stageKey}`);
}
