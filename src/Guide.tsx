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
  Edit3,
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

interface GuideProps {
  onClose: () => void;
  onOpenSettings: () => void;
  onLoadSample: () => void;
}

const workflow = [
  { number: "01", icon: BookOpen, title: "Story Bible", caption: "理解，不急着画", detail: "提取人物、地点、时间线、主题、歧义与不可改动的事实。" },
  { number: "02", icon: Feather, title: "改编方案", caption: "决定怎么讲", detail: "确定取舍、节奏、视觉策略，并标记内容来自原文、推断还是创作。" },
  { number: "03", icon: PanelsTopLeft, title: "分镜 Prompt", caption: "把故事变成镜头", detail: "为每一格设计叙事功能、动作、情绪、景别、构图和 T2I Prompt。" },
  { number: "04", icon: CircleGauge, title: "质量审核", caption: "交付前检查", detail: "检查忠实度、连续性、视觉清晰度和 Prompt 的可执行性。" }
];

const creatorSteps = [
  { title: "准备原文", text: "输入项目标题，粘贴小说、回忆录、流水账或故事片段。建议一次从一个完整场景或短章节开始。" },
  { title: "声明创作边界", text: "选择忠于原文、漫画改编或艺术创作；将结局、人物关系、年代等不能改变的内容加入锁定事实。" },
  { title: "选择工作方式", text: "第一次创作建议使用“逐步审阅”。确认每个阶段后再继续；熟悉流程后可切换为全自动。" },
  { title: "检查并编辑", text: "查看结构化产物。可以直接编辑完整 JSON，也可以让 AI 编辑助手提出改动，确认差异后再应用。" },
  { title: "重新生成下游", text: "上游内容发生改变时，依赖它的后续阶段会失效。按照页面提示重新生成即可，不必从头来过。" },
  { title: "导出并创作", text: "审核完成后导出 Markdown Prompt Pack 供人工阅读，或导出 JSON Project 交给 Agent、脚本与 T2I 工作流。" }
];

