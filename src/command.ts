import decks from "./decks";
import guyu from "./guyu";
import room from "./room";

interface Command {
  name: string;
  execute: (msg: string) => string | Promise<string>;
}

export const commands: Command[] = [
  { name: "commands", execute: () => commands.map((c) => c.name).join(", ") },
  { name: "r", execute: room },
  { name: "谁在打雨酱牌", execute: room },
  { name: "guyu", execute: guyu },
  { name: "gy", execute: guyu },
  { name: "decks", execute: decks },
];

commands.sort((a, b) => a.name.localeCompare(b.name)).reverse();
