import { Context } from "hono";
import decks from "./decks";
import guyu from "./guyu";
import { llm, llmlist } from "./llm";
import room from "./room";
import { lol, lolv2 } from "./lol";

export interface Command {
  name: string;
  execute: (
    {
      msg,
      ref,
    }: {
      msg: string;
      ref?: string;
    },
    c: Context<{ Bindings: CloudflareBindings }>
  ) => string | Promise<string>;
}

export const commands: Command[] = [
  { name: "commands", execute: () => commands.map((c) => c.name).join(", ") },
  { name: "help", execute: () => commands.map((c) => c.name).join(", ") },
  { name: "r", execute: room },
  { name: "谁在打雨酱牌", execute: room },
  { name: "guyu", execute: guyu },
  { name: "gy", execute: guyu },
  { name: "decks", execute: decks },
  { name: "echo", execute: ({ msg, ref }) => JSON.stringify({ msg, ref }) },
  { name: "llm", execute: llm },
  { name: "llmlist", execute: llmlist },
  { name: "lol", execute: lol },
  { name: "lolv2", execute: lolv2 },
  { name: "", execute: llm },
];

commands.sort((a, b) => a.name.localeCompare(b.name)).reverse();
