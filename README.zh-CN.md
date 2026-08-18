# 叙格 · Storyboard Studio

简体中文 · [English](./README.md)

[![跨平台测试](https://github.com/Shhaaawwww/xuge-storyboard-studio/actions/workflows/cross-platform.yml/badge.svg)](https://github.com/Shhaaawwww/xuge-storyboard-studio/actions/workflows/cross-platform.yml)

把小说、日记和回忆录转化为可编辑的视觉叙事方案，以及可以直接交给图像模型的 Prompt Pack。

叙格是一套本地优先、开源的视觉叙事前期工作台。它处理文字与图像生成之间最关键的工作：理解原文、建立叙事事实、设计改编方式、拆解分镜、编译 T2I Prompt，并审核忠实度与连续性。最终 Prompt 可以交给任意图像生成模型。

> 叙格不负责生成图片。它让图像生成之前的创作决策变得可见、可审阅、可编辑、可复用。

## 为什么需要叙格

把一部长文本直接变成若干图片 Prompt，往往只能得到好看的单图，却很难形成连贯的叙事。叙格用结构化工作流管理人物、地点、时间线、事实、主题和视觉决策，让不同画面属于同一个故事世界。

- **创意程度可控**：忠于原文、漫画改编、艺术创作三种模式。
- **每一步都能检查**：可以逐步生成、逐步确认，也可以全自动完成。
- **中间成果全部可编辑**：Story Bible、改编方案、分镜和 Prompt Card 均可修改。
- **按依赖关系重新生成**：修改上游内容后，只让受影响的后续阶段失效并重新生成。
- **AI 编辑助手**：用自然语言描述要求，先查看修改摘要和字段差异，确认后再应用。
- **创作来源清晰**：区分原文事实、合理推断和创意新增。
- **中英文界面切换**：界面可随时切换，不会改写已有的故事内容与中间成果。

## 产品工作流

```text
原始文本
   ↓
Story Bible          人物 · 地点 · 时间线 · 锁定事实
   ↓
改编方案             主题 · 结构 · 节奏 · 创意决策
   ↓
分镜与 Prompt        镜头 · 构图 · 对白 · T2I Prompt Card
   ↓
质量审核             忠实度 · 连续性 · 视觉清晰度 · Prompt 质量
   ↓
Markdown Prompt Pack / JSON Project
```

选择**逐步审阅模式**，系统会在每一阶段完成后暂停，等待检查和编辑；选择**全自动模式**，则一次生成完整结果。修改 Story Bible 会使其后的改编、分镜和审核失效；修改改编方案会使分镜和审核失效；修改分镜会使审核失效。

## 快速开始

首先安装 [Node.js](https://nodejs.org/) `20.19+` 或 `22.12+`，然后下载或克隆本仓库。

> **通过 ZIP 下载时，请先完整解压。**不要直接在压缩包窗口里运行启动器。首次启动时，叙格会自动安装 JavaScript 依赖，然后打开浏览器。

### 各系统启动器

| 系统 | 启动 | 停止 |
| --- | --- | --- |
| Windows | 双击 `start-xuge.bat` | 双击 `stop-xuge.bat` |
| macOS | 双击 `start-xuge.command` | 双击 `stop-xuge.command` |
| Linux | 运行 `./start-xuge.sh` | 运行 `./stop-xuge.sh` |

三个平台共用同一套启动核心：首次运行自动安装依赖、检查端口、在后台启动网页与 API、等待服务健康后打开浏览器。日志和启动状态保存在已被 Git 忽略的 `.runtime/` 目录。

启动器会从系统 `PATH` 以及 Windows、Homebrew、nvm、fnm、Volta、asdf、mise 的常见安装位置寻找 Node.js。如果没有安装 Node.js，错误窗口不会立即消失，并会打开官方下载页面。

如果通过 ZIP 下载后 macOS 或 Linux 丢失了执行权限，请运行：

```bash
chmod +x start-xuge.sh stop-xuge.sh start-xuge.command stop-xuge.command
```

如果 macOS 阻止打开下载的启动器，请按住 Control 点击 `start-xuge.command`，选择**打开**，再确认一次**打开**。这只会授权该下载脚本，不会修改系统的全局安全设置。

### 通用命令行

```bash
git clone https://github.com/Shhaaawwww/xuge-storyboard-studio.git
cd xuge-storyboard-studio
npm install
npm run app:start
```

使用 `npm run app:stop` 停止后台服务。开发者可以使用 `npm run dev`，让两个服务保持连接在当前终端。浏览器访问 [http://127.0.0.1:5173](http://127.0.0.1:5173)。默认的 Demo Provider 不需要 API Key；点击**载入示例**即可体验完整工作流。顶部语言开关可以切换中英文界面；生成内容会跟随原文语言，因此切换界面不会改写已有创作成果。

## 连接真实模型

打开应用内设置，选择 **OpenAI Compatible**，填写：

- Base URL
- 模型名称
- API Key

Provider 需要支持 `/chat/completions`，并建议支持 JSON Object 输出。叙格可以连接兼容的云端 API、模型网关、Ollama 或 vLLM。

设置会以明文保存在本机的 `data/settings.json`，该文件已被 Git 忽略，但没有加密。也可以复制 `.env.example` 为 `.env`，通过环境变量提供同样的配置。

> **本地使用边界：**当前 MVP 面向可信电脑上的单人本地使用，请勿直接暴露到公网。项目暂未提供身份验证、用户数据隔离和生产级密钥管理。

## 可以得到什么

- 可编辑的 Story Bible 与改编方案
- 结构化分镜和逐格 T2I Prompt Card
- 忠实度、连续性、视觉清晰度和 Prompt 质量审核
- 适合人工创作流程的 Markdown Prompt Pack
- 可供 Agent、脚本和下游工具使用的 JSON Project

## 当前范围

- Demo Provider 用于演示产品流程，不代表真实的故事理解质量。
- 单次输入目前最多 50,000 个字符。
- 暂未实现长篇小说按章节增量处理。
- 真实模型需要稳定返回符合结构要求的 JSON。
- 图像生成与最终漫画排版保持模型无关，由下游工具完成。
- 界面支持简体中文与英文，生成内容跟随原文语言。

## 开发

```bash
npm run dev      # 启动 API 和网页
npm run build    # 类型检查并构建网页
npm test         # 运行流水线测试
```

```text
src/              React 工作台与导出工具
server/           流水线、提示词、Provider、任务与设置
scripts/          跨平台启动核心
*.bat              Windows 启动器
*.command          macOS 双击启动器
*.sh               macOS/Linux Shell 启动器
```

欢迎参与贡献，请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与 [SECURITY.md](./SECURITY.md)。

本项目采用 [MIT License](./LICENSE)。
