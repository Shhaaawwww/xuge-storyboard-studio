import { AlertTriangle, ArrowRight, BookOpen, Bot, Check, ChevronDown, CircleGauge, CircleHelp, Clock3, Download, Edit3, Feather, FileJson, FileText, KeyRound, LockKeyhole, PanelsTopLeft, Play, Plus, RefreshCw, RotateCcw, Save, Settings2, Sparkles, WandSparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AiEditAssistant, ArtifactEditor, MetricRing, PanelCard, ProvenanceBadge } from "./components";
import { exportJson, exportMarkdown } from "./export";
import { Guide } from "./Guide";
import { normalizePipelineResult } from "./normalize";
import { sampleLockedFacts, sampleStory } from "./sample";
import type { AdaptationPlan, AiEditProposal, ArtifactStage, CreativeMode, PipelineArtifacts, PipelineJob, PipelineRequest, PipelineResult, PipelineStage, PromptCard, ProviderConfig, StoryBible } from "./types";

type Tab = "bible" | "adaptation" | "storyboard" | "audit";

const modes: Array<{ id: CreativeMode; name: string; description: string }> = [
  { id: "faithful", name: "忠于原文", description: "保持事件、因果与顺序" },
  { id: "adapted", name: "漫画改编", description: "优化节奏与视觉表达" },
  { id: "artistic", name: "艺术创作", description: "允许隐喻与非线性叙事" }
];

const initialForm: PipelineRequest = {
  title: "",
  sourceText: "",
  mode: "adapted",
  panelCount: 8,
  style: "低饱和手绘水彩连环画，克制的电影感构图，纸张纹理",
  lockedFacts: []
};

const initialSettings = {
  provider: "demo" as const,
  baseUrl: "http://localhost:11434/v1",
  apiKey: "",
  selectedModel: "qwen3:8b"
};

const generationStages: Array<{
  id: Exclude<PipelineStage, "complete">;
  label: string;
  description: string;
}> = [
  { id: "bible", label: "理解原文", description: "人物、地点、时间线与锁定事实" },
  { id: "adaptation", label: "叙事改编", description: "节奏、取舍与艺术化表达" },
  { id: "storyboard", label: "设计分镜", description: "镜头、构图与逐格 T2I Prompt" },
  { id: "audit", label: "质量审核", description: "忠实度、连续性与可执行性" }
];

const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const formatElapsed = (seconds: number) => {
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
};

const emptyBible: StoryBible = { logline: "", themes: [], narrativeVoice: "", characters: [], locations: [], timeline: [], lockedFacts: [], ambiguities: [] };
const emptyAdaptation: AdaptationPlan = { approach: "", pacing: "", visualStrategy: "", decisions: [] };
const emptyAudit: PipelineResult["audit"] = {
  score: 0,
  summary: "",
  issues: [],
  checks: { faithfulness: 0, continuity: 0, visualClarity: 0, promptQuality: 0 }
};

const stageLabel: Record<ArtifactStage, string> = {
  bible: "Story Bible",
  adaptation: "改编方案",
  storyboard: "分镜 Prompt",
  audit: "质量审核"
};

