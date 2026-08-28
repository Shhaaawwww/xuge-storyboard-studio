# 叙格 · Storyboard Studio

简体中文 · [English](./README.md)

[![跨平台测试](https://github.com/Shhaaawwww/xuge-storyboard-studio/actions/workflows/cross-platform.yml/badge.svg)](https://github.com/Shhaaawwww/xuge-storyboard-studio/actions/workflows/cross-platform.yml)

## 把散乱的文字，编译成可以被画出来的故事。

叙格是一款开源的叙事编译器。它从随笔、流水账、碎片记忆、回忆录和未完成小说开始，帮助你把难以理解的叙述整理成可编辑的视觉蓝图：Story Bible、叙事主干、场景方案、分镜、读者文字层和逐格 T2I Prompt Pack。

> 先接住混乱，再形成故事。

叙格不生成图片，也不负责最终漫画排版。它先保证陌生读者能看懂故事，再考虑艺术化表达，最后输出可交给任意 T2I 工具的逐格 Prompt。

## 先看看工作台

<p align="center">
  <img src="./docs/images/guide-hero.png" alt="叙格创作指南：从一段文字到可以被画出来的叙事" width="960" />
</p>

<p align="center"><em>先理解故事，再让图像模型动笔。</em></p>

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="./docs/images/workflow-progress.png" alt="显示四个阶段和实时进度的叙事流水线" width="100%" />
      <strong>进度清晰可见</strong><br />
      每一步都明确展示，逐步审阅模式可以随时暂停检查。
    </td>
    <td width="50%" valign="top">
      <img src="./docs/images/guided-review.png" alt="可编辑改编方案的逐步审阅界面" width="100%" />
      <strong>先编辑，再继续</strong><br />
      检查改编方案后，只重新生成受影响的后续阶段。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="./docs/images/prompt-pack.png" alt="工作台中的逐格 T2I Prompt Card" width="100%" />
      <strong>逐格 Prompt Pack</strong><br />
      导出可以直接交给任意 T2I 工具的分镜提示词。
    </td>
    <td width="50%" valign="top">
      <img src="./docs/images/quality-audit.png" alt="展示忠实度、连续性、视觉清晰度和 Prompt 分数的质量审核" width="100%" />
      <strong>质量审核</strong><br />
      零背景读者先复述最终可见故事，再评价忠实度、连续性和 Prompt 质量。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="./docs/images/ai-editor.png" alt="AI 编辑助手提出 Story Bible 结构化修改建议" width="100%" />
      <strong>AI 编辑助手</strong><br />
      用自然语言描述修改，审核结构化建议，确认后再应用。
    </td>
    <td width="50%" valign="top">
      <img src="./docs/images/model-settings.png" alt="本地模型 Provider 设置窗口" width="100%" />
      <strong>连接自己的模型</strong><br />
      接入 OpenAI Compatible Provider，配置只保存在本机。
    </td>
  </tr>
</table>

## 从碎片到分镜

真实的回忆很少一开始就是完整剧本：它可能跳跃、缺少细节，还会把事实和感受混在一起。叙格先把这些层次分开，再逐步转化为画面：

```text
散乱文字              碎片 · 跳跃 · 缺失信息
   ↓
故事事实              人物 · 地点 · 时间线 · 锁定事实
   ↓
叙事主干              主角 · 目标 · 阻碍 · 因果 · 结果
   ↓
视觉蓝图              场景 · 转场 · 读者文字 · 镜头 · 连续性
   ↓
Prompt Pack           可交给任意图像模型的逐格 Prompt
```

- **不要求输入完美**：不需要先写成完整剧本。
- **先讲清楚，再讲漂亮**：先保住前提、因果链、人物身份、时间跳转和结局，再加入隐喻与视觉风格。
- **只审核读者看得到的内容**：冷读审核看不到原文、Story Bible 和隐藏制作备注；无法复述故事，就不能获得及格分。
- **创意程度可控**：可以忠于原文、漫画化改编，也可以走艺术创作路线。
- **作者始终掌控过程**：每一步都能检查、编辑和重新生成，不接受黑箱结果。

- **中间成果全部可编辑**：Story Bible、改编方案、分镜和 Prompt Card 均可修改。
- **按依赖关系重新生成**：修改上游内容后，只让受影响的后续阶段失效并重新生成。
- **AI 编辑助手**：用自然语言描述要求，先查看修改摘要和字段差异，确认后再应用。
- **创作来源清晰**：区分原文事实、合理推断和创意新增。
- **刷新后继续创作**：生成和编辑过的项目会自动保存到本机作品存档。
- **中英文界面切换**：界面可随时切换，不会改写已有的故事内容与中间成果。

## 产品工作流

```text
原始文本
   ↓
Story Bible          人物 · 地点 · 时间线 · 锁定事实
   ↓
改编方案             叙事主干 · 因果链 · 场景与格数分配
   ↓
分镜与 Prompt        转场 · 读者文字 · 镜头 · 自足的 T2I Prompt
   ↓
质量审核             冷读理解 · 因果完整 · 时间清楚 · 忠实度 · Prompt 质量
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

三个平台共用同一套启动核心：首次运行自动安装依赖、构建当前版本，以不监听源码的稳定模式启动网页与 API，等待服务健康后打开浏览器。读取或修改源码不会重启由启动器管理的 API。日志和启动状态保存在已被 Git 忽略的 `.runtime/` 目录。

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

### 本机作品存档

每个完成的阶段以及确认应用的编辑都会自动保存。刷新浏览器或重启叙格后，点击顶部的**作品存档**即可继续或删除之前的创作。

作品只保存在本机的 `data/archive.json`，运行中任务的阶段 checkpoint 保存在 `data/jobs.json`。这些文件与 `data/settings.json`、`.env`、运行日志和生成输出均已被 Git 忽略，绝不能提交到仓库。本机数据没有加密，请勿在共享或不可信的电脑上处理敏感原文；如需备份，请先停止叙格，再复制整个 `data/` 目录。

### 长任务中断恢复

Story Bible、改编方案、分镜和审核每完成一步，叙格都会写入本机 checkpoint。运行中任务不会再被固定计时器删除。刷新浏览器后，页面会重新连接持久化任务；如果应用或电脑意外停止，下次启动会恢复最后一个已经完成的阶段，只需要重新生成被打断的当前阶段。

进程被终止后，正在传输中的单次模型响应无法继续，Provider 也可能已经对该请求计费。Checkpoint 能保护已经完成的阶段，但不能让一次远程模型请求从中间续传。

> `npm run dev` 会监听源码，并在服务端文件修改后主动重启开发 API。真实、耗时或付费的生成请使用各平台启动器或 `npm run app:start`，不要使用开发模式。

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
- 可在刷新或重启后继续创作的本机自动存档
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
npm run serve    # 构建并运行不监听源码的稳定版本
npm run build    # 类型检查并构建网页
npm test         # 运行流水线测试
```

```text
src/              React 工作台与导出工具
server/           流水线、提示词、Provider、任务、设置与本机存档
scripts/          跨平台启动核心
*.bat              Windows 启动器
*.command          macOS 双击启动器
*.sh               macOS/Linux Shell 启动器
```

欢迎参与贡献，请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与 [SECURITY.md](./SECURITY.md)。

本项目采用 [MIT License](./LICENSE)。
