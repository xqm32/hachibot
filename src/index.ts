import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.post(
  "/",
  zValidator(
    "form",
    z.object({
      msg: z.string(),
      ref: z.string().optional(),
    })
  ),
  async (c) => {
    const urls = [
      "===== Main =====",
      "https://gi.xqm32.org/api/rooms",
      "===== Beta =====",
      "https://gi.xqm32.org/beta/api/rooms",
    ];
    const invokations = await Promise.all(
      urls.map(async (url) => {
        if (url.startsWith("=====")) return url;
        const response = await fetch(url);
        const rooms = (await response.json()) as {
          id: number;
          players: { name: string }[];
        }[];
        return rooms
          .map((room) => {
            const { id, players } = room;
            const sides = players.map((player) => player.name).join(" 🆚 ");
            return `${id} 👉 ${sides}`;
          })
          .join("\n");
      })
    );
    return c.text(invokations.join("\n"));
  }
);

export default app;
