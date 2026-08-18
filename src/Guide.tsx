import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CircleGauge,
  Code2,
  Download,
  Feather,
  FileJson,
  KeyRound,
  Layers3,
  LockKeyhole,
  PanelsTopLeft,
  Play,
  RefreshCw,
  Settings2,
  Sparkles,
  WandSparkles,
  X
} from "lucide-react";
import { useEffect } from "react";
import { LanguageSwitch, useI18n } from "./i18n";

interface GuideProps {
  onClose: () => void;
  onOpenSettings: () => void;
  onLoadSample: () => void;
}

const guideContent = {
  "zh-CN": {
    aria: "叙格使用说明",
    brandSubtitle: "创作指南",
    nav: ["快速开始", "工作流", "编辑机制", "开发者"],
    close: "返回工作台",
    heroTitle1: "从一段文字，到一套",
    heroTitle2: "可以被画出来",
    heroTitle3: "的叙事",
    heroDescription: "叙格不会直接替你“按一下就画完”。它先帮助你理解原文、决定如何改编、设计分镜并审核结果，最后交付一套可编辑、可追溯、可发送给 T2I 模型的 Prompt Pack。",
    sampleAction: "载入示例开始体验",
    apiAction: "配置模型 API",
    demoNote: "无需 API 也可使用演示模式",
    guidedNote: "推荐第一次选择逐步审阅",
    visualAria: "产品工作台示意图",
    visualTitle: "回乡 · 创作工作台",
    visualSource: "那年冬天，我回到了\n阔别已久的小城……",
    visualFact: "父亲没有离开故乡",
    visualAvatar: "父",
    visualTabs: ["Story Bible", "改编方案", "分镜"],
    visualCharacter: "父亲 · 关键人物",
    visualCharacterDescription: "寡言、克制，在旧车站等待。",
    visualEvent1: "抵达旧车站",
    visualEvent1Description: "主人公在雪夜回到故乡",
    visualEvent2: "认出父亲",
    visualEvent2Description: "通过旧围巾建立视觉线索",
    visualStructured: "结构化，而不是黑盒",
    visualStructuredDescription: "每一步都能看见和修改",
    quickTitle: "三分钟开始第一次创作",
    quickDescription: "不确定参数怎么选时，按照下面的默认路径即可。",
    quickCards: [
      { title: "确认模型", text: "直接使用演示模式，或在右上角 API 设置中填写兼容接口。", action: "打开 API 设置" },
      { title: "放入故事", text: "填写标题、粘贴原文。补充锁定事实，选择“漫画改编”。", action: "载入内置示例" },
      { title: "逐步生成", text: "选择“逐步审阅”，先生成 Story Bible，检查无误后继续。", action: "回到工作台" }
    ],
    beginner: "新手建议",
    beginnerText: "先用 500–3000 字的单一场景测试。长篇作品更适合按章节或场景分批处理，并保持锁定事实一致。",
    pipelineTitle: "原文不会直接跳进图像模型",
    pipelineDescription: "四个阶段把一次不可控的生成，拆成四次可以确认的创作决定。",
    input: "小说 · 回忆录 · 流水账 · 故事片段",
    workflow: [
      { title: "Story Bible", caption: "理解，不急着画", detail: "提取人物、地点、时间线、主题、歧义与不可改动的事实。" },
      { title: "改编方案", caption: "决定怎么讲", detail: "确定取舍、节奏、视觉策略，并标记内容来自原文、推断还是创作。" },
      { title: "分镜 Prompt", caption: "把故事变成镜头", detail: "为每一格设计叙事功能、动作、情绪、景别、构图和 T2I Prompt。" },
      { title: "质量审核", caption: "交付前检查", detail: "检查忠实度、连续性、视觉清晰度和 Prompt 的可执行性。" }
    ],
    editingTitle: "生成只是草稿，编辑才是工作流",
    editingDescription: "每个产物都是项目状态，不是一段生成后便无法改变的答案。",
    creatorSteps: [
      { title: "准备原文", text: "输入项目标题，粘贴小说、回忆录、流水账或故事片段。建议一次从一个完整场景或短章节开始。" },
      { title: "声明创作边界", text: "选择忠于原文、漫画改编或艺术创作；将结局、人物关系、年代等不能改变的内容加入锁定事实。" },
      { title: "选择工作方式", text: "第一次创作建议使用“逐步审阅”。确认每个阶段后再继续；熟悉流程后可切换为全自动。" },
      { title: "检查并编辑", text: "查看结构化产物。可以直接编辑完整 JSON，也可以让 AI 编辑助手提出改动，确认差异后再应用。" },
      { title: "重新生成下游", text: "上游内容发生改变时，依赖它的后续阶段会失效。按照页面提示重新生成即可，不必从头来过。" },
      { title: "导出并创作", text: "审核完成后导出 Markdown Prompt Pack 供人工阅读，或导出 JSON Project 交给 Agent、脚本与 T2I 工作流。" }
    ],
    assistant: "AI 编辑助手",
    assistantNote: "提议，不会直接覆盖",
    assistantRequest: "“让父亲更克制，但不要改变他一直留在故乡这个事实。”",
    assistantBefore: "沉默，难以接近",
    assistantAfter: "寡言，以整理围巾和避开目光表达情绪",
    assistantReason: "用可见动作替代抽象判断，同时保留原有人物关系。",
    assistantSkip: "暂不应用",
    assistantApply: "确认并应用",
    impact: "修改影响",
    impactText: "改编方案、分镜 Prompt 和审核将被标记为需要重新生成。",
    dependency: "依赖式重生成",
    dependencyNote: "修改越靠前，影响范围越大",
    dependencyStages: ["Story Bible", "改编方案", "分镜", "审核"],
    dependencyText: "修改 Story Bible 会使后三个阶段失效；修改改编方案只使分镜与审核失效；单独修改分镜只需重新审核。",
    provenance: [
      { label: "原文", title: "SOURCE", text: "可以在输入文本中找到直接依据。" },
      { label: "推断", title: "INFERENCE", text: "模型根据上下文作出的合理解释。" },
      { label: "创作", title: "CREATIVE", text: "为了漫画表达而新增或艺术化处理。" }
    ],
    developerTitle: "结构化产物也是开放接口",
    developerDescription: "前端只是一个客户端。阶段产物可以继续交给 Agent、T2I 适配器、ComfyUI 工作流或自定义排版工具。",
    apiTitle: "关键 API",
    objectsTitle: "核心数据对象",
    providerTitle: "Provider 约定",
    providerText: "文本模型使用 OpenAI Compatible 接口。演示模式不需要 Key；真实模式的设置保存在本机 data/settings.json。",
    contracts: [
      { title: "读取现有产物", text: "后续阶段必须把上游结构化对象作为上下文，而不是重新猜测。" },
      { title: "保留稳定 ID", text: "编辑角色、地点和分镜时尽量保留 ID，方便后续追踪和自动化。" },
      { title: "先提议再写入", text: "AI 编辑返回修改摘要和完整修订对象，最终应用权始终属于用户。" }
    ],
    finalTitle: "先用一个短故事，走完一次完整流程。",
    finalText: "理解工具最好的方式，是在 Story Bible 阶段亲手改掉一个细节，再观察它如何影响后面的改编和分镜。",
    finalAction: "载入《回乡》示例"
  },
  "en-US": {
    aria: "Xuge user guide",
    brandSubtitle: "Creation Guide",
    nav: ["Quick start", "Workflow", "Editing", "Developers"],
    close: "Back to workspace",
    heroTitle1: "From a piece of writing to",
    heroTitle2: "a narrative you can draw",
    heroTitle3: "",
    heroDescription: "Xuge does not try to draw everything in one click. It helps you understand the source, decide how to adapt it, design the storyboard, and audit the result before delivering an editable, traceable Prompt Pack for any T2I model.",
    sampleAction: "Explore with a sample",
    apiAction: "Configure model API",
    demoNote: "Demo mode works without an API",
    guidedNote: "Guided review is best for a first project",
    visualAria: "Product workspace illustration",
    visualTitle: "Homecoming · Creation workspace",
    visualSource: "That winter, I returned to\nthe town I had left behind…",
    visualFact: "The father never left his hometown",
    visualAvatar: "F",
    visualTabs: ["Story Bible", "Adaptation", "Storyboard"],
    visualCharacter: "Father · Key character",
    visualCharacterDescription: "Quiet and restrained, waiting at the old station.",
    visualEvent1: "Arrive at the old station",
    visualEvent1Description: "The protagonist returns on a snowy night",
    visualEvent2: "Recognize the father",
    visualEvent2Description: "An old scarf becomes a visual clue",
    visualStructured: "Structured, not a black box",
    visualStructuredDescription: "See and revise every decision",
    quickTitle: "Start your first project in three minutes",
    quickDescription: "Follow this default path when you are unsure which settings to choose.",
    quickCards: [
      { title: "Choose a model", text: "Use Demo mode immediately, or add a compatible endpoint in API settings.", action: "Open API settings" },
      { title: "Add your story", text: "Enter a title, paste the source, lock critical facts, and choose Comic adaptation.", action: "Load built-in sample" },
      { title: "Generate in stages", text: "Choose Guided review, generate the Story Bible first, and continue after checking it.", action: "Back to workspace" }
    ],
    beginner: "First-project tip",
    beginnerText: "Start with one 500–3,000 word scene. Process longer work by chapter or scene while keeping locked facts consistent.",
    pipelineTitle: "Your source does not jump straight into an image model",
    pipelineDescription: "Four stages turn one opaque generation into four reviewable creative decisions.",
    input: "Novel · memoir · journal · story scene",
    workflow: [
      { title: "Story Bible", caption: "Understand before drawing", detail: "Extract characters, locations, timeline, themes, ambiguities, and facts that cannot change." },
      { title: "Adaptation Plan", caption: "Decide how to tell it", detail: "Set pacing, selection, and visual strategy while marking source, inference, and creative additions." },
      { title: "Storyboard Prompts", caption: "Turn story into shots", detail: "Design purpose, action, emotion, shot size, composition, and a T2I prompt for every panel." },
      { title: "Quality Audit", caption: "Check before delivery", detail: "Review fidelity, continuity, visual clarity, and prompt executability." }
    ],
    editingTitle: "Generation creates a draft; editing creates the workflow",
    editingDescription: "Every artifact is editable project state, not an answer frozen after generation.",
    creatorSteps: [
      { title: "Prepare the source", text: "Enter a title and paste a novel, memoir, journal, or story scene. Start with one complete scene or short chapter." },
      { title: "Set creative boundaries", text: "Choose Faithful, Comic adaptation, or Artistic, then lock endings, relationships, time periods, and other immutable facts." },
      { title: "Choose a workflow", text: "Use Guided review for the first project. Approve each stage before continuing, then switch to Auto when the process is familiar." },
      { title: "Review and edit", text: "Inspect every structured artifact. Edit the full JSON directly or ask the AI assistant to propose a reviewable change." },
      { title: "Regenerate downstream", text: "When upstream work changes, dependent stages become outdated. Follow the prompt to regenerate only what is affected." },
      { title: "Export and create", text: "Export a Markdown Prompt Pack for people or a JSON Project for agents, scripts, and T2I workflows." }
    ],
    assistant: "AI editing assistant",
    assistantNote: "Proposes changes without overwriting",
    assistantRequest: "“Make the father more restrained without changing the fact that he stayed in his hometown.”",
    assistantBefore: "Silent and difficult to approach",
    assistantAfter: "Reserved; expresses emotion by adjusting his scarf and avoiding eye contact",
    assistantReason: "Replace abstract judgment with visible action while preserving the relationship.",
    assistantSkip: "Not now",
    assistantApply: "Approve and apply",
    impact: "Change impact",
    impactText: "The Adaptation Plan, storyboard prompts, and audit will be marked for regeneration.",
    dependency: "Dependency-aware regeneration",
    dependencyNote: "Earlier changes affect more stages",
    dependencyStages: ["Story Bible", "Adaptation Plan", "Storyboard", "Audit"],
    dependencyText: "Changing the Story Bible invalidates all three later stages. Changing the Adaptation Plan invalidates the storyboard and audit. Editing the storyboard only requires a new audit.",
    provenance: [
      { label: "Source", title: "SOURCE", text: "Directly supported by the input text." },
      { label: "Inference", title: "INFERENCE", text: "A reasonable interpretation based on context." },
      { label: "Creative", title: "CREATIVE", text: "Added or stylized for visual storytelling." }
    ],
    developerTitle: "Structured artifacts are an open interface",
    developerDescription: "The frontend is only one client. Artifacts can continue into agents, T2I adapters, ComfyUI workflows, or custom layout tools.",
    apiTitle: "Key APIs",
    objectsTitle: "Core data objects",
    providerTitle: "Provider contract",
    providerText: "Text models use an OpenAI-compatible interface. Demo mode needs no key; real-model settings are stored locally in data/settings.json.",
    contracts: [
      { title: "Read existing artifacts", text: "Every later stage must use upstream structured objects as context instead of guessing again." },
      { title: "Preserve stable IDs", text: "Keep character, location, and panel IDs when editing so later tracking and automation remain reliable." },
      { title: "Propose before writing", text: "AI editing returns a summary and complete revised object. The user always controls whether it is applied." }
    ],
    finalTitle: "Take one short story through the complete workflow.",
    finalText: "The best way to understand Xuge is to change one Story Bible detail yourself, then watch how it affects the adaptation and storyboard.",
    finalAction: "Load the Homecoming sample"
  }
} as const;

