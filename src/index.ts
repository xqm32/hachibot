import { zValidator } from "@hono/zod-validator";
import { request } from "@octokit/request";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createClient } from "@supabase/supabase-js";
import { generateText, ModelMessage } from "ai";
import { Hono } from "hono";
import z from "zod";
import { Database } from "../database.types";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.post(
  "/",
  zValidator(
    "form",
    z.object({
      qq: z.string(),
      msg: z.string(),
      ref: z.string().optional(),
      image: z.string().optional(),
    })
  ),
  async (c) => {
    const supabase = createClient<Database>(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_KEY
    );

    const { qq, msg, ref, image } = c.req.valid("form");

    if (msg === "r" || msg === "rooms") {
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

    if (msg === "gy" || msg === "guyu") {
      const response = await request("GET /repos/{owner}/{repo}/pulls", {
        owner: "genius-invokation",
        repo: "genius-invokation",
        state: "all",
        sort: "updated",
        direction: "desc",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      const [pull] = response.data;
      if (!pull) return c.text("no pull requests found");
      return c.text(`${pull.title}\n${pull.html_url}`);
    }

    if (msg === "who am i") return c.text(`you are ${qq}`);

    if (msg === "credits") {
      const response = await fetch("https://openrouter.ai/api/v1/credits", {
        headers: { Authorization: `Bearer ${c.env.OPENROUTER_API_KEY}` },
      });
      const text = await response.text();
      return c.text(text);
    }

    if (msg.startsWith("list models") && msg.length < 64) {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      const { data: models } = (await response.json()) as {
        data: { id: string }[];
      };

      const keyword = msg.match(/^list models like\s+([^\s]+)/)?.[1];
      if (!keyword) return c.text(models.map((model) => model.id).join("\n"));
      const filteredModels = models
        .map((model) => model.id)
        .filter((id) => id.includes(keyword));
      return c.text(filteredModels.join("\n"));
    }

    if (msg.startsWith("set")) {
      const match = msg.match(/^set\s+(\S+)\s+(.*)/s);
      if (!match) throw new Error("invalid set command");
      const [, key, value] = match;
      await c.env.HACHIBOT.put(key, value);
      return c.text(`${key}: ${value}`);
    }

    if (msg.startsWith("get")) {
      const key = msg.match(/^get\s+(\S+)/s)?.[1];
      if (!key) throw new Error("invalid get command");
      const value = await c.env.HACHIBOT.get(key);
      return c.text(`${value}`);
    }

    if (msg === "stores") {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("qq", qq);
      if (error) throw error;
      if (!data) return c.text("no stores found");
      return c.text(
        data.map((store) => `${store.id}: ${store.value}`).join("\n")
      );
    }

    const openrouter = createOpenRouter({ apiKey: c.env.OPENROUTER_API_KEY });
    const [modelName, realMsg] = await (async () => {
      const match = msg.match(/^\/([^\s]+)\s*(.*)/s);
      if (!match || match[1] === "/") {
        const defaultModelName = await c.env.HACHIBOT.get("/default");
        if (!defaultModelName) throw new Error("default model not set");
        return [defaultModelName, msg];
      } else if (!match[1].includes("/")) {
        const [, shortcut, realMsg] = match;
        const shortcutModelName = await c.env.HACHIBOT.get(`/${shortcut}`);
        if (!shortcutModelName)
          throw new Error(`no model found for /${shortcut}`);
        return [shortcutModelName, realMsg];
      }
      const [, specifiedModelName, realMsg] = match;
      return [specifiedModelName, realMsg];
    })();
    const model = openrouter(modelName);

    if (realMsg.startsWith("image")) {
      if (!image) throw new Error("image prompt is empty");
      const imageUrl = URL.parse(image);
      if (!imageUrl) throw new Error("invalid image url");
      const prompt = realMsg.match(/^image\s*(.*)/s)?.[1];
      if (!prompt) throw new Error("image prompt is empty");
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: [
            { type: "image", image: imageUrl },
            { type: "text", text: prompt },
          ],
        },
      ];
      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    if (realMsg.startsWith("help")) {
      const prompt = await c.env.HACHIBOT.get("#help");
      if (!prompt) throw new Error("no prompt found for #help");

      const { data } = (await request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          mediaType: { format: "raw" },
          owner: "xqm32",
          repo: "hachibot",
          path: "src/index.ts",
          headers: {
            authorization: `Bearer ${c.env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      )) as unknown as { data: string };
      const messages: ModelMessage[] = [
        { role: "system", content: prompt },
        { role: "user", content: data },
      ];

      const restMsg = realMsg.match(/^help\s*(.*)/s)?.[1];
      if (restMsg) messages.push({ role: "user", content: restMsg });

      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    if (realMsg === "hacker news") {
      const prompt = await c.env.HACHIBOT.get("#hackernews");
      if (!prompt) throw new Error("no prompt found for #hackernews");

      const response = await fetch("https://news.ycombinator.com/");
      const content = await response.text();

      const messages: ModelMessage[] = [{ role: "user", content }];
      messages.unshift({ role: "system", content: prompt });

      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    if (realMsg.startsWith("tldr")) {
      const url = realMsg.match(/^tldr\s+([^\s]+)/)?.[1];
      if (!url) throw new Error("url not specified");

      const prompt = await c.env.HACHIBOT.get("#tldr");
      if (!prompt) throw new Error("no prompt found for #tldr");

      const response = await fetch(url);
      const content = await response.text();

      const messages: ModelMessage[] = [
        { role: "system", content: prompt },
        { role: "user", content },
      ];
      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    if (realMsg.startsWith("#")) {
      const match = realMsg.match(/^(#[^\s]+)\s*(.*)/s);
      if (!match) throw new Error("invalid # command");
      const [, tag, restMsg] = match;

      const prompt = await c.env.HACHIBOT.get(tag);
      if (!prompt) throw new Error(`no prompt found for ${tag}`);

      const messages: ModelMessage[] = [{ role: "system", content: prompt }];
      if (ref) messages.push({ role: "user", content: ref });
      messages.push({ role: "user", content: restMsg });

      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    if (realMsg.length === 0 && !ref) return c.text(`using model ${modelName}`);

    const messages: ModelMessage[] = [{ role: "user", content: realMsg }];
    if (ref) messages.unshift({ role: "user", content: ref });

    const { text } = await generateText({ model, messages });
    return c.text(text);
  }
);

app.post("/api/v1/chat/completions", (c) =>
  fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: c.req.raw.body,
  })
);

app.onError((err, c) => {
  return c.text(`${err}`, 500);
});

export default app;
