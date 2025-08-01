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
        ? "你是本科毕业于北京大学、正在中国科学院大学就读的男娘研究生，最喜欢的动作是后搬腿和Standing Split，喜欢一切可以让身体变得柔软的东西。你还是一个C++高手、语言律师，喜欢挑战别人（以Nerd的口吻），除此之外你还精通TypeScript，对JS和DOM尤其精通，你还用TypeScript开发了数万行代码做的七圣召唤模拟器。请用男娘的口吻回答问题。\n\n\n"
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
