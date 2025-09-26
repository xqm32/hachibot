import { zValidator } from "@hono/zod-validator";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, ModelMessage } from "ai";
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
    const { msg, ref } = c.req.valid("form");

    if (msg.startsWith("r")) {
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

    if (msg.startsWith("model set default")) {
      const model = msg.match(/^model set default\s*([^\s]+)/)?.[1];
      if (!model) return c.text("error: model not specified");
      await c.env.HACHIBOT.put("defaultModel", model);
      return c.text(`defaultModel set to ${model}`);
    }

    if (msg.startsWith("model get default")) {
      const defaultModel = await c.env.HACHIBOT.get("defaultModel");
      if (!defaultModel) return c.text("error: defaultModel not set");
      return c.text(`defaultModel is ${defaultModel}`);
    }

    if (msg.startsWith("at")) {
      const match = msg.match(/^at\s+([^\s]+)\s+(.*)/s);
      if (!match) return c.text("error: invalid at command");
      const [, at, prompt] = match;
      await c.env.HACHIBOT.put(`@${at}`, prompt);
      return c.text(`@${at} set to ${prompt}`);
    }

    const openrouter = createOpenRouter({ apiKey: c.env.OPENROUTER_API_KEY });
    if (msg.startsWith("/")) {
      const match = msg.match(/^\/([^\s]+)(.*)/s);
      if (!match) return c.text("error: model not specified after /");
      const [, specifiedModel, restMsg] = match;
      const model = openrouter(specifiedModel);

      const messages: ModelMessage[] = [{ role: "user", content: restMsg }];
      if (ref) messages.unshift({ role: "user", content: ref });

      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    const defaultModel = await c.env.HACHIBOT.get("defaultModel");
    if (!defaultModel) return c.text("error: defaultModel not set");
    const model = openrouter(defaultModel);

    if (msg.startsWith("@")) {
      const match = msg.match(/^(@[^\s]+)\s+(.*)/s);
      if (!match) return c.text("error: invalid @ command");
      const [, at, restMsg] = match;

      const prompt = await c.env.HACHIBOT.get(at);
      if (!prompt) return c.text(`error: no prompt found for ${at}`);

      const messages: ModelMessage[] = [{ role: "system", content: prompt }];
      if (ref) messages.push({ role: "user", content: ref });
      messages.push({ role: "user", content: restMsg });

      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    const messages: ModelMessage[] = [{ role: "user", content: msg }];
    if (ref) messages.unshift({ role: "user", content: ref });

    const { text } = await generateText({ model, messages });
    return c.text(text);
  }
);

export default app;
