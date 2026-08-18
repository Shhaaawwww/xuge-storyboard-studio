# Xuge · Storyboard Studio

[简体中文](./README.zh-CN.md) · English

Turn novels, journals, and memoirs into an editable visual narrative plan and a production-ready prompt pack.

Xuge is a local-first, open-source pre-production workspace for visual storytelling. It handles the work between prose and image generation: understanding the source, shaping the adaptation, designing the shots, compiling T2I prompts, and checking continuity. Bring the exported prompts to any image model you prefer.

> Xuge does not generate images. It makes the creative decisions before image generation visible, reviewable, and reusable.

## Why Xuge

Going directly from a long story to image prompts often produces attractive but disconnected pictures. Xuge introduces a structured creative pipeline so that characters, locations, facts, tone, and visual decisions remain coherent across panels.

- **Choose the creative distance** — faithful, adapted, or artistic.
- **Review before committing** — work step by step or run the full pipeline automatically.
- **Edit every artifact** — Story Bible, Adaptation Plan, storyboard, and prompt cards remain editable.
- **Regenerate with dependencies** — changing an upstream artifact marks the affected downstream stages for regeneration.
- **Edit with AI assistance** — describe a change in natural language, review the proposed diff, then decide whether to apply it.
- **Keep provenance visible** — distinguish source facts, reasonable inferences, and creative additions.

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

### Windows launcher

1. Install [Node.js](https://nodejs.org/) `20.19+` or `22.12+`.
2. Download or clone this repository.
3. Double-click `启动叙格.bat`.

The launcher installs dependencies on the first run, starts the API and web app, and opens the browser. Double-click `停止叙格.bat` to stop it.

### Command line

```bash
git clone https://github.com/Shhaaawwww/xuge-storyboard-studio.git
cd xuge-storyboard-studio
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The built-in Demo Provider requires no API key; choose **载入示例 (Load sample)** to explore the complete workflow.

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
- The application interface is currently in Simplified Chinese.

## Development

```bash
npm run dev      # Start API and web app
npm run build    # Type-check and build the web app
npm test         # Run pipeline tests
```

```text
src/              React workspace and export tools
server/           Pipeline, prompts, providers, jobs, and settings
scripts/          Windows launcher scripts
```

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

Released under the [MIT License](./LICENSE).
