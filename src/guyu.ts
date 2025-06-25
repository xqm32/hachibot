import { Octokit } from "octokit";

const octokit = new Octokit();

export default async () => {
  const pullRequest = (
    await octokit.request("GET /repos/{owner}/{repo}/pulls", {
      owner: "genius-invokation",
      repo: "genius-invokation",
      state: "all",
      sort: "updated",
      direction: "desc",
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
  ).data[0];
  if (pullRequest === undefined) {
    return "No pull requests found.";
  } else {
    return `${pullRequest.title}\n${pullRequest.html_url}`;
  }
};
