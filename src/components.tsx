import { Bot, Check, ChevronRight, Clipboard, Edit3, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { AiEditProposal, PipelineRequest, PromptCard } from "./types";

export function ProvenanceBadge({ value }: { value: "SOURCE" | "INFERENCE" | "CREATIVE" }) {
  const label = { SOURCE: "原文", INFERENCE: "推断", CREATIVE: "创作" }[value];
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
        <button className="icon-button" onClick={() => setEditing(true)} aria-label="编辑分镜">
          <Edit3 size={17} />
        </button>
      </header>

      <div className="source-quote">“{panel.sourceExcerpt}”</div>

      <div className="shot-grid">
        <div><span>镜头</span><strong>{panel.shotSize} · {panel.cameraAngle}</strong></div>
        <div><span>人物</span><strong>{panel.characters.join("、") || "环境空镜"}</strong></div>
        <div><span>情绪</span><strong>{panel.emotion}</strong></div>
        <div><span>地点</span><strong>{panel.location}</strong></div>
      </div>

      <div className="prompt-block">
        <div className="prompt-label">
          <span><Sparkles size={14} /> T2I Prompt</span>
          <button onClick={copyPrompt}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "已复制" : "复制"}</button>
        </div>
        <p>{panel.prompt}</p>
      </div>

      <details>
        <summary>连续性与 Negative Prompt <ChevronRight size={15} /></summary>
        <div className="detail-content">
          <strong>连续性约束</strong>
          <ul>{panel.continuity.map((item) => <li key={item}>{item}</li>)}</ul>
          <strong>Negative Prompt</strong>
          <p>{panel.negativePrompt}</p>
        </div>
      </details>

      {editing && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-label="编辑分镜">
            <div className="modal-header">
              <div><span className="eyebrow">Panel {panel.order}</span><h2>编辑分镜卡</h2></div>
              <button className="icon-button" onClick={() => { setDraft(panel); setEditing(false); }}><X size={19} /></button>
            </div>
            <label>叙事功能<input value={draft.storyPurpose} onChange={(event) => setDraft({ ...draft, storyPurpose: event.target.value })} /></label>
            <div className="form-row">
              <label>景别<input value={draft.shotSize} onChange={(event) => setDraft({ ...draft, shotSize: event.target.value })} /></label>
              <label>机位<input value={draft.cameraAngle} onChange={(event) => setDraft({ ...draft, cameraAngle: event.target.value })} /></label>
            </div>
            <label>动作<textarea rows={2} value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} /></label>
            <label>构图<textarea rows={2} value={draft.composition} onChange={(event) => setDraft({ ...draft, composition: event.target.value })} /></label>
            <label>Prompt<textarea rows={6} value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} /></label>
            <label>Negative Prompt<textarea rows={3} value={draft.negativePrompt} onChange={(event) => setDraft({ ...draft, negativePrompt: event.target.value })} /></label>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => { setDraft(panel); setEditing(false); }}>取消</button>
              <button className="primary-button" onClick={save}>保存修改</button>
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
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState("");

  const save = () => {
    try {
      onSave(JSON.parse(draft));
      onClose();
    } catch {
      setError("JSON 格式不正确，请检查括号、逗号和引号。");
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal artifact-editor-modal" role="dialog" aria-modal="true" aria-label={`编辑 ${title}`}>
        <div className="modal-header">
          <div><span className="eyebrow">STRUCTURED EDITOR</span><h2>编辑 {title}</h2></div>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </div>
        <p className="editor-help">这是完整的结构化产物。保存上游修改后，所有依赖它的下游阶段都会被标记为需要重新生成。</p>
        <textarea className="json-editor" spellCheck={false} value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} />
        {error && <p className="inline-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>取消</button>
          <button className="primary-button" onClick={save}>保存并使下游失效</button>
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
      if (!response.ok) throw new Error(data.error || "AI 编辑建议生成失败");
      setProposal(data as AiEditProposal);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 编辑建议生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal ai-editor-modal" role="dialog" aria-modal="true" aria-label={`AI 编辑 ${title}`}>
        <div className="modal-header">
          <div><span className="eyebrow"><Bot size={14} /> AI EDITOR</span><h2>让 AI 修改 {title}</h2></div>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </div>

        {!proposal && (
          <>
            <p className="editor-help">用自然语言描述目标。AI 只会提出建议，预览完成前不会修改当前版本。</p>
            <textarea rows={5} placeholder="例如：林夏不要有明确年龄和服装，把这些设定恢复为待确认信息；同时保留阴雨傍晚和挂钟时间。" value={instruction} onChange={(event) => setInstruction(event.target.value)} />
            {error && <p className="inline-error">{error}</p>}
            <div className="modal-actions">
              <button className="secondary-button" onClick={onClose}>取消</button>
              <button className="primary-button" disabled={loading || instruction.trim().length < 2} onClick={propose}>{loading ? <span className="spinner" /> : <Send size={15} />}{loading ? "正在分析并拟定修改…" : "生成修改建议"}</button>
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
                  <div><del>{change.before || "未设置"}</del><strong>{change.after || "移除"}</strong><small>{change.reason}</small></div>
                </article>
              ))}
              {!proposal.changes.length && <p>AI 返回了完整修订版本，但没有列出字段级差异。</p>}
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setProposal(null)}>修改要求</button>
              <button className="primary-button" onClick={() => { onApply(proposal.revisedArtifact); onClose(); }}><Check size={15} />确认并应用</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
