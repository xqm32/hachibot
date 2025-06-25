import { z } from "zod/v4";

const Room = z.object({
  id: z.string(),
  players: z.array(
    z.object({
      name: z.string(),
    })
  ),
});

const Rooms = z.array(Room);

export default async () =>
  (
    await Promise.all(
      [
        "https://gi.xqm32.org/api/rooms",
        "https://gi.xqm32.org/beta/api/rooms",
      ].map(async (url) => await (await fetch(url)).json())
    )
  )
    .map((result) =>
      Rooms.parse(result).map(
        (room) =>
          `${room.id} 👉 ${room.players.map((p) => p.name).join(" 🆚 ")}`
      )
    )
    .with(0, ["=== Main Rooms ==="])
    .with(2, ["=== Beta Rooms ==="])
    .flat()
    .join("\n");
