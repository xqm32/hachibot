import { Context } from "hono";
import decks from "./decks";
import guyu from "./guyu";
import room from "./room";
import llm from "./llm";

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
  { name: "r", execute: room },
  { name: "谁在打雨酱牌", execute: room },
  { name: "guyu", execute: guyu },
  { name: "gy", execute: guyu },
  { name: "decks", execute: decks },
  { name: "echo", execute: ({ msg, ref }) => JSON.stringify({ msg, ref }) },
  { name: "llm", execute: llm },
];

commands.sort((a, b) => a.name.localeCompare(b.name)).reverse();
