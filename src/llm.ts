import { generateText } from "ai";
import { Command } from "./command";
import { createGateway } from "@ai-sdk/gateway";

const llm: Command["execute"] = async ({ msg, ref }, c) => {
  const gateway = createGateway({ apiKey: c.env.AI_GATEWAY_API_KEY });
  const { text } = await generateText({
    model: gateway("xai/grok-3"),
    prompt: [ref, msg].join("\n"),
  });
  return text;
};

export default llm;
