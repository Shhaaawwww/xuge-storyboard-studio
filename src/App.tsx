import { AlertTriangle, ArrowRight, BookOpen, Bot, Check, ChevronDown, CircleGauge, CircleHelp, Clock3, Download, Edit3, Feather, FileJson, FileText, KeyRound, LockKeyhole, PanelsTopLeft, Play, Plus, RefreshCw, RotateCcw, Save, Settings2, Sparkles, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiEditAssistant, ArtifactEditor, MetricRing, PanelCard, ProvenanceBadge } from "./components";
import { exportJson, exportMarkdown } from "./export";
import { Guide } from "./Guide";
import { LanguageSwitch, translate, useI18n } from "./i18n";
import { normalizePipelineResult } from "./normalize";
import { sampleLockedFacts, sampleLockedFactsEn, sampleStory, sampleStoryEn } from "./sample";
import type { AdaptationPlan, AiEditProposal, ArtifactStage, CreativeMode, PipelineArtifacts, PipelineJob, PipelineRequest, PipelineResult, PipelineStage, PromptCard, ProviderConfig, StoryBible } from "./types";

type Tab = "bible" | "adaptation" | "storyboard" | "audit";

const createInitialForm = (style: string): PipelineRequest => ({
  title: "",
  sourceText: "",
  mode: "adapted",
  panelCount: 8,
  style,
  lockedFacts: []
});

const initialSettings = {
  provider: "demo" as const,
  baseUrl: "http://localhost:11434/v1",
  apiKey: "",
  selectedModel: "qwen3:8b"
};

const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const emptyBible: StoryBible = { logline: "", themes: [], narrativeVoice: "", characters: [], locations: [], timeline: [], lockedFacts: [], ambiguities: [] };
const emptyAdaptation: AdaptationPlan = { approach: "", pacing: "", visualStrategy: "", decisions: [] };
const emptyAudit: PipelineResult["audit"] = {
  score: 0,
  summary: "",
  issues: [],
  checks: { faithfulness: 0, continuity: 0, visualClarity: 0, promptQuality: 0 }
};

