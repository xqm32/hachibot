import dayjs from "dayjs";
import { Command } from "./command";

export const lol: Command["execute"] = async ({ msg }) => {
  let [stime, etime] = msg.split(" ");
  if (!stime) {
    stime = dayjs().format("YYYY-MM-DD");
    etime = dayjs().format("YYYY-MM-DD");
  } else if (!etime) {
    stime = dayjs(stime).format("YYYY-MM-DD");
    etime = stime;
  } else {
    stime = dayjs(stime).format("YYYY-MM-DD");
    etime = dayjs(etime).format("YYYY-MM-DD");
  }

  const url = new URL("https://api.bilibili.com/x/esports/matchs/list");
  url.search = new URLSearchParams({
    mid: "0",
    gid: "2",
    tid: "0",
    pn: "1",
    ps: "10",
    contest_status: "",
    etime,
    stime,
  }).toString();

  const data: any = await (await fetch(url)).json();
  const games: any[] = data.data.list;
  return games
    .map(
      (game) =>
        `${game.season.title} ${game.game_stage} ${dayjs
          .unix(game.stime)
          .format("YYYY-MM-DD HH:mm:ss")}\n${game.home.name} ${
          game.home_score
        }:${game.away_score} ${game.away.name}`
    )
    .join("\n");
};

export const lolv2: Command["execute"] = async () => {
  const games = Object.entries(
    JSON.parse(
      (
        await (
          await fetch(
            "https://lpl.qq.com/web201612/data/LOL_MATCH2_GAME_LIST_BRIEF.js"
          )
        ).text()
      ).slice("var GameList=".length, -1)
    ).msg.sGameList
  ).flatMap((i) => i[1]) as any[];
  const [latest] = games.sort((a, b) => Number(b.GameId) - Number(a.GameId));
  const data = (await (
    await fetch(
      `https://lpl.qq.com/web201612/data/LOL_MATCH2_MATCH_HOMEPAGE_BMATCH_LIST_${latest.GameId}.js`
    )
  ).json()) as any;
  const matches = data.msg as any[];
  const match = matches.find((match) => ["1", "2"].includes(match.MatchStatus));
  const [teamA, teamB] = match.bMatchName.split(" vs ");
  return [
    `${match.GameName} ${match.GameTypeName} ${match.GameProcName}`,
    `${match.MatchDate}`,
    `${teamA} ${match.ScoreA}:${match.ScoreB} ${teamB}`,
  ].join("\n");
};
