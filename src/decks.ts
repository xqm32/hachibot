export default async () =>
  (
    (await (
      await fetch("https://www.summoners.top/api/v4/decks")
    ).json()) as string[]
  )
    .slice(0, 10)
    .join("\n");
