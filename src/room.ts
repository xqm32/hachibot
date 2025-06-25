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
    .flatMap((rooms, i) =>
      [i === 0 ? "=== Main Rooms ===" : "=== Beta Rooms ==="].concat(
        Rooms.parse(rooms).map(
          (room) =>
            `${room.id} 👉 ${room.players.map((p) => p.name).join(" 🆚 ")}`
        )
      )
    )
    .join("\n");
