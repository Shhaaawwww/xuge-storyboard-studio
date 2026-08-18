import { access, mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(scriptsDir, "..");
export const runtimeDir = path.join(projectRoot, ".runtime");
export const stateFile = path.join(runtimeDir, "launcher-state.json");
export const stdoutLog = path.join(runtimeDir, "storyboard.out.log");
export const stderrLog = path.join(runtimeDir, "storyboard.err.log");
export const runnerFile = path.join(scriptsDir, "run-storyboard.mjs");

const parsePort = (value, fallback) => {
  const port = Number(value || fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
};

export const webPort = parsePort(process.env.WEB_PORT, 5173);
export const apiPort = parsePort(process.env.PORT, 4317);
export const webUrl = `http://127.0.0.1:${webPort}/`;
export const apiUrl = `http://127.0.0.1:${apiPort}/api/health`;

export const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function nodeVersionSupported() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22;
}

export async function endpointReady(url) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 2_000 }, (response) => {
      const ready = Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 400);
      response.resume();
      response.once("end", () => resolve(ready));
    });
    request.once("timeout", () => request.destroy());
    request.once("error", () => resolve(false));
  });
}

export function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(400);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

export async function ensureRuntimeDir() {
  await mkdir(runtimeDir, { recursive: true });
}

export async function ensureDependencies() {
  const binary = path.join(
    projectRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "concurrently.cmd" : "concurrently"
  );

  try {
    await access(binary);
    return;
  } catch {
    console.log("Installing dependencies for the first launch...");
  }

  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm install"], {
        cwd: projectRoot,
        stdio: "inherit",
        windowsHide: false
      })
    : spawnSync("npm", ["install"], { cwd: projectRoot, stdio: "inherit" });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("npm install failed.");
}

export function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function readState() {
  try {
    return JSON.parse(await readFile(stateFile, "utf8"));
  } catch {
    return null;
  }
}

export async function writeState(state) {
  await ensureRuntimeDir();
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function removeState() {
  await rm(stateFile, { force: true });
}

export async function processMatchesRunner(pid) {
  if (!isProcessAlive(pid)) return false;

  const result = process.platform === "win32"
    ? spawnSync("powershell.exe", [
        "-NoProfile",
        "-Command",
        `$process = Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}' -ErrorAction SilentlyContinue; if ($process) { $process.CommandLine }`
      ], { encoding: "utf8", windowsHide: true })
    : spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });

  return result.status === 0 && result.stdout.includes(path.basename(runnerFile));
}

export async function stopManagedProcess(pid) {
  if (!isProcessAlive(pid)) return;

  if (process.platform === "win32") {
    const result = spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    if (result.status !== 0 && isProcessAlive(pid)) {
      throw new Error(`Could not stop process ${pid}.`);
    }
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }

  for (let attempt = 0; attempt < 20 && isProcessAlive(pid); attempt += 1) {
    await delay(250);
  }

  if (isProcessAlive(pid)) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
}

export function startRunner(npmScript) {
  return open(stdoutLog, "a").then(async (stdoutHandle) => {
    const stderrHandle = await open(stderrLog, "a");
    try {
      const child = spawn(process.execPath, [runnerFile, npmScript], {
        cwd: projectRoot,
        detached: true,
        env: process.env,
        stdio: ["ignore", stdoutHandle.fd, stderrHandle.fd],
        windowsHide: true
      });
      return await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("spawn", () => {
          child.removeListener("error", reject);
          child.unref();
          resolve(child);
        });
      });
    } finally {
      await stdoutHandle.close();
      await stderrHandle.close();
    }
  });
}

export function openBrowser(url) {
  if (process.env.XUGE_NO_OPEN === "1") return;

  let command;
  let args;
  if (process.platform === "win32") {
    command = "powershell.exe";
    args = ["-NoProfile", "-Command", `Start-Process '${url}'`];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  try {
    const opener = spawn(command, args, { detached: true, stdio: "ignore" });
    opener.once("error", () => console.log(`Open ${url} in your browser.`));
    opener.unref();
  } catch {
    console.log(`Open ${url} in your browser.`);
  }
}

export async function recentLog(file, lines = 20) {
  try {
    return (await readFile(file, "utf8")).trim().split(/\r?\n/).slice(-lines).join("\n");
  } catch {
    return "";
  }
}

export async function resetLogs() {
  await ensureRuntimeDir();
  await Promise.all([writeFile(stdoutLog, "", "utf8"), writeFile(stderrLog, "", "utf8")]);
}
