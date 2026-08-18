# Storyboard Studio: Turn messy writing into a coherent visual story

[简体中文](./README.zh-CN.md) · English

[![Cross-platform CI](https://github.com/Shhaaawwww/xuge-storyboard-studio/actions/workflows/cross-platform.yml/badge.svg)](https://github.com/Shhaaawwww/xuge-storyboard-studio/actions/workflows/cross-platform.yml)

## Turn messy writing into a coherent visual story.

Xuge is an open-source narrative compiler for rough notes, fragmented memories, journals, memoirs, and unfinished fiction. It turns writing that is hard to follow into an editable visual blueprint: a Story Bible, Adaptation Plan, storyboard, and panel-by-panel T2I prompt pack.

> Start with the mess. End with a story you can draw, direct, or generate.

Xuge does not generate images or final comic layouts. It organizes the story and makes creative decisions before an image model is called, so the exported prompts can work with any T2I tool.

## From fragments to frames

A raw memory rarely arrives as a clean script. It jumps through time, leaves details uncertain, and mixes facts with impressions. Xuge separates those layers before turning them into visual decisions:

```text
Rough writing          fragments · jumps · missing details
    ↓
Story facts            characters · places · timeline · locked facts
    ↓
Narrative structure    theme · pacing · adaptation distance
    ↓
Visual blueprint       shots · actions · composition · continuity
    ↓
Prompt Pack            panel-by-panel prompts for any image model
```

- **Start with imperfect input** — no polished screenplay required.
- **Keep the story coherent** — make facts, inferences, and creative additions visible across panels.
- **Control the creative distance** — stay faithful, adapt for comics, or take an artistic direction.
- **Keep the author in control** — review, edit, and regenerate each stage instead of accepting a black-box result.

- **Edit every artifact** — Story Bible, Adaptation Plan, storyboard, and prompt cards remain editable.
- **Regenerate with dependencies** — changing an upstream artifact marks the affected downstream stages for regeneration.
- **Edit with AI assistance** — describe a change in natural language, review the proposed diff, then decide whether to apply it.
- **Keep provenance visible** — distinguish source facts, reasonable inferences, and creative additions.
- **Switch the interface language** — use Xuge in English or Simplified Chinese without changing the language of your story artifacts.

## Workflow

```text
Source text
    ↓
Story Bible          characters · locations · timeline · locked facts
    ↓
Adaptation Plan      theme · structure · pacing · creative decisions
    ↓
Storyboard & Prompts shots · composition · dialogue · T2I prompt cards
    ↓
Quality Audit        fidelity · continuity · visual clarity · prompt quality
    ↓
Markdown Prompt Pack / JSON Project
```

Use **Guided mode** to pause after each stage for review and editing, or **Auto mode** to produce the complete package in one run. Editing the Story Bible invalidates every later stage; editing the Adaptation Plan invalidates the storyboard and audit; editing the storyboard invalidates the audit.

## Quick start

Install [Node.js](https://nodejs.org/) `20.19+` or `22.12+`, then download or clone this repository.

> **Downloaded a ZIP? Extract the entire archive first.** Do not run a launcher from inside the compressed ZIP folder. On first launch, Xuge installs its JavaScript dependencies and then opens the browser automatically.

### Platform launchers

| System | Start | Stop |
| --- | --- | --- |
| Windows | Double-click `start-xuge.bat` | Double-click `stop-xuge.bat` |
| macOS | Double-click `start-xuge.command` | Double-click `stop-xuge.command` |
| Linux | Run `./start-xuge.sh` | Run `./stop-xuge.sh` |

The shared cross-platform launcher installs dependencies on the first run, checks ports, starts the API and web app in the background, waits for both services to become healthy, and opens the browser. Logs and launcher state stay in the ignored `.runtime/` directory.

The launchers look for Node.js in `PATH` and in common Windows, Homebrew, nvm, fnm, Volta, asdf, and mise locations. If Node.js is missing, the launcher keeps the error visible and opens the official download page.

If macOS or Linux removes executable permissions after downloading a ZIP, run:

```bash
chmod +x start-xuge.sh stop-xuge.sh start-xuge.command stop-xuge.command
```

If macOS blocks the downloaded launcher, Control-click `start-xuge.command`, choose **Open**, then confirm **Open** once. This authorizes that downloaded script without changing system-wide security settings.

### Universal command line

```bash
git clone https://github.com/Shhaaawwww/xuge-storyboard-studio.git
cd xuge-storyboard-studio
npm install
npm run app:start
```

Stop the background app with `npm run app:stop`. Developers can use `npm run dev` to keep both services attached to the terminal. Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The built-in Demo Provider requires no API key; choose **Load sample** to explore the complete workflow. Use the language switch in the top bar to change the interface. Generated story artifacts follow the source text language, so changing the interface never rewrites existing creative work.

## Connect a model

Open Settings in the app, select **OpenAI Compatible**, and enter:

- Base URL
- Model name
- API key

The provider must support `/chat/completions` and should support JSON object output. Xuge can connect to compatible hosted APIs, gateways, Ollama, or vLLM.

Settings are stored in plain text at `data/settings.json` on your machine. The file is ignored by Git, but it is not encrypted. You can also copy `.env.example` to `.env` and configure the same values there.

> **Local-use boundary:** this MVP is designed for a trusted, single-user computer. Do not expose it directly to the public internet. It does not yet include authentication, user isolation, or a production secret store.

## Outputs

- Editable Story Bible and Adaptation Plan
- Structured storyboard with individual T2I prompt cards
- Fidelity, continuity, visual clarity, and prompt-quality audit
- Markdown Prompt Pack for human workflows
- JSON Project for agents, scripts, or downstream tools

## Current scope

- The Demo Provider demonstrates the product flow, not real story understanding.
- A source document is currently limited to 50,000 characters.
- Long-form, chapter-by-chapter processing is not yet implemented.
- Real-model results depend on valid structured JSON output from the selected model.
- Image generation and final comic layout remain deliberately model-agnostic.
- The interface supports English and Simplified Chinese. Generated artifacts follow the source text language.

## Development

```bash
npm run dev      # Start API and web app
npm run build    # Type-check and build the web app
npm test         # Run pipeline tests
```

```text
src/              React workspace and export tools
server/           Pipeline, prompts, providers, jobs, and settings
scripts/          Shared cross-platform launcher core
*.bat              Windows launchers
*.command          macOS double-click launchers
*.sh               macOS/Linux shell launchers
```

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

Released under the [MIT License](./LICENSE).
