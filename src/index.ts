import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod/v4";
import { commands } from "./command";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.post(
  "/",
  zValidator("form", z.object({ msg: z.string(), ref: z.string().optional() })),
  async (c) => {
    const { msg, ref } = c.req.valid("form");
    const command = commands.find((command) => msg.startsWith(command.name));
    if (!command) {
      return c.text("Command not found", 404);
    }

    try {
      return c.text(
        await command.execute(
          { msg: msg.slice(command.name.length).trim(), ref: ref?.trim() },
          c
        )
      );
    } catch (error) {
      return c.text(
        `Error executing command: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500
      );
    }
  }
);

export default app;
