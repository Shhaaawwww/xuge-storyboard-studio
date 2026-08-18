import {
  apiPort,
  apiUrl,
  browserHint,
  delay,
  endpointReady,
  ensureDependencies,
  ensureRuntimeDir,
  isProcessAlive,
  nodeVersionSupported,
  openBrowser,
  portInUse,
  processMatchesRunner,
  readState,
  recentLog,
  removeState,
  resetLogs,
  startRunner,
  stderrLog,
  stopManagedProcess,
  stdoutLog,
  webPort,
  webUrl,
  writeState
} from "./launcher-common.mjs";

const fail = (message) => {
  console.error(`\n${message}`);
  process.exit(1);
};

const waitUntilReady = async (pid, targetWebUrl = webUrl, targetApiUrl = apiUrl) => {
  const timeout = Number(process.env.XUGE_STARTUP_TIMEOUT_MS || 45_000);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await endpointReady(targetWebUrl)) && (await endpointReady(targetApiUrl))) return true;
    if (!isProcessAlive(pid)) return false;
    await delay(500);
  }
  return false;
};

console.log(`Starting Xuge Storyboard Studio on ${process.platform}...`);

if (!nodeVersionSupported()) {
  fail(`Node.js ${process.versions.node} is not supported. Install Node.js 20.19+ or 22.12+.`);
}

await ensureRuntimeDir();
await ensureDependencies();

const existing = await readState();
if (existing?.pid && isProcessAlive(existing.pid) && await processMatchesRunner(existing.pid)) {
  console.log("Xuge is already starting or running. Waiting for it to become ready...");
  const existingWebUrl = existing.webUrl || webUrl;
  const existingApiUrl = existing.apiUrl || apiUrl;
  if (await waitUntilReady(existing.pid, existingWebUrl, existingApiUrl)) {
    console.log(`Ready: ${existingWebUrl}`);
    openBrowser(existingWebUrl);
    browserHint(existingWebUrl);
    process.exit(0);
  }
  fail("The existing launcher-managed process did not become ready. Run the stop command, then try again.");
}
if (existing) await removeState();

const webReady = await endpointReady(webUrl);
const apiReady = await endpointReady(apiUrl);

if (!webReady && await portInUse(webPort)) {
  fail(`Port ${webPort} is already used by another program. Close it or set WEB_PORT to another port.`);
}
if (!apiReady && await portInUse(apiPort)) {
  fail(`Port ${apiPort} is already used by another program. Close it or set PORT to another port.`);
}

if (webReady && apiReady) {
  console.log(`Xuge is already running: ${webUrl}`);
  openBrowser(webUrl);
  browserHint(webUrl);
  process.exit(0);
}

const npmScript = !webReady && !apiReady ? "dev" : !webReady ? "dev:web" : "dev:api";
await resetLogs();
const child = await startRunner(npmScript);
if (!child.pid) fail("The launcher could not create the background process.");

await writeState({
  pid: child.pid,
  platform: process.platform,
  startedAt: new Date().toISOString(),
  npmScript,
  webUrl,
  apiUrl
});

console.log("Waiting for the web app and API...");
if (!await waitUntilReady(child.pid)) {
  const stderr = await recentLog(stderrLog);
  const stdout = await recentLog(stdoutLog);
  if (stderr) console.error(`\nRecent error log:\n${stderr}`);
  if (stdout) console.error(`\nRecent output log:\n${stdout}`);
  if (await processMatchesRunner(child.pid)) await stopManagedProcess(child.pid);
  await removeState();
  fail("Xuge did not become ready. Check the logs in .runtime/.");
}

console.log(`Ready: ${webUrl}`);
openBrowser(webUrl);
browserHint(webUrl);
