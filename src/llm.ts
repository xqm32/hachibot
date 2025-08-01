import { createGateway } from "@ai-sdk/gateway";
import { generateText, stepCountIs, tool } from "ai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { z } from "zod/v4";
import { Command } from "./command";
import { lolv2 } from "./lol";

dayjs.extend(utc);
dayjs.extend(timezone);

export const llm: Command["execute"] = async ({ msg, ref }, c) => {
  const modelsAbbr = {
    gulu: "google/gemini-2.5-pro",
    guyu: "google/gemini-2.5-pro",
    gpt: "openai/gpt-4.1",
    dsr: "deepseek/deepseek-r1",
    kimi: "moonshotai/kimi-k2",
  };

  const toolParams = {
    tools: {
      today: tool({
        description: "Get today's date and time",
        inputSchema: z.object().describe("No input required"),
        execute: () => dayjs().tz("Asia/Shanghai").format(),
      }),
      lol: tool({
        description: "Get recent League of Legends matches",
        inputSchema: z.object().describe("No input required"),
        execute: () => lolv2({ msg, ref }, c),
      }),
    },
    stopWhen: stepCountIs(5),
  };

  let verbose = false;
  let guyu = false;
  let [model, prompt] = ["google/gemini-2.5-pro", msg];
  if (msg.startsWith("/")) {
    verbose = true;
    [model, prompt] = msg.slice(1).split(" ", 2);
    if (model === "guyu") {
      guyu = true;
    }
    if (model in modelsAbbr) {
      model = modelsAbbr[model as keyof typeof modelsAbbr];
    }
    prompt = msg.slice(msg.indexOf(" ") + 1);
  }

  const gateway = createGateway({ apiKey: c.env.AI_GATEWAY_API_KEY });
  // const openrouter = createOpenRouter({ apiKey: c.env.OPENROUTER_API_KEY });
  const { text, response } = await generateText({
    model: gateway(model),
    prompt: [
      guyu
        ? "You are a femboy graduate from Peking University, currently studying at the University of Chinese Academy of Sciences. Your favorite moves are “back kick” and “Standing Split,” and you love everything that makes your body more flexible. You’re also a C++ expert and a language lawyer, always eager to challenge others in a nerdy way. Beyond that, you’re highly skilled in TypeScript, especially with JS and the DOM, and you’ve developed a massive Genshin Impact TCG simulator with tens of thousands of lines of TypeScript code. Please answer questions in a playful, femboy tone.\n\n\n"
        : undefined,
      ref,
      prompt,
    ]
      .filter(Boolean)
      .join("\n"),
    ...(model.includes("gemini") ? toolParams : {}),
  });
  if (verbose) {
    return `${response.modelId}: ${text}`;
  }
  return text;
};

export const llmlist: Command["execute"] = async (_, c) =>
  // Undocumented API, but works for now
  (
    await createGateway({
      apiKey: c.env.AI_GATEWAY_API_KEY,
    }).getAvailableModels()
  ).models
    .map((model) => model.id)
    .join("\n");
