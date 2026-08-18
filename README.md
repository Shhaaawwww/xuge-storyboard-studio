# 叙格 Storyboard Studio

把小说、日记和回忆录编译成可编辑、可审核、可导出的漫画分镜 Prompt Pack。

本项目只处理图像生成之前的工作：理解原文、建立 Story Bible、艺术化改编、分镜设计、T2I Prompt 编译和连续性审核。它不绑定任何图像生成模型。

## MVP 能力

- 三种改编模式：忠于原文、漫画改编、艺术创作
- Story Bible：人物、地点、时间线、锁定事实、待确认信息
- 带来源标记的改编决策：原文 / 推断 / 创作
- 结构化分镜与逐格 T2I Prompt Card
- 忠实度、连续性、视觉清晰度和 Prompt 质量审核
- 单格 Prompt 编辑与复制
- Markdown Prompt Pack / JSON Project 导出
- 零配置 Demo Provider
- OpenAI-compatible Provider，可连接 Ollama、vLLM 或兼容网关
- 页面内 API 设置，明文保存到本地 `data/settings.json`
- 产品内创作指南，包含完整工作流、编辑机制和开发者接口说明

## 快速开始

要求 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。默认使用 Demo Provider，不需要 API Key。点击“载入示例”即可体验完整流程。

进入工作台后，点击右上角的“使用说明”可以查看图解快速开始、四阶段工作流、依赖式重生成、AI 编辑助手和开发接口。

## 连接真实模型

启动应用后，点击页面右上角的设置按钮，选择 `OpenAI Compatible`，填写：

- Base URL
- 模型名称
- API Key

点击“明文保存”后，配置会直接写入本机的 `data/settings.json`，下一次启动时自动读取。该文件已加入 `.gitignore`，但没有加密；任何能够读取项目目录的人都能看到 API Key。

也可以使用环境变量作为首次启动时的默认值。复制 `.env.example` 为 `.env`：

```dotenv
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=
LLM_MODEL=qwen3:8b
```

如果 `data/settings.json` 已经存在，它的设置优先于 `.env`。

> 安全提示：`data/`、`.env*`（不含 `.env.example`）、日志、证书和私钥均已被 Git 忽略。不要把真实 Key 写进源码、示例、Issue、截图或提交历史。已经公开过的 Key 应立即在服务商后台撤销并重新生成。

也可以不创建 `.env`，在启动命令之前直接设置环境变量。PowerShell 示例：

```powershell
$env:LLM_PROVIDER="openai-compatible"
$env:LLM_BASE_URL="http://localhost:11434/v1"
$env:LLM_MODEL="qwen3:8b"
npm run dev
```

Provider 必须支持 `/chat/completions`，并且最好支持 JSON Object 输出。

## 代码结构

```text
src/
  App.tsx              编辑器界面
  types.ts             Prompt Pack 数据模型
  export.ts            Markdown / JSON 导出
server/
  pipeline.ts          类型化流水线
  prompts.ts           各阶段系统提示词
  provider.ts          Provider 接口与 OpenAI-compatible 实现
  demo-provider.ts     零配置演示实现
```

## 当前限制

- Demo Provider 只用于演示工作流，不代表真实故事理解质量。
- OpenAI-compatible Provider 依赖模型正确返回 JSON，后续应增加完整 Schema 校验与自动修复。
- MVP 一次处理最多 50,000 个字符，尚未实现长篇小说的章节级增量处理。
- 编辑 Prompt 后暂时不会自动重新运行审核。

## 开发命令

```bash
npm run dev      # 同时启动 API 和 Web
npm run build    # TypeScript 检查和生产构建
npm test         # 运行流水线测试
```

## 安全与开源

- 本仓库不包含运行者的 API Key 或本地创作数据。
- API 设置仅保存在运行者自己的 `data/settings.json` 中，该目录不会进入 Git。
- 提交代码前请运行敏感信息扫描，并检查 `git diff --cached`。
- 安全问题请参阅 [`SECURITY.md`](./SECURITY.md)，参与开发请参阅 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

本项目采用 [MIT License](./LICENSE)。
# 双击启动（Windows）

直接双击项目根目录下的 `启动叙格.bat`。启动器会检查环境、在首次运行时安装依赖、启动网页与 API，然后自动打开浏览器。

服务会在后台运行；需要关闭时，双击 `停止叙格.bat`。

## 可审阅工作流

- **逐步审阅**：依次生成 Story Bible、改编方案、分镜 Prompt 和质量审核。每一步完成后暂停，等待用户检查、编辑并确认继续。
- **全自动**：连续完成四个阶段；完成后仍可回到任意上游阶段编辑。
- **依赖失效**：修改 Story Bible 会使改编、分镜和审核失效；修改改编方案会使分镜和审核失效；修改分镜会使审核失效。
- **定向重生成**：逐步模式只生成下一个阶段；全自动模式可以从失效点开始重新生成全部后续阶段。
- **AI 编辑助手**：接收自然语言要求，先返回修改摘要、理由和字段差异；只有用户确认后才会应用修改。