function App() {
  const { locale, t } = useI18n();
  const [form, setForm] = useState<PipelineRequest>(() => createInitialForm(t("source.defaultStyle")));
  const previousLocale = useRef(locale);
  const [factDraft, setFactDraft] = useState("");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [workflowMode, setWorkflowMode] = useState<"auto" | "guided">("guided");
  const [completedStages, setCompletedStages] = useState<ArtifactStage[]>([]);
  const [revisionStage, setRevisionStage] = useState<Exclude<ArtifactStage, "audit"> | null>(null);
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

  const modes = useMemo<Array<{ id: CreativeMode; name: string; description: string }>>(() => [
    { id: "faithful", name: t("mode.faithful"), description: t("mode.faithfulDescription") },
    { id: "adapted", name: t("mode.adapted"), description: t("mode.adaptedDescription") },
    { id: "artistic", name: t("mode.artistic"), description: t("mode.artisticDescription") }
  ], [t]);

  const generationStages = useMemo<Array<{
    id: Exclude<PipelineStage, "complete">;
    label: string;
    description: string;
  }>>(() => [
    { id: "bible", label: t("stage.bible"), description: t("stage.bibleDescription") },
    { id: "adaptation", label: t("stage.adaptation"), description: t("stage.adaptationDescription") },
    { id: "storyboard", label: t("stage.storyboard"), description: t("stage.storyboardDescription") },
    { id: "audit", label: t("stage.audit"), description: t("stage.auditDescription") }
  ], [t]);

  const stageLabel = useMemo<Record<ArtifactStage, string>>(() => ({
    bible: t("stage.labelBible"),
    adaptation: t("stage.labelAdaptation"),
    storyboard: t("stage.labelStoryboard"),
    audit: t("stage.labelAudit")
  }), [t]);

  const formatElapsed = (seconds: number) => seconds < 60
    ? t("time.seconds", { seconds })
    : t("time.minutes", { minutes: Math.floor(seconds / 60), seconds: seconds % 60 });
  const revisionNotice = revisionStage ? {
    bible: t("revision.bible"),
    adaptation: t("revision.adaptation"),
    storyboard: t("revision.storyboard")
  }[revisionStage] : "";

  useEffect(() => {
    const previousStyle = translate(previousLocale.current, "source.defaultStyle");
    setForm((current) => current.style === previousStyle ? { ...current, style: t("source.defaultStyle") } : current);
    previousLocale.current = locale;
  }, [locale, t]);

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
    setForm({
      ...createInitialForm(t("source.defaultStyle")),
      title: t("sample.title"),
      sourceText: locale === "zh-CN" ? sampleStory : sampleStoryEn,
      lockedFacts: locale === "zh-CN" ? sampleLockedFacts : sampleLockedFactsEn
    });
    setResult(null);
    setCompletedStages([]);
    setRevisionStage(null);
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
      if (!response.ok) throw new Error(locale === "zh-CN" ? data.error || t("error.save") : t("error.save"));
      setProvider(data);
      setSettingsDraft({ provider: data.provider, baseUrl: data.baseUrl, apiKey: data.apiKey, selectedModel: data.selectedModel });
      setSettingsOpen(false);
    } catch (reason) {
      setSettingsError(reason instanceof Error ? reason.message : t("error.save"));
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
      if (!response.ok) throw new Error(locale === "zh-CN" ? data.error || t("error.createJob") : t("error.createJob"));

      while (true) {
        await delay(550);
        const jobResponse = await fetch(`/api/pipeline/jobs/${data.jobId}`);
        const job = await jobResponse.json() as PipelineJob & { error?: string };
        if (!jobResponse.ok) throw new Error(locale === "zh-CN" ? job.error || t("error.readJob") : t("error.readJob"));
        setPipelineJob(job);

        if (job.status === "failed") throw new Error(locale === "zh-CN" ? job.error || t("error.failed") : t("error.failed"));
        if (job.status === "completed") {
          if (!job.stageResult) throw new Error(t("error.noArtifact"));
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
          setRevisionStage(null);
          setTab(endStage === "storyboard" ? "storyboard" : endStage);
          break;
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error.retry"));
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
      setRevisionStage("bible");
      setTab("bible");
    } else if (target === "adaptation") {
      setResult(normalizePipelineResult({ ...result, adaptation: artifact as AdaptationPlan, panels: [], audit: emptyAudit }));
      setCompletedStages(["bible", "adaptation"]);
      setRevisionStage("adaptation");
      setTab("adaptation");
    } else {
      setResult(normalizePipelineResult({ ...result, panels: artifact as PromptCard[], audit: emptyAudit }));
      setCompletedStages(["bible", "adaptation", "storyboard"]);
      setRevisionStage("storyboard");
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
          <div><strong>{t("brand.name")}</strong><span>{t("brand.subtitle")}</span></div>
        </div>
        <div className="topbar-actions">
          <div className={`provider-status ${provider?.ready ? "is-ready" : ""}`}>
            <span className="status-dot" />
            {provider ? provider.model : t("top.connecting")}
          </div>
          <LanguageSwitch />
          <button className="topbar-guide-button" onClick={() => setGuideOpen(true)}><CircleHelp size={16} />{t("top.guide")}</button>
          <button className="icon-button topbar-icon" aria-label={t("top.settings")} title={t("top.settings")} onClick={() => setSettingsOpen(true)}><Settings2 size={17} /></button>
          {result && completedStages.includes("audit") && (
            <div className="export-wrap">
              <button className="secondary-button" onClick={() => setExportOpen(!exportOpen)}><Download size={16} />{t("top.export")}<ChevronDown size={14} /></button>
              {exportOpen && (
                <div className="export-menu">
                  <button onClick={() => exportMarkdown(result, locale)}><FileText size={17} /><span><strong>Markdown Prompt Pack</strong><small>{t("top.exportMarkdown")}</small></span></button>
                  <button onClick={() => exportJson(result)}><FileJson size={17} /><span><strong>JSON Project</strong><small>{t("top.exportJson")}</small></span></button>
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
          <div className="modal settings-modal" role="dialog" aria-modal="true" aria-label={t("settings.title")}>
            <div className="modal-header">
              <div><span className="eyebrow">MODEL PROVIDER</span><h2>{t("settings.title")}</h2></div>
              <button className="icon-button" aria-label={t("settings.close")} onClick={() => setSettingsOpen(false)}><X size={19} /></button>
            </div>

            <div className="settings-provider-grid">
              <button className={settingsDraft.provider === "demo" ? "settings-provider active" : "settings-provider"} onClick={() => setSettingsDraft({ ...settingsDraft, provider: "demo" })}>
                <span className="radio-mark">{settingsDraft.provider === "demo" && <Check size={12} />}</span>
                <strong>{t("settings.demo")}</strong><small>{t("settings.demoDescription")}</small>
              </button>
              <button className={settingsDraft.provider === "openai-compatible" ? "settings-provider active" : "settings-provider"} onClick={() => setSettingsDraft({ ...settingsDraft, provider: "openai-compatible" })}>
                <span className="radio-mark">{settingsDraft.provider === "openai-compatible" && <Check size={12} />}</span>
                <strong>OpenAI Compatible</strong><small>{t("settings.compatibleDescription")}</small>
              </button>
            </div>

            <div className={settingsDraft.provider === "demo" ? "settings-fields is-disabled" : "settings-fields"}>
              <label>Base URL<input disabled={settingsDraft.provider === "demo"} value={settingsDraft.baseUrl} onChange={(event) => setSettingsDraft({ ...settingsDraft, baseUrl: event.target.value })} placeholder="https://example.com/v1" /></label>
              <label>{t("settings.model")}<input disabled={settingsDraft.provider === "demo"} value={settingsDraft.selectedModel} onChange={(event) => setSettingsDraft({ ...settingsDraft, selectedModel: event.target.value })} placeholder="model-name" /></label>
              <label>API Key<input disabled={settingsDraft.provider === "demo"} value={settingsDraft.apiKey} onChange={(event) => setSettingsDraft({ ...settingsDraft, apiKey: event.target.value })} placeholder={t("settings.apiKeyPlaceholder")} /></label>
            </div>

            <div className="plaintext-warning"><KeyRound size={17} /><p><strong>{t("settings.plaintext")}</strong><span>{t("settings.plaintextDescription")}</span></p></div>
            {settingsError && <div className="error-banner"><AlertTriangle size={17} />{settingsError}</div>}
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setSettingsOpen(false)}>{t("common.cancel")}</button>
              <button className="primary-button" disabled={savingSettings} onClick={saveProviderSettings}><Save size={15} />{savingSettings ? t("common.saving") : t("settings.save")}</button>
            </div>
          </div>
        </div>
      )}

      <main className="workspace">
        <aside className="editor-pane">
          <div className="editor-heading">
            <div><span className="eyebrow">{t("source.eyebrow")}</span><h1>{t("source.headingLine1")}<br />{t("source.headingLine2")}</h1></div>
            <button className="text-button" onClick={loadSample}><WandSparkles size={15} />{t("source.loadSample")}</button>
          </div>

          <label className="field-label">{t("source.projectTitle")}<input placeholder={t("source.projectPlaceholder")} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>

          <label className="field-label source-field">
            <span>{t("source.text")} <small>{characterCount.toLocaleString(locale)} / 50,000</small></span>
            <textarea placeholder={t("source.textPlaceholder")} value={form.sourceText} onChange={(event) => setForm({ ...form, sourceText: event.target.value })} />
          </label>

          <section className="control-section">
            <div className="section-label"><Sparkles size={15} />{t("source.mode")}</div>
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
            <div className="section-label"><RefreshCw size={15} />{t("source.workflow")}</div>
            <div className="workflow-mode-grid">
              <button className={workflowMode === "guided" ? "workflow-mode active" : "workflow-mode"} onClick={() => setWorkflowMode("guided")}>
                <span className="radio-mark">{workflowMode === "guided" && <Check size={12} />}</span>
                <strong>{t("workflow.guided")}</strong><small>{t("workflow.guidedDescription")}</small>
              </button>
              <button className={workflowMode === "auto" ? "workflow-mode active" : "workflow-mode"} onClick={() => setWorkflowMode("auto")}>
                <span className="radio-mark">{workflowMode === "auto" && <Check size={12} />}</span>
                <strong>{t("workflow.auto")}</strong><small>{t("workflow.autoDescription")}</small>
              </button>
            </div>
          </section>

          <div className="two-columns">
            <label className="field-label">{t("source.panelCount")}<div className="range-row"><input type="range" min="4" max="24" value={form.panelCount} onChange={(event) => setForm({ ...form, panelCount: Number(event.target.value) })} /><strong>{form.panelCount}</strong></div></label>
            <label className="field-label">{t("source.visualStyle")}<input value={form.style} onChange={(event) => setForm({ ...form, style: event.target.value })} /></label>
          </div>

          <section className="control-section">
            <div className="section-label"><LockKeyhole size={15} />{t("source.lockedFacts")} <span>{form.lockedFacts.length}</span></div>
            <div className="fact-input"><input placeholder={t("source.factPlaceholder")} value={factDraft} onChange={(event) => setFactDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFact(); } }} /><button onClick={addFact}><Plus size={16} /></button></div>
            <div className="fact-list">
              {form.lockedFacts.map((fact) => <span key={fact}>{fact}<button onClick={() => setForm({ ...form, lockedFacts: form.lockedFacts.filter((item) => item !== fact) })}><X size={13} /></button></span>)}
              {!form.lockedFacts.length && <p>{t("source.factEmpty")}</p>}
            </div>
          </section>

          {error && <div className="error-banner"><AlertTriangle size={17} />{error}</div>}

          <button className="generate-button" disabled={!canRun} onClick={generate}>
            {loading ? <span className="spinner" /> : <Play size={18} fill="currentColor" />}
            {loading ? t("generate.loading", { percent: displayPercent }) : workflowMode === "guided" ? t("generate.bible") : t("generate.complete")}
          </button>
        </aside>

        <section className="result-pane">
          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-illustration">
                <div className="paper paper-back" />
                <div className="paper paper-front"><PanelsTopLeft size={44} /><span /><span /><span /></div>
              </div>
              <span className="eyebrow">{t("empty.eyebrow")}</span>
              <h2>{t("empty.title")}</h2>
              <p>{t("empty.description")}</p>
              <div className="feature-row">
                <span><BookOpen size={16} />{t("empty.traceable")}</span>
                <span><Settings2 size={16} />{t("empty.structured")}</span>
                <span><CircleGauge size={16} />{t("empty.audit")}</span>
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
                  <span className="eyebrow">{t("progress.eyebrow")}</span>
                  <h2>{t("progress.title", { title: form.title })}</h2>
                  <p>{pipelineJob ? (locale === "zh-CN" ? pipelineJob.progress.message : {
                    bible: t("progress.bible"),
                    adaptation: t("progress.adaptation"),
                    storyboard: t("progress.storyboard"),
                    audit: t("progress.audit"),
                    complete: t("progress.complete")
                  }[pipelineJob.progress.stage]) : t("progress.creating")}</p>
                </div>
              </div>

              <div className="progress-track" aria-label={t("progress.aria", { percent: displayPercent })}>
                <span style={{ width: `${displayPercent}%` }} />
              </div>
              <div className="progress-meta">
                <span><Clock3 size={13} />{t("progress.elapsed", { time: formatElapsed(elapsedSeconds) })}</span>
                <span>{pipelineJob?.provider || provider?.model || t("progress.provider")}</span>
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
                      <span className="step-status">{state === "completed" ? t("stage.statusComplete") : state === "active" ? t("stage.statusActive") : t("stage.statusPending")}</span>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="result-header">
                <div><span className="eyebrow">{completedStages.includes("audit") ? t("result.panels", { count: result.panels.length }) : t("result.progress", { count: completedStages.length })}</span><h2>{result.request.title}</h2><p>{result.storyBible.logline}</p></div>
                <button className="icon-button" aria-label={t("result.restart")} title={t("result.restart")} onClick={() => { setResult(null); setCompletedStages([]); setRevisionStage(null); setForm(createInitialForm(t("source.defaultStyle"))); }}><RotateCcw size={18} /></button>
              </div>

              <nav className="tabs">
                <button className={tab === "bible" ? "active" : ""} onClick={() => setTab("bible")}><BookOpen size={16} />Story Bible</button>
                <button disabled={!completedStages.includes("adaptation")} className={tab === "adaptation" ? "active" : ""} onClick={() => setTab("adaptation")}><Feather size={16} />{t("tab.adaptation")}</button>
                <button disabled={!completedStages.includes("storyboard")} className={tab === "storyboard" ? "active" : ""} onClick={() => setTab("storyboard")}><PanelsTopLeft size={16} />{t("tab.storyboard")}</button>
                <button disabled={!completedStages.includes("audit")} className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}><CircleGauge size={16} />{t("tab.audit")} {completedStages.includes("audit") && <span>{result.audit.issues.length}</span>}</button>
              </nav>

              <div className="stage-status-strip">
                {generationStages.map((stage, index) => {
                  const done = completedStages.includes(stage.id);
                  const ready = nextStage === stage.id;
                  return <div key={stage.id} className={done ? "done" : ready ? "ready" : "locked"}><span>{done ? <Check size={13} /> : index + 1}</span><strong>{stage.label}</strong><small>{done ? t("stage.editable") : ready ? t("stage.awaiting") : t("stage.upstream")}</small></div>;
                })}
              </div>

              {nextStage && (
                <section className={revisionNotice ? "revision-banner is-warning" : "revision-banner"}>
                  <div>{revisionNotice ? <AlertTriangle size={19} /> : <Check size={19} />}<p><strong>{revisionNotice ? t("revision.sync") : t("revision.generated", { stage: stageLabel[completedStages[completedStages.length - 1] || "bible"] })}</strong><span>{revisionNotice || t("revision.review", { stage: stageLabel[nextStage] })}</span></p></div>
                  <button className="primary-button" disabled={loading} onClick={continuePipeline}>{workflowMode === "guided" ? t("revision.confirm", { stage: stageLabel[nextStage] }) : t("revision.regenerate", { stage: stageLabel[nextStage] })}<ArrowRight size={15} /></button>
                </section>
              )}

              <div className="tab-content">
                {tab === "bible" && (
                  <>
                    <div className="stage-toolbar"><div><span className="stage-kicker">01 · CANON LAYER</span><strong>{t("bible.toolbarTitle")}</strong><small>{t("bible.toolbarHelp")}</small></div><div><button className="secondary-button" onClick={() => setAiTarget("bible")}><Bot size={15} />{t("toolbar.ai")}</button><button className="secondary-button" onClick={() => setEditingArtifact("bible")}><Edit3 size={15} />{t("toolbar.manual")}</button></div></div>
                    <div className="bible-layout">
                      <section className="content-card themes-card"><span className="eyebrow">{t("bible.themes")}</span><div className="theme-list">{result.storyBible.themes.map((theme) => <span key={theme}>{theme}</span>)}</div><p>{t("bible.voice", { voice: result.storyBible.narrativeVoice })}</p></section>
                      <section className="content-card"><div className="card-heading"><h3>{t("bible.characters")}</h3><span>{result.storyBible.characters.length}</span></div><div className="character-list">{result.storyBible.characters.map((character) => <article key={character.id}><div className="avatar">{character.name.slice(0, 1)}</div><div><h4>{character.name}<small>{character.role}</small></h4><p>{character.appearance.join(locale === "zh-CN" ? "；" : "; ")}</p><div className="tags">{character.visualMotifs.map((motif) => <span key={motif}>{motif}</span>)}</div></div></article>)}</div></section>
                      <section className="content-card"><div className="card-heading"><h3>{t("bible.timeline")}</h3><span>{result.storyBible.timeline.length}</span></div><div className="timeline">{result.storyBible.timeline.map((event, index) => <article key={event.id}><span>{index + 1}</span><div><strong>{event.summary}</strong><p>{event.sourceExcerpt}</p></div></article>)}</div></section>
                      <section className="content-card"><div className="card-heading"><h3>{t("bible.locked")}</h3></div><div className="rule-list">{result.storyBible.lockedFacts.map((fact) => <p key={fact}><LockKeyhole size={14} />{fact}</p>)}{result.storyBible.ambiguities.map((item) => <p className="ambiguity" key={item}><AlertTriangle size={14} />{item}</p>)}</div></section>
                    </div>
                  </>
                )}

                {tab === "adaptation" && (
                  <>
                    <div className="stage-toolbar"><div><span className="stage-kicker">02 · ADAPTATION LAYER</span><strong>{t("adaptation.toolbarTitle")}</strong><small>{t("adaptation.toolbarHelp")}</small></div><div><button className="secondary-button" onClick={() => setAiTarget("adaptation")}><Bot size={15} />{t("toolbar.ai")}</button><button className="secondary-button" onClick={() => setEditingArtifact("adaptation")}><Edit3 size={15} />{t("toolbar.manual")}</button></div></div>
                    <div className="adaptation-layout">
                      <section className="strategy-hero"><span className="eyebrow">ADAPTATION DIRECTION</span><h3>{result.adaptation.approach}</h3><div><p><strong>{t("adaptation.pacing")}</strong>{result.adaptation.pacing}</p><p><strong>{t("adaptation.visual")}</strong>{result.adaptation.visualStrategy}</p></div></section>
                      <section className="decision-list">{result.adaptation.decisions.map((decision, index) => <article key={decision.id}><div className="decision-index">{String(index + 1).padStart(2, "0")}</div><div><div className="decision-meta"><ProvenanceBadge value={decision.provenance} /><span>“{decision.source}”</span></div><h4>{decision.decision}</h4><p>{decision.reason}</p></div></article>)}</section>
                    </div>
                  </>
                )}

                {tab === "storyboard" && (
                  <>
                    <div className="stage-toolbar"><div><span className="stage-kicker">03 · VISUAL LAYER</span><strong>{t("storyboard.toolbarTitle")}</strong><small>{t("storyboard.toolbarHelp")}</small></div><div><button className="secondary-button" onClick={() => setAiTarget("storyboard")}><Bot size={15} />{t("toolbar.ai")}</button><button className="secondary-button" onClick={() => setEditingArtifact("storyboard")}><Edit3 size={15} />{t("toolbar.editJson")}</button></div></div>
                    <div className="storyboard-list">{result.panels.map((panel) => <PanelCard key={panel.id} panel={panel} onChange={updatePanel} />)}</div>
                  </>
                )}

                {tab === "audit" && (
                  <>
                    <div className="stage-toolbar"><div><span className="stage-kicker">04 · QUALITY GATE</span><strong>{t("audit.toolbarTitle")}</strong><small>{t("audit.toolbarHelp")}</small></div><button className="secondary-button" onClick={() => void runStages("audit", "audit")}><RefreshCw size={15} />{t("audit.rerun")}</button></div>
                    <div className="audit-layout">
                      <section className="audit-summary"><div className="score-block"><strong>{result.audit.score}</strong><span>/100</span></div><div><span className="eyebrow">QUALITY REPORT</span><h3>{result.audit.summary}</h3></div></section>
                      <section className="metric-row"><MetricRing label={t("audit.faithfulness")} value={result.audit.checks.faithfulness} /><MetricRing label={t("audit.continuity")} value={result.audit.checks.continuity} /><MetricRing label={t("audit.visualClarity")} value={result.audit.checks.visualClarity} /><MetricRing label="Prompt" value={result.audit.checks.promptQuality} /></section>
                      <section className="content-card"><div className="card-heading"><h3>{t("audit.issues")}</h3><span>{result.audit.issues.length}</span></div>{result.audit.issues.length ? <div className="issue-list">{result.audit.issues.map((issue) => <article key={issue.id}><span className={`severity severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span><div><strong>{issue.target}</strong><p>{issue.message}</p><small>{t("audit.suggestion", { suggestion: issue.suggestion })}</small></div></article>)}</div> : <div className="all-clear"><Check size={24} /><div><strong>{t("audit.clear")}</strong><p>{t("audit.clearDescription")}</p></div></div>}</section>
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
