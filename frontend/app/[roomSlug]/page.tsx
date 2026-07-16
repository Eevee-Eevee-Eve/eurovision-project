import { RoomChrome } from "../../components/RoomChrome";
import { RoomLanding } from "../../components/RoomLanding";

export default async function RoomPage({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = await params;
  return (
    <RoomChrome
      roomSlug={roomSlug}
      pageKey="room"
    >
      <RoomLanding roomSlug={roomSlug} />
    </RoomChrome>
  );
}
