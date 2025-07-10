import { generateText } from "ai";
import { Command } from "./command";
import { createGateway } from "@ai-sdk/gateway";

export const llm: Command["execute"] = async ({ msg, ref }, c) => {
  let model: string;
  let prompt: string;

  const elements = msg.split(" ", 2);
  if (elements.length < 2) {
    [model, prompt] = ["xai/grok-3", msg];
  } else {
    [model, prompt] = elements;
  }

  const gateway = createGateway({ apiKey: c.env.AI_GATEWAY_API_KEY });
  const { text } = await generateText({
    model: gateway(model),
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