const workflowIcons = [BookOpen, Feather, PanelsTopLeft, CircleGauge];
const quickIcons = [Settings2, BookOpen, Play];
const sectionIds = ["quick-start", "workflow", "editing", "developers"];

export function Guide({ onClose, onOpenSettings, onLoadSample }: GuideProps) {
  const { locale, t } = useI18n();
  const copy = guideContent[locale];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const beginWithSample = () => { onLoadSample(); onClose(); };
  const configure = () => { onClose(); window.setTimeout(onOpenSettings, 0); };
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="guide-page" role="dialog" aria-modal="true" aria-label={copy.aria}>
      <header className="guide-topbar">
        <div className="brand"><div className="brand-mark"><Feather size={22} /></div><div><strong>{t("brand.name")}</strong><span>{copy.brandSubtitle}</span></div></div>
        <nav aria-label={copy.aria}>{copy.nav.map((item, index) => <button key={item} onClick={() => goTo(sectionIds[index])}>{item}</button>)}</nav>
        <div className="guide-topbar-actions"><LanguageSwitch /><button className="guide-close" onClick={onClose}><X size={18} />{copy.close}</button></div>
      </header>

      <main className="guide-scroll">
        <section className="guide-hero">
          <div className="guide-hero-copy">
            <span className="guide-kicker">NARRATIVE COMPILER · GETTING STARTED</span>
            <h1>{copy.heroTitle1}<br /><em>{copy.heroTitle2}</em>{copy.heroTitle3}</h1>
            <p>{copy.heroDescription}</p>
            <div className="guide-hero-actions"><button className="guide-primary" onClick={beginWithSample}><WandSparkles size={17} />{copy.sampleAction}</button><button className="guide-secondary" onClick={configure}><Settings2 size={17} />{copy.apiAction}</button></div>
            <div className="guide-hero-notes"><span><Check size={14} />{copy.demoNote}</span><span><Check size={14} />{copy.guidedNote}</span></div>
          </div>

          <div className="guide-product-visual" aria-label={copy.visualAria}>
            <div className="visual-window-bar"><i /><i /><i /><span>{copy.visualTitle}</span></div>
            <div className="visual-window-body">
              <div className="visual-source"><small>SOURCE MATERIAL</small><strong>{copy.visualSource.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</strong><div className="visual-lines"><i /><i /><i /><i /></div><span><LockKeyhole size={11} />{copy.visualFact}</span></div>
              <div className="visual-output"><div className="visual-tabs"><b>{copy.visualTabs[0]}</b><span>{copy.visualTabs[1]}</span><span>{copy.visualTabs[2]}</span></div><div className="visual-card"><div className="visual-avatar">{copy.visualAvatar}</div><div><strong>{copy.visualCharacter}</strong><p>{copy.visualCharacterDescription}</p></div></div><div className="visual-timeline"><i /><p><strong>{copy.visualEvent1}</strong><span>{copy.visualEvent1Description}</span></p></div><div className="visual-timeline"><i /><p><strong>{copy.visualEvent2}</strong><span>{copy.visualEvent2Description}</span></p></div></div>
            </div>
            <div className="visual-float"><Sparkles size={15} /><span><strong>{copy.visualStructured}</strong>{copy.visualStructuredDescription}</span></div>
          </div>
        </section>

        <section className="guide-section guide-quick" id="quick-start">
          <div className="guide-section-heading"><span>01 · QUICK START</span><h2>{copy.quickTitle}</h2><p>{copy.quickDescription}</p></div>
          <div className="quick-grid">{copy.quickCards.map((card, index) => { const Icon = quickIcons[index]; const action = index === 0 ? configure : index === 1 ? beginWithSample : onClose; return <article key={card.title}><span>{index + 1}</span><Icon size={21} /><h3>{card.title}</h3><p>{card.text}</p><button onClick={action}>{card.action} <ArrowRight size={14} /></button></article>; })}</div>
          <div className="guide-tip"><Sparkles size={17} /><p><strong>{copy.beginner}</strong>{copy.beginnerText}</p></div>
        </section>

        <section className="guide-section guide-workflow-section" id="workflow">
          <div className="guide-section-heading is-light"><span>02 · THE PIPELINE</span><h2>{copy.pipelineTitle}</h2><p>{copy.pipelineDescription}</p></div>
          <div className="workflow-input"><FileJson size={18} /><span><small>INPUT</small><strong>{copy.input}</strong></span></div><ArrowDown className="workflow-down" size={20} />
          <div className="guide-workflow">{copy.workflow.map((stage, index) => { const Icon = workflowIcons[index]; return <div className="workflow-unit" key={stage.title}><article><span className="workflow-number">{String(index + 1).padStart(2, "0")}</span><div className="workflow-icon"><Icon size={21} /></div><small>{stage.caption}</small><h3>{stage.title}</h3><p>{stage.detail}</p></article>{index < copy.workflow.length - 1 && <ArrowRight className="workflow-arrow" size={20} />}</div>; })}</div>
          <div className="workflow-output"><Download size={18} /><span><small>OUTPUT</small><strong>Markdown Prompt Pack + JSON Project</strong></span></div>
        </section>

        <section className="guide-section" id="editing">
          <div className="guide-section-heading"><span>03 · CREATE & REVISE</span><h2>{copy.editingTitle}</h2><p>{copy.editingDescription}</p></div>
          <div className="creator-layout"><div className="creator-steps">{copy.creatorSteps.map((step, index) => <article key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div><div className="editing-demo"><div className="editing-demo-head"><span><Bot size={15} />{copy.assistant}</span><i>{copy.assistantNote}</i></div><div className="editing-request">{copy.assistantRequest}</div><div className="editing-change"><small>characters[0].personality</small><del>{copy.assistantBefore}</del><strong>{copy.assistantAfter}</strong><p>{copy.assistantReason}</p></div><div className="editing-actions"><button>{copy.assistantSkip}</button><button><Check size={13} />{copy.assistantApply}</button></div><div className="editing-impact"><AlertTriangle size={16} /><span><strong>{copy.impact}</strong>{copy.impactText}</span></div></div></div>
          <div className="dependency-card"><div><RefreshCw size={20} /><span><strong>{copy.dependency}</strong><small>{copy.dependencyNote}</small></span></div><div className="dependency-flow">{copy.dependencyStages.map((stage, index) => <span key={stage}><b>{stage}</b>{index < copy.dependencyStages.length - 1 && <ArrowRight size={16} />}</span>)}</div><p>{copy.dependencyText}</p></div>
          <div className="provenance-guide">{copy.provenance.map((item, index) => <div key={item.title}><span className={`provenance provenance-${["source", "inference", "creative"][index]}`}>{item.label}</span><p><strong>{item.title}</strong>{item.text}</p></div>)}</div>
        </section>

        <section className="guide-section developer-section" id="developers">
          <div className="guide-section-heading is-light"><span>04 · FOR DEVELOPERS</span><h2>{copy.developerTitle}</h2><p>{copy.developerDescription}</p></div>
          <div className="developer-grid"><article><Code2 size={20} /><h3>{copy.apiTitle}</h3><code>GET /api/config</code><code>POST /api/pipeline/stage-jobs</code><code>GET /api/pipeline/jobs/:id</code><code>POST /api/assistant/propose</code></article><article><Layers3 size={20} /><h3>{copy.objectsTitle}</h3><code>PipelineRequest</code><code>StoryBible</code><code>AdaptationPlan</code><code>PromptCard[] · AuditReport</code></article><article><KeyRound size={20} /><h3>{copy.providerTitle}</h3><p>{copy.providerText}</p></article></div>
          <div className="developer-contract">{copy.contracts.map((contract, index) => <div key={contract.title}><span>{String(index + 1).padStart(2, "0")}</span><p><strong>{contract.title}</strong>{contract.text}</p></div>)}</div>
        </section>

        <section className="guide-final"><div><span>READY TO CREATE?</span><h2>{copy.finalTitle}</h2><p>{copy.finalText}</p></div><button onClick={beginWithSample}><Sparkles size={17} />{copy.finalAction}</button></section>
      </main>
    </div>
  );
}
