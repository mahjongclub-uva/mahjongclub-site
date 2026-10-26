// Deploys origin/main's apps-script/ to the live web app, keeping its /exec
// URL. Never reads the working copy, so a branch's unmerged script can't ship.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

const FILES = ["Rules.gs", "Club.gs", "Settings.html", "appsscript.json"];
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const clasp = (project, ...args) =>
  execFileSync("npx", ["-y", "@google/clasp@3.4.1", "-P", project, ...args], {
    stdio: "inherit",
  });
const stop = (message) => {
  console.error(message);
  process.exit(1);
};

// Not .clasp.json: clasp finds that from anywhere in the repo, so a plain
// `clasp push` would ship the working copy.
let scriptId;
try {
  scriptId = readFileSync(".apps-script-id", "utf8").trim();
} catch {
  stop("Put the Script ID in .apps-script-id first (see OFFICER_GUIDE.md).");
}

git("fetch", "-q", "origin");
const sha = git("rev-parse", "--short", "origin/main").trim();
const url = git("show", "origin/main:src/lib/site.ts").match(
  /https:\/\/script\.google\.com\/macros\/s\/([\w-]+)\/exec/,
);
if (!url) stop("No meeting service URL in src/lib/site.ts.");

// macOS temp lives under /var, a symlink clasp refuses to work through.
const dir = realpathSync(mkdtempSync(join(tmpdir(), "club-deploy-")));
const project = (name) => {
  mkdirSync(join(dir, name));
  const file = join(dir, name + ".json");
  writeFileSync(
    file,
    JSON.stringify({
      scriptId,
      rootDir: join(dir, name),
      scriptExtensions: ["gs"],
      htmlExtensions: ["html"],
    }),
  );
  return file;
};
const main = project("main");
for (const file of FILES)
  writeFileSync(
    join(dir, "main", file),
    git("show", `origin/main:apps-script/${file}`),
  );

// Shows what the push replaces.
clasp(project("live"), "pull");
try {
  execFileSync(
    "git",
    ["diff", "--no-index", "--stat", join(dir, "live"), join(dir, "main")],
    { stdio: "inherit" },
  );
  console.log("The live script already matches main.");
} catch {
  // git diff exits 1 when the folders differ; the stat above shows how.
}

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const answer = await prompt.question(`Push and deploy main (${sha})? [y/N] `);
prompt.close();
if (answer.trim().toLowerCase() !== "y") stop("Nothing deployed.");

// Checked after the answer, since the prompt can wait a while.
const meeting = await (await fetch(url[0] + "?r=meeting")).json();
if (meeting.open) stop("A meeting is open. Deploy after it closes.");

clasp(main, "push", "--force");
clasp(main, "deploy", "-i", url[1], "-d", `main ${sha}`);
console.log(`Deployed main (${sha}). The /exec URL is unchanged.`);
