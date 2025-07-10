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
  let [model, prompt] = ["openai/gpt-4.1", msg];
  if (msg.startsWith("/")) {
    [model, prompt] = msg.slice(1).split(" ", 2);
  }

  const gateway = createGateway({ apiKey: c.env.AI_GATEWAY_API_KEY });
  const { text } = await generateText({
    model: gateway(model),
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
