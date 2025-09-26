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

    if (msg === "help"){
      return c.text(`This help message is not automatically updated when features are updated. Last update: 2025-09-26 by User670, based on commit 1720cc3 of xqm32/hachibot

rooms - get GITCG simulator rooms. alias: r
guyu - get latest pull request for GITCG simulator. alias: gy
who am i - display your QQ number.
credits - get remaining credits for OpenRouter.
set default model to <model_id>
get default model
list models
list models like <keyword> - filter models by keyword
at <alias> <prompt> - set custom system prompt
/<model_id> <message> - call specified model. / is shorthand for default model.
@<alias> <message> - call default model with system prompt

Messages that do not match above patterns call the default model.`);
    }
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

export default app;
