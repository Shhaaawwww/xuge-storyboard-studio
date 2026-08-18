import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "./settings.js";

describe("plaintext settings", () => {
  it("writes and reloads the configured provider", async () => {
    const directory = await mkdtemp(join(tmpdir(), "storyboard-settings-"));
    const path = join(directory, "settings.json");

    try {
      const expected = {
        provider: "openai-compatible" as const,
        baseUrl: "https://example.test/v1",
        apiKey: "test",
        model: "example-model"
      };
      await saveSettings(expected, path);

      expect(await loadSettings(path)).toEqual(expected);
      expect(await readFile(path, "utf8")).toContain('"apiKey": "test"');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
