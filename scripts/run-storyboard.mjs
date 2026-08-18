import { spawn } from "node:child_process";
import { projectRoot } from "./launcher-common.mjs";

const npmScript = process.argv[2] || "dev";
const child = process.platform === "win32"
  ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm run ${npmScript}`], {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
      windowsHide: true
    })
  : spawn("npm", ["run", npmScript], {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit"
    });

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