export function Guide({ onClose, onOpenSettings, onLoadSample }: GuideProps) {
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

  const beginWithSample = () => {
    onLoadSample();
    onClose();
  };

  const configure = () => {
    onClose();
    window.setTimeout(onOpenSettings, 0);
  };

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="guide-page" role="dialog" aria-modal="true" aria-label="叙格使用说明">
      <header className="guide-topbar">
        <div className="brand">
          <div className="brand-mark"><Feather size={22} /></div>
          <div><strong>叙格</strong><span>创作指南</span></div>
        </div>
        <nav aria-label="指南目录">
          <button onClick={() => goTo("quick-start")}>快速开始</button>
          <button onClick={() => goTo("workflow")}>工作流</button>
          <button onClick={() => goTo("editing")}>编辑机制</button>
          <button onClick={() => goTo("developers")}>开发者</button>
        </nav>
        <button className="guide-close" onClick={onClose}><X size={18} />返回工作台</button>
      </header>

      <main className="guide-scroll">
        <section className="guide-hero">
          <div className="guide-hero-copy">
            <span className="guide-kicker">NARRATIVE COMPILER · GETTING STARTED</span>
            <h1>从一段文字，到一套<br /><em>可以被画出来</em>的叙事</h1>
            <p>叙格不会直接替你“按一下就画完”。它先帮助你理解原文、决定如何改编、设计分镜并审核结果，最后交付一套可编辑、可追溯、可发送给 T2I 模型的 Prompt Pack。</p>
            <div className="guide-hero-actions">
              <button className="guide-primary" onClick={beginWithSample}><WandSparkles size={17} />载入示例开始体验</button>
              <button className="guide-secondary" onClick={configure}><Settings2 size={17} />配置模型 API</button>
            </div>
            <div className="guide-hero-notes">
              <span><Check size={14} />无需 API 也可使用演示模式</span>
              <span><Check size={14} />推荐第一次选择逐步审阅</span>
            </div>
          </div>

          <div className="guide-product-visual" aria-label="产品工作台示意图">
            <div className="visual-window-bar"><i /><i /><i /><span>回乡 · 创作工作台</span></div>
            <div className="visual-window-body">
              <div className="visual-source">
                <small>SOURCE MATERIAL</small>
                <strong>那年冬天，我回到了<br />阔别已久的小城……</strong>
                <div className="visual-lines"><i /><i /><i /><i /></div>
                <span><LockKeyhole size={11} />父亲没有离开故乡</span>
              </div>
              <div className="visual-output">
                <div className="visual-tabs"><b>Story Bible</b><span>改编方案</span><span>分镜</span></div>
                <div className="visual-card">
                  <div className="visual-avatar">父</div>
                  <div><strong>父亲 · 关键人物</strong><p>寡言、克制，在旧车站等待。</p></div>
                </div>
                <div className="visual-timeline"><i /><p><strong>抵达旧车站</strong><span>主人公在雪夜回到故乡</span></p></div>
                <div className="visual-timeline"><i /><p><strong>认出父亲</strong><span>通过旧围巾建立视觉线索</span></p></div>
              </div>
            </div>
            <div className="visual-float"><Sparkles size={15} /><span><strong>结构化，而不是黑盒</strong>每一步都能看见和修改</span></div>
          </div>
        </section>

        <section className="guide-section guide-quick" id="quick-start">
          <div className="guide-section-heading">
            <span>01 · QUICK START</span>
            <h2>三分钟开始第一次创作</h2>
            <p>不确定参数怎么选时，按照下面的默认路径即可。</p>
          </div>
          <div className="quick-grid">
            <article><span>1</span><Settings2 size={21} /><h3>确认模型</h3><p>直接使用演示模式，或在右上角 API 设置中填写兼容接口。</p><button onClick={configure}>打开 API 设置 <ArrowRight size={14} /></button></article>
            <article><span>2</span><BookOpen size={21} /><h3>放入故事</h3><p>填写标题、粘贴原文。补充锁定事实，选择“漫画改编”。</p><button onClick={beginWithSample}>载入内置示例 <ArrowRight size={14} /></button></article>
            <article><span>3</span><Play size={21} /><h3>逐步生成</h3><p>选择“逐步审阅”，先生成 Story Bible，检查无误后继续。</p><button onClick={onClose}>回到工作台 <ArrowRight size={14} /></button></article>
          </div>
          <div className="guide-tip"><Sparkles size={17} /><p><strong>新手建议</strong>先用 500–3000 字的单一场景测试。长篇作品更适合按章节或场景分批处理，并保持锁定事实一致。</p></div>
        </section>

        <section className="guide-section guide-workflow-section" id="workflow">
          <div className="guide-section-heading is-light">
            <span>02 · THE PIPELINE</span>
            <h2>原文不会直接跳进图像模型</h2>
            <p>四个阶段把一次不可控的生成，拆成四次可以确认的创作决定。</p>
          </div>
          <div className="workflow-input"><FileJson size={18} /><span><small>INPUT</small><strong>小说 · 回忆录 · 流水账 · 故事片段</strong></span></div>
          <ArrowDown className="workflow-down" size={20} />
          <div className="guide-workflow">
            {workflow.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div className="workflow-unit" key={stage.number}>
                  <article>
                    <span className="workflow-number">{stage.number}</span>
                    <div className="workflow-icon"><Icon size={21} /></div>
                    <small>{stage.caption}</small>
                    <h3>{stage.title}</h3>
                    <p>{stage.detail}</p>
                  </article>
                  {index < workflow.length - 1 && <ArrowRight className="workflow-arrow" size={20} />}
                </div>
              );
            })}
          </div>
          <div className="workflow-output"><Download size={18} /><span><small>OUTPUT</small><strong>Markdown Prompt Pack + JSON Project</strong></span></div>
        </section>

        <section className="guide-section" id="editing">
          <div className="guide-section-heading">
            <span>03 · CREATE & REVISE</span>
            <h2>生成只是草稿，编辑才是工作流</h2>
            <p>每个产物都是项目状态，不是一段生成后便无法改变的答案。</p>
          </div>

          <div className="creator-layout">
            <div className="creator-steps">
              {creatorSteps.map((step, index) => (
                <article key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>
              ))}
            </div>
            <div className="editing-demo">
              <div className="editing-demo-head"><span><Bot size={15} />AI 编辑助手</span><i>提议，不会直接覆盖</i></div>
              <div className="editing-request">“让父亲更克制，但不要改变他一直留在故乡这个事实。”</div>
              <div className="editing-change">
                <small>characters[0].personality</small>
                <del>沉默，难以接近</del>
                <strong>寡言，以整理围巾和避开目光表达情绪</strong>
                <p>用可见动作替代抽象判断，同时保留原有人物关系。</p>
              </div>
              <div className="editing-actions"><button>暂不应用</button><button><Check size={13} />确认并应用</button></div>
              <div className="editing-impact"><AlertTriangle size={16} /><span><strong>修改影响</strong>改编方案、分镜 Prompt 和审核将被标记为需要重新生成。</span></div>
            </div>
          </div>

          <div className="dependency-card">
            <div><RefreshCw size={20} /><span><strong>依赖式重生成</strong><small>修改越靠前，影响范围越大</small></span></div>
            <div className="dependency-flow"><b>Story Bible</b><ArrowRight size={16} /><b>改编方案</b><ArrowRight size={16} /><b>分镜</b><ArrowRight size={16} /><b>审核</b></div>
            <p>修改 Story Bible 会使后三个阶段失效；修改改编方案只使分镜与审核失效；单独修改分镜只需重新审核。</p>
          </div>

          <div className="provenance-guide">
            <div><span className="provenance provenance-source">原文</span><p><strong>SOURCE</strong>可以在输入文本中找到直接依据。</p></div>
            <div><span className="provenance provenance-inference">推断</span><p><strong>INFERENCE</strong>模型根据上下文作出的合理解释。</p></div>
            <div><span className="provenance provenance-creative">创作</span><p><strong>CREATIVE</strong>为了漫画表达而新增或艺术化处理。</p></div>
          </div>
        </section>

        <section className="guide-section developer-section" id="developers">
          <div className="guide-section-heading is-light">
            <span>04 · FOR DEVELOPERS</span>
            <h2>结构化产物也是开放接口</h2>
            <p>前端只是一个客户端。阶段产物可以继续交给 Agent、T2I 适配器、ComfyUI 工作流或自定义排版工具。</p>
          </div>
          <div className="developer-grid">
            <article>
              <Code2 size={20} /><h3>关键 API</h3>
              <code>GET /api/config</code>
              <code>POST /api/pipeline/stage-jobs</code>
              <code>GET /api/pipeline/jobs/:id</code>
              <code>POST /api/assistant/propose</code>
            </article>
            <article>
              <Layers3 size={20} /><h3>核心数据对象</h3>
              <code>PipelineRequest</code>
              <code>StoryBible</code>
              <code>AdaptationPlan</code>
              <code>PromptCard[] · AuditReport</code>
            </article>
            <article>
              <KeyRound size={20} /><h3>Provider 约定</h3>
              <p>文本模型使用 OpenAI Compatible 接口。演示模式不需要 Key；真实模式的设置保存在本机 <code>data/settings.json</code>。</p>
            </article>
          </div>
          <div className="developer-contract">
            <div><span>01</span><p><strong>读取现有产物</strong>后续阶段必须把上游结构化对象作为上下文，而不是重新猜测。</p></div>
            <div><span>02</span><p><strong>保留稳定 ID</strong>编辑角色、地点和分镜时尽量保留 ID，方便后续追踪和自动化。</p></div>
            <div><span>03</span><p><strong>先提议再写入</strong>AI 编辑返回修改摘要和完整修订对象，最终应用权始终属于用户。</p></div>
          </div>
        </section>

        <section className="guide-final">
          <div><span>READY TO CREATE?</span><h2>先用一个短故事，走完一次完整流程。</h2><p>理解工具最好的方式，是在 Story Bible 阶段亲手改掉一个细节，再观察它如何影响后面的改编和分镜。</p></div>
          <button onClick={beginWithSample}><Sparkles size={17} />载入《回乡》示例</button>
        </section>
      </main>
    </div>
  );
}
