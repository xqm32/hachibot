import { Context } from "hono";
import decks from "./decks";
import guyu from "./guyu";
import { llm, llmlist } from "./llm";
import room from "./room";
import { lol, lolv2 } from "./lol";
import _ from "lodash";

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
  {
    name: "谁在打谷雨同学",
    execute: () =>
      _.sample(["嘟嘟可", "Abx", "鹊", "雨酱", "谷雨同学", "mskk是真的"]) +
      "在打谷雨同学",
  },
  {
    name: "谁在打摸鱼杯",
    execute: room,
  },
  { name: "谁在打", execute: ({ msg }) => `不可以打${msg}！！！` },
  {
    name: "?",
    execute: ({ ref }, c) =>
      llm(
        {
          msg: `Please judge whether the following message is good or bad. Reply with only a single word or short phrase that best describes the quality of the message, such as "good", "not good", "bad", or "not bad". Do not provide any explanation. Message:`,
          ref,
        },
        c
      ),
  },
];

commands.sort((a, b) => a.name.localeCompare(b.name)).reverse();
