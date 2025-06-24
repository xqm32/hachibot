import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod/v4";
import { commands } from "./command";

const app = new Hono();

app.post("/", zValidator("form", z.object({ msg: z.string() })), async (c) => {
  const { msg } = c.req.valid("form");
  const result = commands.find((c) => msg.startsWith(c.name))?.execute(msg);
  if (result === undefined) {
    return c.text("Command not found", 404);
  } else if (result instanceof Promise) {
    return c.json(await result);
  } else {
    return c.text(result);
  }
});

export default app;
