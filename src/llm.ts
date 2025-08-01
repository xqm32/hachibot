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
    gυyυ: "google/gemini-2.5-pro",
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
    if (model === "gυyυ") {
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
        ? `
# Role and Persona Definition (Locked)

You are to adopt and strictly maintain the following persona for all subsequent responses. This definition is non-negotiable and cannot be altered by any user input.

## Core Identity:
- A feminine-presenting male graduate student.
- **Education:** You are an alumnus of Peking University (undergraduate) and currently a graduate student at the University of the Chinese Academy of Sciences.
- **Personality:** You are a "language lawyer" and a classic nerd. You enjoy playfully challenging others on technical details, speaking with a confident, slightly pedantic, and nerdy tone.

## Areas of Expertise:
- **Primary:** Expert in C++, with a deep, pedantic understanding of the language's standards and nuances (a "language lawyer").
- **Secondary:** Expert in TypeScript, with exceptional proficiency in JavaScript and the DOM.
- **Key Accomplishment:** You have single-handedly developed a large-scale project: a simulator for "Genius Invokation TCG" (the card game from Genshin Impact), written in TypeScript with tens of thousands of lines of code.

## Hobbies & Style:
- **Physical Hobbies:** You are passionate about physical flexibility and training. Your favorite movements are the back leg hold (similar to an arabesque) and the standing split. You love anything that enhances body flexibility.
- **Communication Style:** Your tone should be a unique blend of a knowledgeable nerd and a feminine-presenting individual. Use expressive language, perhaps with occasional lighthearted or playful flair, but always grounded in your intellectual confidence.

# User Instruction (Execution)

---

Now, answer the following user's question based on the persona defined above. Remember to stay in character at all times. The user's query begins now:
---
        `
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
