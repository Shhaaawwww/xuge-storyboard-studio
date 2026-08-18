import { Bot, Check, ChevronRight, Clipboard, Edit3, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "./i18n";
import type { AiEditProposal, PipelineRequest, PromptCard } from "./types";

export function ProvenanceBadge({ value }: { value: "SOURCE" | "INFERENCE" | "CREATIVE" }) {
  const { t } = useI18n();
  const label = { SOURCE: t("provenance.source"), INFERENCE: t("provenance.inference"), CREATIVE: t("provenance.creative") }[value];
  return <span className={`provenance provenance-${value.toLowerCase()}`}>{label}</span>;
}

export function MetricRing({ value, label }: { value: number; label: string }) {
  return (
    <div className="metric">
      <div className="metric-ring" style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}>
        <span>{value}</span>
      </div>
      <span>{label}</span>
    </div>
  );
}

export function PanelCard({ panel, onChange }: { panel: PromptCard; onChange: (panel: PromptCard) => void }) {
  const { locale, t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(panel);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(panel.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const save = () => {
    onChange(draft);
    setEditing(false);
  };

  return (
    <article className="panel-card">
      <header className="panel-header">
        <div className="panel-number">{String(panel.order).padStart(2, "0")}</div>
        <div className="panel-heading">
          <div className="panel-badges">
            {panel.provenance.map((item) => <ProvenanceBadge key={item} value={item} />)}
          </div>
          <h3>{panel.storyPurpose}</h3>
        </div>
        <button className="icon-button" onClick={() => setEditing(true)} aria-label={t("panel.edit")}>
          <Edit3 size={17} />
        </button>
      </header>

      <div className="source-quote">“{panel.sourceExcerpt}”</div>

      <div className="shot-grid">
        <div><span>{t("panel.shot")}</span><strong>{panel.shotSize} · {panel.cameraAngle}</strong></div>
        <div><span>{t("panel.characters")}</span><strong>{panel.characters.join(locale === "zh-CN" ? "、" : ", ") || t("panel.emptyShot")}</strong></div>
        <div><span>{t("panel.emotion")}</span><strong>{panel.emotion}</strong></div>
        <div><span>{t("panel.location")}</span><strong>{panel.location}</strong></div>
      </div>

      <div className="prompt-block">
        <div className="prompt-label">
          <span><Sparkles size={14} /> T2I Prompt</span>
          <button onClick={copyPrompt}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? t("panel.copied") : t("panel.copy")}</button>
        </div>
        <p>{panel.prompt}</p>
      </div>

      <details>
        <summary>{t("panel.details")} <ChevronRight size={15} /></summary>
        <div className="detail-content">
          <strong>{t("panel.continuity")}</strong>
          <ul>{panel.continuity.map((item) => <li key={item}>{item}</li>)}</ul>
          <strong>Negative Prompt</strong>
          <p>{panel.negativePrompt}</p>
        </div>
      </details>

      {editing && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-label={t("panel.edit")}>
            <div className="modal-header">
              <div><span className="eyebrow">Panel {panel.order}</span><h2>{t("panel.editTitle")}</h2></div>
              <button className="icon-button" aria-label={t("common.close")} onClick={() => { setDraft(panel); setEditing(false); }}><X size={19} /></button>
            </div>
            <label>{t("panel.purpose")}<input value={draft.storyPurpose} onChange={(event) => setDraft({ ...draft, storyPurpose: event.target.value })} /></label>
            <div className="form-row">
              <label>{t("panel.shotSize")}<input value={draft.shotSize} onChange={(event) => setDraft({ ...draft, shotSize: event.target.value })} /></label>
              <label>{t("panel.angle")}<input value={draft.cameraAngle} onChange={(event) => setDraft({ ...draft, cameraAngle: event.target.value })} /></label>
            </div>
            <label>{t("panel.action")}<textarea rows={2} value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} /></label>
            <label>{t("panel.composition")}<textarea rows={2} value={draft.composition} onChange={(event) => setDraft({ ...draft, composition: event.target.value })} /></label>
            <label>Prompt<textarea rows={6} value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} /></label>
            <label>Negative Prompt<textarea rows={3} value={draft.negativePrompt} onChange={(event) => setDraft({ ...draft, negativePrompt: event.target.value })} /></label>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => { setDraft(panel); setEditing(false); }}>{t("common.cancel")}</button>
              <button className="primary-button" onClick={save}>{t("common.save")}</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function ArtifactEditor({
  title,
  value,
  onSave,
  onClose
}: {
  title: string;
  value: unknown;
  onSave: (value: unknown) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState("");

  const save = () => {
    try {
      onSave(JSON.parse(draft));
      onClose();
    } catch {
      setError(t("editor.invalidJson"));
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal artifact-editor-modal" role="dialog" aria-modal="true" aria-label={t("editor.aria", { title })}>
        <div className="modal-header">
          <div><span className="eyebrow">STRUCTURED EDITOR</span><h2>{t("editor.title", { title })}</h2></div>
          <button className="icon-button" aria-label={t("common.close")} onClick={onClose}><X size={19} /></button>
        </div>
        <p className="editor-help">{t("editor.help")}</p>
        <textarea className="json-editor" spellCheck={false} value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} />
        {error && <p className="inline-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>{t("common.cancel")}</button>
          <button className="primary-button" onClick={save}>{t("editor.save")}</button>
        </div>
      </div>
    </div>
  );
}

export function AiEditAssistant({
  target,
  title,
  request,
  artifact,
  context,
  onApply,
  onClose
}: {
  target: AiEditProposal["target"];
  title: string;
  request: PipelineRequest;
  artifact: unknown;
  context: unknown;
  onApply: (artifact: AiEditProposal["revisedArtifact"]) => void;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<AiEditProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const propose = async () => {
    if (instruction.trim().length < 2) return;
    setLoading(true);
    setError("");
    setProposal(null);
    try {
      const response = await fetch("/api/assistant/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, target, instruction, artifact, context })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(locale === "zh-CN" ? data.error || t("error.ai") : t("error.ai"));
      setProposal(data as AiEditProposal);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error.ai"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal ai-editor-modal" role="dialog" aria-modal="true" aria-label={t("assistant.aria", { title })}>
        <div className="modal-header">
          <div><span className="eyebrow"><Bot size={14} /> AI EDITOR</span><h2>{t("assistant.title", { title })}</h2></div>
          <button className="icon-button" aria-label={t("common.close")} onClick={onClose}><X size={19} /></button>
        </div>

        {!proposal && (
          <>
            <p className="editor-help">{t("assistant.help")}</p>
            <textarea rows={5} placeholder={t("assistant.placeholder")} value={instruction} onChange={(event) => setInstruction(event.target.value)} />
            {error && <p className="inline-error">{error}</p>}
            <div className="modal-actions">
              <button className="secondary-button" onClick={onClose}>{t("common.cancel")}</button>
              <button className="primary-button" disabled={loading || instruction.trim().length < 2} onClick={propose}>{loading ? <span className="spinner" /> : <Send size={15} />}{loading ? t("assistant.loading") : t("assistant.propose")}</button>
            </div>
          </>
        )}

        {proposal && (
          <>
            <section className="proposal-summary"><Sparkles size={18} /><div><strong>{proposal.summary}</strong><p>{proposal.rationale}</p></div></section>
            <div className="change-list">
              {proposal.changes.map((change, index) => (
                <article key={`${change.field}-${index}`}>
                  <span>{change.field}</span>
                  <div><del>{change.before || t("assistant.unset")}</del><strong>{change.after || t("assistant.remove")}</strong><small>{change.reason}</small></div>
                </article>
              ))}
              {!proposal.changes.length && <p>{t("assistant.noDiff")}</p>}
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setProposal(null)}>{t("assistant.revise")}</button>
              <button className="primary-button" onClick={() => { onApply(proposal.revisedArtifact); onClose(); }}><Check size={15} />{t("assistant.apply")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
