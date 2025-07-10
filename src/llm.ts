import { createGateway } from "@ai-sdk/gateway";
import { generateText, stepCountIs, tool } from "ai";
import dayjs from "dayjs";
import { z } from "zod/v4";
import { Command } from "./command";
import { lol } from "./lol";

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
        execute: () => dayjs().format(),
      }),
      lol: tool({
        description: "Get League of Legends matches",
        inputSchema: z.object({
          stime: z.iso
            .date()
            .optional()
            .describe("Start time in YYYY-MM-DD format"),
          etime: z.iso
            .date()
            .optional()
            .describe("End time in YYYY-MM-DD format"),
        }),
        execute: async ({ stime, etime }) =>
          await lol({ msg: `${stime} ${etime}`, ref }, c),
      }),
    },
    stopWhen: stepCountIs(5),
    system:
      "You are an assistant. Please do not reply with more than 500 words in your response.",
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