function App() {
  const [form, setForm] = useState<PipelineRequest>(initialForm);
  const [factDraft, setFactDraft] = useState("");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [workflowMode, setWorkflowMode] = useState<"auto" | "guided">("guided");
  const [completedStages, setCompletedStages] = useState<ArtifactStage[]>([]);
  const [revisionNotice, setRevisionNotice] = useState("");
  const [editingArtifact, setEditingArtifact] = useState<AiEditProposal["target"] | null>(null);
  const [aiTarget, setAiTarget] = useState<AiEditProposal["target"] | null>(null);
  const [provider, setProvider] = useState<ProviderConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<Omit<ProviderConfig, "model" | "ready">>(initialSettings);
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [tab, setTab] = useState<Tab>("bible");
  const [loading, setLoading] = useState(false);
  const [pipelineJob, setPipelineJob] = useState<PipelineJob | null>(null);
  const [displayPercent, setDisplayPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    fetch("/api/config").then((response) => response.json()).then((config: ProviderConfig) => {
      setProvider(config);
      setSettingsDraft({ provider: config.provider, baseUrl: config.baseUrl, apiKey: config.apiKey, selectedModel: config.selectedModel });
    }).catch(() => setProvider(null));
  }, []);

  useEffect(() => {
    if (!loading) return;
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      const target = pipelineJob?.progress.percent ?? 2;
      const stage = pipelineJob?.progress.stage ?? "bible";
      const ceiling: Record<PipelineStage, number> = {
        bible: 24,
        adaptation: 48,
        storyboard: 75,
        audit: 96,
        complete: 100
      };
      setDisplayPercent((current) => {
        if (current < target) return Math.min(target, current + 1);
        if (tick % 6 === 0 && current < ceiling[stage]) return current + 1;
        return current;
      });
      if (pipelineJob?.startedAt) {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(pipelineJob.startedAt).getTime()) / 1000)));
      }
    }, 220);
    return () => window.clearInterval(timer);
  }, [loading, pipelineJob?.progress.percent, pipelineJob?.progress.stage, pipelineJob?.startedAt]);

  const characterCount = form.sourceText.length;
  const canRun = form.title.trim().length > 0 && form.sourceText.trim().length >= 20 && !loading;

  const loadSample = () => {
    setForm({ ...initialForm, title: "回乡", sourceText: sampleStory, lockedFacts: sampleLockedFacts });
    setResult(null);
    setCompletedStages([]);
    setRevisionNotice("");
    setError("");
  };

  const addFact = () => {
    const value = factDraft.trim();
    if (value && !form.lockedFacts.includes(value)) setForm({ ...form, lockedFacts: [...form.lockedFacts, value] });
    setFactDraft("");
  };

  const saveProviderSettings = async () => {
    setSavingSettings(true);
    setSettingsError("");
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settingsDraft.provider,
          baseUrl: settingsDraft.baseUrl,
          apiKey: settingsDraft.apiKey,
          model: settingsDraft.selectedModel
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      setProvider(data);
      setSettingsDraft({ provider: data.provider, baseUrl: data.baseUrl, apiKey: data.apiKey, selectedModel: data.selectedModel });
      setSettingsOpen(false);
    } catch (reason) {
      setSettingsError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSavingSettings(false);
    }
  };

  const runStages = async (startStage: ArtifactStage, endStage: ArtifactStage, reset = false) => {
    if (loading) return;
    const baseResult = reset ? null : result;
    const request = baseResult?.request || form;
    setLoading(true);
    setError("");
    if (reset) {
      setResult(null);
      setCompletedStages([]);
      setTab("bible");
    }
    setDisplayPercent(1);
    setElapsedSeconds(0);
    setPipelineJob(null);
    try {
      const artifacts: PipelineArtifacts = {};
      if (baseResult && completedStages.includes("bible")) artifacts.storyBible = baseResult.storyBible;
      if (baseResult && completedStages.includes("adaptation")) artifacts.adaptation = baseResult.adaptation;
      if (baseResult && completedStages.includes("storyboard")) artifacts.panels = baseResult.panels;
      if (baseResult && completedStages.includes("audit")) artifacts.audit = baseResult.audit;

      const response = await fetch("/api/pipeline/stage-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, startStage, endStage, artifacts })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "创建生成任务失败");

      while (true) {
        await delay(550);
        const jobResponse = await fetch(`/api/pipeline/jobs/${data.jobId}`);
        const job = await jobResponse.json() as PipelineJob & { error?: string };
        if (!jobResponse.ok) throw new Error(job.error || "读取任务进度失败");
        setPipelineJob(job);

        if (job.status === "failed") throw new Error(job.error || "生成失败");
        if (job.status === "completed") {
          if (!job.stageResult) throw new Error("任务完成但没有返回阶段产物");
          setDisplayPercent(100);
          await delay(450);
          const stageArtifacts = job.stageResult.artifacts;
          const merged = normalizePipelineResult({
            projectId: baseResult?.projectId || crypto.randomUUID(),
            createdAt: baseResult?.createdAt || new Date().toISOString(),
            request: job.stageResult.request,
            storyBible: stageArtifacts.storyBible || baseResult?.storyBible || emptyBible,
            adaptation: stageArtifacts.adaptation || baseResult?.adaptation || emptyAdaptation,
            panels: stageArtifacts.panels || baseResult?.panels || [],
            audit: stageArtifacts.audit || baseResult?.audit || emptyAudit,
            provider: job.stageResult.provider
          });
          setResult(merged);
          setCompletedStages(job.stageResult.completedStages);
          setRevisionNotice("");
          setTab(endStage === "storyboard" ? "storyboard" : endStage);
          break;
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const generate = () => {
    if (!canRun) return;
    void runStages("bible", workflowMode === "guided" ? "bible" : "audit", true);
  };

  const applyArtifact = (target: AiEditProposal["target"], artifact: AiEditProposal["revisedArtifact"] | unknown) => {
    if (!result) return;
    if (target === "bible") {
      setResult(normalizePipelineResult({ ...result, storyBible: artifact as StoryBible, adaptation: emptyAdaptation, panels: [], audit: emptyAudit }));
      setCompletedStages(["bible"]);
      setRevisionNotice("Story Bible 已修改；改编方案、分镜和审核结果已经失效，需要根据新版本重新生成。");
      setTab("bible");
    } else if (target === "adaptation") {
      setResult(normalizePipelineResult({ ...result, adaptation: artifact as AdaptationPlan, panels: [], audit: emptyAudit }));
      setCompletedStages(["bible", "adaptation"]);
      setRevisionNotice("改编方案已修改；分镜和审核结果已经失效，需要根据新方案重新生成。");
      setTab("adaptation");
    } else {
      setResult(normalizePipelineResult({ ...result, panels: artifact as PromptCard[], audit: emptyAudit }));
      setCompletedStages(["bible", "adaptation", "storyboard"]);
      setRevisionNotice("分镜已经修改；旧审核结果已经失效，需要重新审核。");
      setTab("storyboard");
    }
  };

  const updatePanel = (panel: PipelineResult["panels"][number]) => {
    if (!result) return;
    applyArtifact("storyboard", result.panels.map((item) => item.id === panel.id ? panel : item));
  };

  const nextStage = generationStages.find((stage) => !completedStages.includes(stage.id))?.id;
  const continuePipeline = () => {
    if (!nextStage) return;
    void runStages(nextStage, workflowMode === "guided" ? nextStage : "audit");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Feather size={22} /></div>
          <div><strong>叙格</strong><span>Storyboard Studio</span></div>
        </div>
        <div className="topbar-actions">
          <div className={`provider-status ${provider?.ready ? "is-ready" : ""}`}>
            <span className="status-dot" />
            {provider ? provider.model : "连接 API…"}
          </div>
          <button className="topbar-guide-button" onClick={() => setGuideOpen(true)}><CircleHelp size={16} />使用说明</button>
          <button className="icon-button topbar-icon" aria-label="API 设置" title="API 设置" onClick={() => setSettingsOpen(true)}><Settings2 size={17} /></button>
          {result && completedStages.includes("audit") && (
            <div className="export-wrap">
              <button className="secondary-button" onClick={() => setExportOpen(!exportOpen)}><Download size={16} />导出<ChevronDown size={14} /></button>
              {exportOpen && (
                <div className="export-menu">
                  <button onClick={() => exportMarkdown(result)}><FileText size={17} /><span><strong>Markdown Prompt Pack</strong><small>适合阅读和复制</small></span></button>
                  <button onClick={() => exportJson(result)}><FileJson size={17} /><span><strong>JSON Project</strong><small>适合 Agent 和自动化</small></span></button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {guideOpen && (
        <Guide
          onClose={() => setGuideOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
          onLoadSample={loadSample}
        />
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal settings-modal" role="dialog" aria-modal="true" aria-label="API 设置">
            <div className="modal-header">
              <div><span className="eyebrow">MODEL PROVIDER</span><h2>API 设置</h2></div>
              <button className="icon-button" aria-label="关闭设置" onClick={() => setSettingsOpen(false)}><X size={19} /></button>
            </div>

            <div className="settings-provider-grid">
              <button className={settingsDraft.provider === "demo" ? "settings-provider active" : "settings-provider"} onClick={() => setSettingsDraft({ ...settingsDraft, provider: "demo" })}>
                <span className="radio-mark">{settingsDraft.provider === "demo" && <Check size={12} />}</span>
                <strong>演示模式</strong><small>无需 API，使用本地规则生成</small>
              </button>
              <button className={settingsDraft.provider === "openai-compatible" ? "settings-provider active" : "settings-provider"} onClick={() => setSettingsDraft({ ...settingsDraft, provider: "openai-compatible" })}>
                <span className="radio-mark">{settingsDraft.provider === "openai-compatible" && <Check size={12} />}</span>
                <strong>OpenAI Compatible</strong><small>Ollama、vLLM 或云端 API</small>
              </button>
            </div>

            <div className={settingsDraft.provider === "demo" ? "settings-fields is-disabled" : "settings-fields"}>
              <label>Base URL<input disabled={settingsDraft.provider === "demo"} value={settingsDraft.baseUrl} onChange={(event) => setSettingsDraft({ ...settingsDraft, baseUrl: event.target.value })} placeholder="https://example.com/v1" /></label>
              <label>模型名称<input disabled={settingsDraft.provider === "demo"} value={settingsDraft.selectedModel} onChange={(event) => setSettingsDraft({ ...settingsDraft, selectedModel: event.target.value })} placeholder="model-name" /></label>
              <label>API Key<input disabled={settingsDraft.provider === "demo"} value={settingsDraft.apiKey} onChange={(event) => setSettingsDraft({ ...settingsDraft, apiKey: event.target.value })} placeholder="sk-...（本地 Ollama 可以留空）" /></label>
            </div>

            <div className="plaintext-warning"><KeyRound size={17} /><p><strong>本地明文存储</strong><span>设置将直接写入 <code>data/settings.json</code>。该文件不会提交到 Git，但本机上能够读取项目文件的人可以看到 API Key。</span></p></div>
            {settingsError && <div className="error-banner"><AlertTriangle size={17} />{settingsError}</div>}
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setSettingsOpen(false)}>取消</button>
              <button className="primary-button" disabled={savingSettings} onClick={saveProviderSettings}><Save size={15} />{savingSettings ? "保存中…" : "明文保存"}</button>
            </div>
          </div>
        </div>
      )}

      <main className="workspace">
        <aside className="editor-pane">
          <div className="editor-heading">
            <div><span className="eyebrow">SOURCE MATERIAL</span><h1>把文字变成<br />可以被画出来的故事</h1></div>
            <button className="text-button" onClick={loadSample}><WandSparkles size={15} />载入示例</button>
          </div>

          <label className="field-label">项目标题<input placeholder="例如：回乡" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>

          <label className="field-label source-field">
            <span>原始文本 <small>{characterCount.toLocaleString()} / 50,000</small></span>
            <textarea placeholder="粘贴小说、回忆录或一段故事……" value={form.sourceText} onChange={(event) => setForm({ ...form, sourceText: event.target.value })} />
          </label>

          <section className="control-section">
            <div className="section-label"><Sparkles size={15} />改编模式</div>
            <div className="mode-grid">
              {modes.map((mode) => (
                <button key={mode.id} className={form.mode === mode.id ? "mode-card active" : "mode-card"} onClick={() => setForm({ ...form, mode: mode.id })}>
                  <span className="radio-mark">{form.mode === mode.id && <Check size={12} />}</span>
                  <strong>{mode.name}</strong><small>{mode.description}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="control-section">
            <div className="section-label"><RefreshCw size={15} />工作流</div>
            <div className="workflow-mode-grid">
              <button className={workflowMode === "guided" ? "workflow-mode active" : "workflow-mode"} onClick={() => setWorkflowMode("guided")}>
                <span className="radio-mark">{workflowMode === "guided" && <Check size={12} />}</span>
                <strong>逐步审阅</strong><small>每一步停下来检查、编辑、确认</small>
              </button>
              <button className={workflowMode === "auto" ? "workflow-mode active" : "workflow-mode"} onClick={() => setWorkflowMode("auto")}>
                <span className="radio-mark">{workflowMode === "auto" && <Check size={12} />}</span>
                <strong>全自动</strong><small>连续完成四阶段，之后仍可回改</small>
              </button>
            </div>
          </section>

          <div className="two-columns">
            <label className="field-label">目标格数<div className="range-row"><input type="range" min="4" max="24" value={form.panelCount} onChange={(event) => setForm({ ...form, panelCount: Number(event.target.value) })} /><strong>{form.panelCount}</strong></div></label>
            <label className="field-label">视觉风格<input value={form.style} onChange={(event) => setForm({ ...form, style: event.target.value })} /></label>
          </div>

          <section className="control-section">
            <div className="section-label"><LockKeyhole size={15} />锁定事实 <span>{form.lockedFacts.length}</span></div>
            <div className="fact-input"><input placeholder="输入不可修改的事实" value={factDraft} onChange={(event) => setFactDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFact(); } }} /><button onClick={addFact}><Plus size={16} /></button></div>
            <div className="fact-list">
              {form.lockedFacts.map((fact) => <span key={fact}>{fact}<button onClick={() => setForm({ ...form, lockedFacts: form.lockedFacts.filter((item) => item !== fact) })}><X size={13} /></button></span>)}
              {!form.lockedFacts.length && <p>锁定结局、人物关系或时间等关键事实</p>}
            </div>
          </section>

          {error && <div className="error-banner"><AlertTriangle size={17} />{error}</div>}

          <button className="generate-button" disabled={!canRun} onClick={generate}>
            {loading ? <span className="spinner" /> : <Play size={18} fill="currentColor" />}
            {loading ? `正在编译 · ${displayPercent}%` : workflowMode === "guided" ? "生成 Story Bible" : "生成完整 Prompt Pack"}
          </button>
        </aside>

        <section className="result-pane">
          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-illustration">
                <div className="paper paper-back" />
                <div className="paper paper-front"><PanelsTopLeft size={44} /><span /><span /><span /></div>
              </div>
              <span className="eyebrow">NARRATIVE COMPILER</span>
              <h2>从 Story Bible 开始，逐步建立视觉叙事</h2>
              <p>每个阶段都可以停下来检查、手动编辑或让 AI 提议修改；上游改变后，下游会明确失效并支持定向重生成。</p>
              <div className="feature-row">
                <span><BookOpen size={16} />原文可追溯</span>
                <span><Settings2 size={16} />结构化分镜</span>
                <span><CircleGauge size={16} />自动审核</span>
              </div>
            </div>
          )}

          {loading && (
            <div className="loading-state progress-state">
              <div className="progress-heading">
                <div className="progress-orb">
                  <Sparkles size={23} />
                  <span>{displayPercent}<small>%</small></span>
                </div>
                <div>
                  <span className="eyebrow">NARRATIVE PIPELINE</span>
                  <h2>正在编译《{form.title}》</h2>
                  <p>{pipelineJob?.progress.message || "正在创建任务并连接模型"}</p>
                </div>
              </div>

              <div className="progress-track" aria-label={`生成进度 ${displayPercent}%`}>
                <span style={{ width: `${displayPercent}%` }} />
              </div>
              <div className="progress-meta">
                <span><Clock3 size={13} />已用时 {formatElapsed(elapsedSeconds)}</span>
                <span>{pipelineJob?.provider || provider?.model || "准备 Provider"}</span>
              </div>

              <div className="generation-step-list">
                {generationStages.map((stage, index) => {
                  const activeId = pipelineJob?.progress.stage || "bible";
                  const activeIndex = activeId === "complete"
                    ? generationStages.length
                    : generationStages.findIndex((item) => item.id === activeId);
                  const state = index < activeIndex || activeId === "complete"
                    ? "completed"
                    : index === activeIndex
                      ? "active"
                      : "pending";
                  const Icon = stage.id === "bible" ? BookOpen : stage.id === "adaptation" ? Feather : stage.id === "storyboard" ? PanelsTopLeft : CircleGauge;
                  return (
                    <article className={`generation-step ${state}`} key={stage.id} style={{ animationDelay: `${index * 80}ms` }}>
                      <div className="step-icon">{state === "completed" ? <Check size={17} /> : <Icon size={17} />}</div>
                      <div><strong>{stage.label}</strong><p>{stage.description}</p></div>
                      <span className="step-status">{state === "completed" ? "完成" : state === "active" ? "进行中" : "等待"}</span>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="result-header">
                <div><span className="eyebrow">{completedStages.includes("audit") ? `PROMPT PACK · ${result.panels.length} PANELS` : `WORK IN PROGRESS · ${completedStages.length}/4 STAGES`}</span><h2>{result.request.title}</h2><p>{result.storyBible.logline}</p></div>
                <button className="icon-button" title="重新开始" onClick={() => { setResult(null); setCompletedStages([]); setRevisionNotice(""); setForm(initialForm); }}><RotateCcw size={18} /></button>
              </div>

              <nav className="tabs">
                <button className={tab === "bible" ? "active" : ""} onClick={() => setTab("bible")}><BookOpen size={16} />Story Bible</button>
                <button disabled={!completedStages.includes("adaptation")} className={tab === "adaptation" ? "active" : ""} onClick={() => setTab("adaptation")}><Feather size={16} />改编方案</button>
                <button disabled={!completedStages.includes("storyboard")} className={tab === "storyboard" ? "active" : ""} onClick={() => setTab("storyboard")}><PanelsTopLeft size={16} />分镜 Prompt</button>
                <button disabled={!completedStages.includes("audit")} className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}><CircleGauge size={16} />审核 {completedStages.includes("audit") && <span>{result.audit.issues.length}</span>}</button>
              </nav>

              <div className="stage-status-strip">
                {generationStages.map((stage, index) => {
                  const done = completedStages.includes(stage.id);
                  const ready = nextStage === stage.id;
                  return <div key={stage.id} className={done ? "done" : ready ? "ready" : "locked"}><span>{done ? <Check size={13} /> : index + 1}</span><strong>{stage.label}</strong><small>{done ? "可编辑" : ready ? "等待确认" : "依赖上游"}</small></div>;
                })}
              </div>

              {nextStage && (
                <section className={revisionNotice ? "revision-banner is-warning" : "revision-banner"}>
                  <div>{revisionNotice ? <AlertTriangle size={19} /> : <Check size={19} />}<p><strong>{revisionNotice ? "下游需要同步更新" : `${stageLabel[completedStages[completedStages.length - 1] || "bible"]} 已生成`}</strong><span>{revisionNotice || `请检查当前产物；确认无误后再生成 ${stageLabel[nextStage]}。`}</span></p></div>
                  <button className="primary-button" disabled={loading} onClick={continuePipeline}>{workflowMode === "guided" ? `确认并生成 ${stageLabel[nextStage]}` : `重新生成 ${stageLabel[nextStage]} 及后续`}<ArrowRight size={15} /></button>
                </section>
              )}

              <div className="tab-content">
                {tab === "bible" && (
                  <>
                    <div className="stage-toolbar"><div><span className="stage-kicker">01 · CANON LAYER</span><strong>Story Bible 是后续所有阶段的事实基础</strong><small>修改后将重新计算改编、分镜和审核。</small></div><div><button className="secondary-button" onClick={() => setAiTarget("bible")}><Bot size={15} />AI 编辑助手</button><button className="secondary-button" onClick={() => setEditingArtifact("bible")}><Edit3 size={15} />手动编辑</button></div></div>
                    <div className="bible-layout">
                      <section className="content-card themes-card"><span className="eyebrow">核心主题</span><div className="theme-list">{result.storyBible.themes.map((theme) => <span key={theme}>{theme}</span>)}</div><p>叙事视角：{result.storyBible.narrativeVoice}</p></section>
                      <section className="content-card"><div className="card-heading"><h3>人物</h3><span>{result.storyBible.characters.length}</span></div><div className="character-list">{result.storyBible.characters.map((character) => <article key={character.id}><div className="avatar">{character.name.slice(0, 1)}</div><div><h4>{character.name}<small>{character.role}</small></h4><p>{character.appearance.join("；")}</p><div className="tags">{character.visualMotifs.map((motif) => <span key={motif}>{motif}</span>)}</div></div></article>)}</div></section>
                      <section className="content-card"><div className="card-heading"><h3>事件时间线</h3><span>{result.storyBible.timeline.length}</span></div><div className="timeline">{result.storyBible.timeline.map((event, index) => <article key={event.id}><span>{index + 1}</span><div><strong>{event.summary}</strong><p>{event.sourceExcerpt}</p></div></article>)}</div></section>
                      <section className="content-card"><div className="card-heading"><h3>锁定与待确认</h3></div><div className="rule-list">{result.storyBible.lockedFacts.map((fact) => <p key={fact}><LockKeyhole size={14} />{fact}</p>)}{result.storyBible.ambiguities.map((item) => <p className="ambiguity" key={item}><AlertTriangle size={14} />{item}</p>)}</div></section>
                    </div>
                  </>
                )}

                {tab === "adaptation" && (
                  <>
                    <div className="stage-toolbar"><div><span className="stage-kicker">02 · ADAPTATION LAYER</span><strong>改编方案控制节奏、取舍和创意边界</strong><small>修改后将重新计算分镜和审核。</small></div><div><button className="secondary-button" onClick={() => setAiTarget("adaptation")}><Bot size={15} />AI 编辑助手</button><button className="secondary-button" onClick={() => setEditingArtifact("adaptation")}><Edit3 size={15} />手动编辑</button></div></div>
                    <div className="adaptation-layout">
                      <section className="strategy-hero"><span className="eyebrow">ADAPTATION DIRECTION</span><h3>{result.adaptation.approach}</h3><div><p><strong>节奏</strong>{result.adaptation.pacing}</p><p><strong>视觉策略</strong>{result.adaptation.visualStrategy}</p></div></section>
                      <section className="decision-list">{result.adaptation.decisions.map((decision, index) => <article key={decision.id}><div className="decision-index">{String(index + 1).padStart(2, "0")}</div><div><div className="decision-meta"><ProvenanceBadge value={decision.provenance} /><span>“{decision.source}”</span></div><h4>{decision.decision}</h4><p>{decision.reason}</p></div></article>)}</section>
                    </div>
                  </>
                )}

                {tab === "storyboard" && (
                  <>
                    <div className="stage-toolbar"><div><span className="stage-kicker">03 · VISUAL LAYER</span><strong>逐格 Prompt 可以单独编辑，也可以整体交给 AI 调整</strong><small>任何修改都会使旧审核失效。</small></div><div><button className="secondary-button" onClick={() => setAiTarget("storyboard")}><Bot size={15} />AI 编辑助手</button><button className="secondary-button" onClick={() => setEditingArtifact("storyboard")}><Edit3 size={15} />编辑全部 JSON</button></div></div>
                    <div className="storyboard-list">{result.panels.map((panel) => <PanelCard key={panel.id} panel={panel} onChange={updatePanel} />)}</div>
                  </>
                )}

                {tab === "audit" && (
                  <>
                    <div className="stage-toolbar"><div><span className="stage-kicker">04 · QUALITY GATE</span><strong>审核永远基于当前 Story Bible 与分镜版本</strong><small>上游一旦修改，本报告会立即失效。</small></div><button className="secondary-button" onClick={() => void runStages("audit", "audit")}><RefreshCw size={15} />重新审核</button></div>
                    <div className="audit-layout">
                      <section className="audit-summary"><div className="score-block"><strong>{result.audit.score}</strong><span>/100</span></div><div><span className="eyebrow">QUALITY REPORT</span><h3>{result.audit.summary}</h3></div></section>
                      <section className="metric-row"><MetricRing label="忠实度" value={result.audit.checks.faithfulness} /><MetricRing label="连续性" value={result.audit.checks.continuity} /><MetricRing label="视觉清晰" value={result.audit.checks.visualClarity} /><MetricRing label="Prompt" value={result.audit.checks.promptQuality} /></section>
                      <section className="content-card"><div className="card-heading"><h3>审核问题</h3><span>{result.audit.issues.length}</span></div>{result.audit.issues.length ? <div className="issue-list">{result.audit.issues.map((issue) => <article key={issue.id}><span className={`severity severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span><div><strong>{issue.target}</strong><p>{issue.message}</p><small>建议：{issue.suggestion}</small></div></article>)}</div> : <div className="all-clear"><Check size={24} /><div><strong>未发现明确问题</strong><p>Prompt Pack 已通过当前审核规则。</p></div></div>}</section>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {editingArtifact && result && (
        <ArtifactEditor
          title={stageLabel[editingArtifact]}
          value={editingArtifact === "bible" ? result.storyBible : editingArtifact === "adaptation" ? result.adaptation : result.panels}
          onSave={(value) => applyArtifact(editingArtifact, value)}
          onClose={() => setEditingArtifact(null)}
        />
      )}

      {aiTarget && result && (
        <AiEditAssistant
          target={aiTarget}
          title={stageLabel[aiTarget]}
          request={result.request}
          artifact={aiTarget === "bible" ? result.storyBible : aiTarget === "adaptation" ? result.adaptation : result.panels}
          context={{ storyBible: result.storyBible, adaptation: aiTarget === "storyboard" ? result.adaptation : undefined }}
          onApply={(artifact) => applyArtifact(aiTarget, artifact)}
          onClose={() => setAiTarget(null)}
        />
      )}
    </div>
  );
}

export default App;
