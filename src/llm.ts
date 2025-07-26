import { createGateway } from "@ai-sdk/gateway";
import { generateText, stepCountIs, tool } from "ai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { z } from "zod/v4";
import { Command } from "./command";
import { lolv2 } from "./lol";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

dayjs.extend(utc);
dayjs.extend(timezone);

export const llm: Command["execute"] = async ({ msg, ref }, c) => {
  let verbose = false;
  let [model, prompt] = ["google/gemini-2.5-flash", msg];
  if (msg.startsWith("/")) {
    verbose = true;
    [model, prompt] = msg.slice(1).split(" ", 2);
    prompt = msg.slice(msg.indexOf(" ") + 1);
  }

  // const gateway = createGateway({ apiKey: c.env.AI_GATEWAY_API_KEY });
  const openrouter = createOpenRouter({ apiKey: c.env.OPENROUTER_API_KEY });
  const { text, response } = await generateText({
    model: openrouter(model),
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
    prompt: [ref, prompt].filter(Boolean).join("\n"),
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
