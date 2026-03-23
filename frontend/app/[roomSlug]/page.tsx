import { RoomChrome } from "../../components/RoomChrome";
import { RoomLanding } from "../../components/RoomLanding";

export default function RoomPage({ params }: { params: { roomSlug: string } }) {
  return (
    <RoomChrome
      roomSlug={params.roomSlug}
      pageKey="room"
    >
      <RoomLanding roomSlug={params.roomSlug} />
    </RoomChrome>
  );
}
