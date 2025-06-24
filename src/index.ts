import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod/v4";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.post("/", zValidator("form", z.object({ msg: z.string() })), async (c) => {
  const { msg } = c.req.valid("form");
  return c.text(msg);
});

export default app;
