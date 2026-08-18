import {
  isProcessAlive,
  processMatchesRunner,
  readState,
  removeState,
  stopManagedProcess
} from "./launcher-common.mjs";

const state = await readState();
if (!state?.pid) {
  console.log("No launcher-managed Xuge process was found.");
  process.exit(0);
}

if (!isProcessAlive(state.pid)) {
  await removeState();
  console.log("Xuge was not running. Removed the stale launcher state.");
  process.exit(0);
}

if (!await processMatchesRunner(state.pid)) {
  console.error(`Refusing to stop PID ${state.pid} because it no longer belongs to this project.`);
  process.exit(1);
}

await stopManagedProcess(state.pid);
await removeState();
console.log("Xuge Storyboard Studio stopped.");
