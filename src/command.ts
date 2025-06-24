interface Command {
  name: string;
  execute: (msg: string) => string | Promise<string>;
}

export const commands: Command[] = [
  { name: "commands", execute: () => commands.map((c) => c.name).join(", ") },
];

commands.sort((a, b) => a.name.localeCompare(b.name)).reverse();
