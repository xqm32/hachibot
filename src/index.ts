import { zValidator } from "@hono/zod-validator";
import { request } from "@octokit/request";
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
      qq: z.string(),
      msg: z.string(),
      ref: z.string().optional(),
    })
  ),
  async (c) => {
    const { qq, msg, ref } = c.req.valid("form");

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

    if (msg.startsWith("set default model to") && msg.length < 64) {
      const model = msg.match(/^set default model to\s+([^\s]+)/)?.[1];
      if (!model) return c.text("error: model not specified");
      await c.env.HACHIBOT.put("defaultModel", model);
      return c.text(`defaultModel set to ${model}`);
    }

    if (msg === "get default model") {
      const defaultModel = await c.env.HACHIBOT.get("defaultModel");
      if (!defaultModel) return c.text("error: defaultModel not set");
      return c.text(`defaultModel is ${defaultModel}`);
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

    if (msg.startsWith(">#")) {
      const match = msg.match(/^>(#[^\s]+)\s*(.*)/s);
      if (!match) return c.text("error: invalid ># command");
      const [, tag, restMsg] = match;
      const prompt = restMsg.length > 0 ? restMsg : ref;
      if (!prompt) return c.text("error: prompt is empty");
      await c.env.HACHIBOT.put(tag, prompt);
      return c.text(`${tag} set to ${prompt}`);
    }

    if (msg.startsWith("<#")) {
      const tag = msg.match(/^<(#[^\s]+)/s)?.[1];
      if (!tag) return c.text("error: invalid <# command");
      const prompt = await c.env.HACHIBOT.get(tag);
      if (!prompt) return c.text(`error: no prompt found for ${tag}`);
      return c.text(prompt);
    }

    const openrouter = createOpenRouter({ apiKey: c.env.OPENROUTER_API_KEY });
    if (msg.startsWith("/")) {
      const match = msg.match(/^\/([^\s]+)(.*)/s);
      if (!match) return c.text("error: model not specified after /");
      const [, specifiedModel, restMsg] = match;

      const messages: ModelMessage[] = [{ role: "user", content: restMsg }];
      if (ref) messages.unshift({ role: "user", content: ref });

      if (specifiedModel === "/") {
        const defaultModel = await c.env.HACHIBOT.get("defaultModel");
        if (!defaultModel)
          return c.text("error: defaultModel not set, cannot use //");
        const model = openrouter(defaultModel);
        const { text } = await generateText({ model, messages });
        return c.text(text);
      }

      const model = openrouter(specifiedModel);
      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    const defaultModel = await c.env.HACHIBOT.get("defaultModel");
    if (!defaultModel) return c.text("error: defaultModel not set");
    const model = openrouter(defaultModel);

    if (msg.startsWith("help")) {
      const prompt = await c.env.HACHIBOT.get("#help");
      if (!prompt) return c.text("error: no prompt found for #help");

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

      const restMsg = msg.match(/^help\s*(.*)/s)?.[1];
      if (restMsg) messages.push({ role: "user", content: restMsg });

      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    if (msg === "hacker news") {
      const prompt = await c.env.HACHIBOT.get("#hackernews");
      if (!prompt) return c.text("error: no prompt found for #hackernews");

      const response = await fetch("https://news.ycombinator.com/");
      const content = await response.text();

      const messages: ModelMessage[] = [{ role: "user", content }];
      messages.unshift({ role: "system", content: prompt });

      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    if (msg.startsWith("tldr")) {
      const url = msg.match(/^tldr\s+([^\s]+)/)?.[1];
      if (!url) return c.text("error: url not specified");

      const prompt = await c.env.HACHIBOT.get("#tldr");
      if (!prompt) return c.text("error: no prompt found for #tldr");

      const response = await fetch(url);
      const content = await response.text();

      const messages: ModelMessage[] = [
        { role: "system", content: prompt },
        { role: "user", content },
      ];
      const { text } = await generateText({ model, messages });
      return c.text(text);
    }

    if (msg.startsWith("#")) {
      const match = msg.match(/^(#[^\s]+)\s*(.*)/s);
      if (!match) return c.text("error: invalid # command");
      const [, tag, restMsg] = match;

      const prompt = await c.env.HACHIBOT.get(tag);
      if (!prompt) return c.text(`error: no prompt found for ${tag}`);

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
