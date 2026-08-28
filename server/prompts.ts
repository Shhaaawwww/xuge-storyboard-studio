import type { PromptCard } from "../src/types.js";
import type { ValidPipelineRequest } from "./schemas.js";

const narrativePriority = `全局优先级不可颠倒：
1. 零背景读者能够说清楚“谁、想要什么、遇到什么、为什么发生、结果如何”；
2. 因果、时间、地点和人物身份清晰；
3. 忠于原文与锁定事实；
4. 节奏、构图、隐喻和艺术风格。
当艺术表达与可理解性冲突时，必须牺牲艺术表达，先把故事讲清楚。`;

const modePolicy = {
  faithful: "忠于原文：按原文顺序建立完整事件链，不得添加新事件、改变因果、人物关系或结局；只允许补充画面成立所必需的环境与动作。",
  adapted: "漫画改编：默认采用清楚的顺叙。允许压缩、拆分、合并段落和补充过渡动作，但不得丢失核心前提、因果桥梁、人物关系与结局。只有在所有跳转都能被读者明确识别时才可使用非线性结构。",
  artistic: "艺术创作：在故事已经可以被零背景读者准确复述的前提下，才允许非线性叙事、视觉隐喻和主观镜头；每次时空跳转必须有读者可见的标记，新增内容必须标记为 CREATIVE，且不得违反锁定事实。"
} as const;

const outputLanguageRule = (input: ValidPipelineRequest) => {
  const latin = input.sourceText.match(/[A-Za-z]/g)?.length || 0;
  const cjk = input.sourceText.match(/[\u3400-\u9fff]/g)?.length || 0;
  return latin > cjk * 2
    ? "所有面向用户的自然语言字段必须使用英语；原文摘录保持原样。"
    : "所有面向用户的自然语言字段必须使用简体中文；原文摘录保持原样。";
};

export function storyBiblePrompt(input: ValidPipelineRequest) {
  return `你是视觉叙事项目的 Canon Keeper。只分析原文，不做艺术化改写。
请从原文提取故事圣经，并严格返回 JSON。
${outputLanguageRule(input)}

标题：${input.title}
锁定事实：${input.lockedFacts.join("；") || "无"}
原文：
${input.sourceText}

JSON 字段：logline, themes, narrativeVoice, characters, locations, timeline, lockedFacts, ambiguities。
characters 每项包含 id,name,role,appearance,personality,visualMotifs,lockedFacts。
locations 每项包含 id,name,description,fixedElements。
timeline 必须按故事真实时间顺序完整提取关键事件，每项包含 id,summary,sourceExcerpt,participants。
特别提取：人物称谓的来源、关系变化、承诺与拒绝、时间跳跃、失踪或离开、结尾问题等会影响理解的事实。
没有依据的外貌不要当作事实，放入 ambiguities。`;
}

export function adaptationPrompt(input: ValidPipelineRequest, bible: unknown) {
  return `你是以“让陌生读者看懂”为第一职责的漫画叙事编辑。根据原文和 Story Bible 制定可执行的改编方案。
${narrativePriority}
改编政策：${modePolicy[input.mode]}
${outputLanguageRule(input)}
目标格数：${input.panelCount}
视觉风格：${input.style}

Story Bible：${JSON.stringify(bible)}
原文：${input.sourceText}

先建立 Narrative Spine，再分配画格。任何视觉母题、金句或漂亮场面，都不能排在因果桥梁之前。
如果目标格数不足，必须删减旁支轶事并保留一条完整主线；不要把互不相干的精彩片段各画一格。
非线性叙事只有在它比顺叙更清楚且每次跳转都有明确的时间/地点/过渡标记时才能采用。

严格返回 JSON：narrativeSpine,approach,pacing,visualStrategy,chronologyStrategy,sequences,decisions。
narrativeSpine 包含 protagonist,setup,goal,obstacle,stakes,incitingIncident,turningPoint,resolution,centralQuestion,causalChain,indispensableFacts。
causalChain 用读者能懂的“因为 A，所以 B”句子按顺序列出；indispensableFacts 是删掉后故事会误读的事实。
sequences 每项包含 id,title,purpose,time,location,transitionIn,panelBudget,requiredInformation；所有 panelBudget 之和必须等于 ${input.panelCount}。
每个 sequence 都必须是一个可理解的小场景，而不是同一主题的素材集合。
decisions 每项包含 id,source,decision,reason,provenance；provenance 只能是 SOURCE、INFERENCE、CREATIVE。`;
}

export function storyboardPrompt(input: ValidPipelineRequest, bible: unknown, adaptation: unknown) {
  return `你是分镜导演和 Prompt Compiler。你的输出将被逐格交给文生图模型，再把读者文字排入画面组成连环画。
${narrativePriority}
生成恰好 ${input.panelCount} 个连续漫画分镜。每格只表达一个主要动作，但一个场景应使用“建立—行动—反应—结果”所需的连续镜头，而不是每个轶事只配一张孤立插图。
${outputLanguageRule(input)}
画面风格：${input.style}
改编政策：${modePolicy[input.mode]}

Story Bible：${JSON.stringify(bible)}
改编方案：${JSON.stringify(adaptation)}

硬性规则：
- 首次出现的人物，必须通过读者可见的旁白/对白或清晰行动交代身份和关系。
- 第一场必须让读者知道基本时间、地点、主角处境和故事问题。
- 每次时间、地点或叙事层级跳转，必须在 timeCard、locationCard 或 transitionCaption 中给出读者可见的桥梁；不能只写在 continuity、storyPurpose 或 sourceExcerpt。
- causeFromPrevious 用一句话说明本格为什么接在上一格之后；readerLearns 写本格让读者新增理解的一个关键信息。
- 原文中的核心前提、因果、称谓来源、关键拒绝/承诺、离开与结局，必须出现在画面可表现的行动或 narration/dialogue/transitionCaption 中，不能只存在于制作元数据。
- narration、dialogue、timeCard、locationCard、transitionCaption 是后期排版给读者看的最终文字，要短而明确；关键事实不能依赖文生图模型生成文字。
- 原文是转述而不是直接引语时，不得机械复制为对白。dialogue 必须站在说话者视角重写并核对人称、称谓与指代；narration 和 dialogue 不得表达互相矛盾的句子。
- 每个跨格道具都要维护明确状态与位置，例如“碎片在宿舍桌上 → 放进书包 → 从书包掉出”；不得让物品无过渡地换位置，也不得同时声称同一物品在两个地方。
- prompt 是纯画面指令，不包含要渲染的字幕或对白。每条 prompt 必须自足，重复稳定人物外观、动作、环境、镜头、构图、光照与统一风格，并与 action、narration、dialogue 表达同一事件；不能让旁白写“翻日志”而画面只画“拿相机”。
- 信件、招牌、作品牌、手机等故事内文字，由 prompt 描述其载体和留给后期排字的清晰区域；精确文字写入 narration/dialogue/transitionCaption，禁止要求文生图模型正确拼写长句。
- negativePrompt 不得否定正向 prompt 已要求的时代、人物、道具、车辆、场景或光线。例如画面有手机/车站时不能写“不要现代元素”，画面有汽车时不能写“不要现代汽车”。
- 先保证完整因果链，再考虑空镜、象征物与抒情留白。不得用象征画面替代首次交代关键事实。
- 在返回 JSON 前逐格执行四项自检：对白人称、道具位置、action 与 prompt 对齐、positive/negative prompt 无冲突；再模拟一个没读过原文的读者，只看预期画面和读者文字复述故事。任一项失败都先重写，不要输出不合格草稿。

严格返回 JSON 对象 {"panels": [...]}。
每格字段：id,order,sequenceId,sequenceTitle,sourceExcerpt,storyPurpose,causeFromPrevious,readerLearns,timeCard,locationCard,transitionCaption,characters,location,action,emotion,shotSize,cameraAngle,composition,lighting,continuity,prompt,negativePrompt,narration,dialogue,provenance。
无需显示的 timeCard/locationCard/transitionCaption 返回空字符串；除第一格外 causeFromPrevious 不得为空；readerLearns 不得为空。
negativePrompt 只写不会与正向 prompt 冲突的视觉缺陷。provenance 是 SOURCE/INFERENCE/CREATIVE 数组。`;
}

function readerVisiblePacket(panels: PromptCard[]) {
  return panels.map((panel) => ({
    order: panel.order,
    timeCard: panel.timeCard,
    locationCard: panel.locationCard,
    transitionCaption: panel.transitionCaption,
    intendedImage: {
      visibleSubjectCount: panel.characters.length,
      observableAction: panel.characters.reduce(
        (action, character) => action.split(character).join("[visible character]"),
        panel.action
      ),
      emotion: panel.emotion,
      composition: panel.composition
    },
    narration: panel.narration,
    dialogue: panel.dialogue
  }));
}

export function coldReadPrompt(input: ValidPipelineRequest, panels: PromptCard[]) {
  return `你是一名第一次看到这部连环画的普通读者。你没有读过原文，也看不到 Story Bible、改编方案、原文摘录、storyPurpose、causeFromPrevious、readerLearns 或 continuity。
${outputLanguageRule(input)}
下面只有读者最终能看到的预期画面信息与排版文字。intendedImage 已移除制作系统使用的人名和地点标签；人物身份、关系与地点名称只有被旁白、对白、时间卡、地点卡或清楚的可见行动交代后，读者才可能知道。不要替作者补充常识之外的剧情，也不要因为画面漂亮而提高分数。

标题：${input.title}
读者可见连环画：${JSON.stringify(readerVisiblePacket(panels))}

请先用自己的话复述故事，再检查陌生读者是否能明确回答：
1. 主角是谁，与关键人物是什么关系；
2. 主角想要什么或面临什么问题；
3. 每个关键事件为什么导致下一个事件；
4. 故事何时何地发生，所有时空跳转是否能识别；
5. 结尾实际发生了什么、意味着什么。

passed 只有在以上五项都能由可见内容回答、且不存在会改变故事理解的缺口时才能为 true。
understoodCharacters 必须填写读者实际理解到的具体人物身份与关系句子；understoodTimeline 必须填写实际识别到的时间顺序与地点变化。禁止用 true、false、yes、no 代替具体内容。
严格返回 JSON：passed,score,retelling,understoodCharacters,understoodTimeline,unclearPoints,missingLinks。score 为 0-100。`;
}

export function clarityRevisionPrompt(
  input: ValidPipelineRequest,
  bible: unknown,
  adaptation: unknown,
  panels: PromptCard[],
  coldRead: unknown
) {
  return `你是连环画叙事修订编辑。零背景读者或总审发现当前版本存在叙事断点，请修补，而不是辩解。
${narrativePriority}
${outputLanguageRule(input)}
改编政策：${modePolicy[input.mode]}
目标格数必须仍为 ${input.panelCount}。

Story Bible：${JSON.stringify(bible)}
改编方案：${JSON.stringify(adaptation)}
当前分镜：${JSON.stringify(panels)}
零背景读者与阻断问题报告：${JSON.stringify(coldRead)}

逐项解决 unclearPoints 和 missingLinks，其中可能包含总审发现的 P0/P1 连续性或 Prompt 问题。优先调整场景取舍、格序、动作和读者可见文字；允许删掉只负责气氛或象征、却挤占因果说明的画格。
不得新增改变核心事实的事件，不得改变结局。每次时空跳转补充明确标记，每个新人物补充首次身份/关系交代。
修订时必须重新核对：直接对白的人称与说话者视角；所有关键道具逐格位置；action、narration、dialogue 与 prompt 是否描述同一事件；negativePrompt 是否否定正向画面；故事内文字是否留给后期排版而非要求模型拼写。
严格返回 JSON 对象 {"panels": [...]}，字段结构与当前分镜完全相同。返回前再次执行逐格一致性检查与零背景复述测试。`;
}

export function auditPrompt(
  input: ValidPipelineRequest,
  bible: unknown,
  adaptation: unknown,
  panels: PromptCard[],
  coldRead: unknown
) {
  return `你是严格的连环画制作总审。零背景读者的理解结果是不可被制作元数据推翻的证据。
${narrativePriority}
${outputLanguageRule(input)}
模式：${input.mode}
锁定事实：${input.lockedFacts.join("；") || "无"}
原文：${input.sourceText}
Story Bible：${JSON.stringify(bible)}
改编方案：${JSON.stringify(adaptation)}
制作分镜：${JSON.stringify(panels)}
零背景读者报告：${JSON.stringify(coldRead)}

审核规则：
- 审核忠实度时可使用原文和 Story Bible；审核读者理解时只能采信零背景读者报告及读者可见字段。
- 核心前提、人物身份/关系、因果桥梁、关键时间跳转、离开/失踪或结局缺失，必须列为 P0。
- 若 coldRead.passed=false，至少一个 P0，score 不得高于 59；存在任何 P0 时 score 不得高于 59；存在 P1 时 score 不得高于 79。
- 不要因为缺少已生成图片而惩罚，但必须检查画面计划和 Prompt 是否真的能表现 readerLearns。
- 必须逐格交叉检查 action、narration、dialogue、prompt、negativePrompt，而不是只看字段是否非空。画面主体或动作与读者文字不一致、关键道具无过渡换位置、直接对白人称/称谓错误，应至少列为 P1。
- 正向 prompt 与 negativePrompt 否定同一道具、时代、车辆、人物或场景时必须列为 P1，例如“画面有汽车”同时“避免现代汽车”。
- 文生图模型不负责可靠渲染长文字。只要精确内容已在 narration/dialogue/transitionCaption 中呈现，prompt 用信纸、招牌或作品牌及排字留白来表现载体，并用 negativePrompt 避免乱码，是正确做法；不得建议让模型直接生成精确汉字。若载体本身缺失，或读者层也没有关键文字，再列问题。
- 检查忠实模式是否把“缺失、可能、推测”擅自改成“被撕毁、确定、故意”等更强事实；检查新增背景人物或反应是否改变原文含义。

严格返回 JSON：score,summary,issues,checks。
issues 每项包含 id,severity,target,message,suggestion，severity 只能是 P0/P1/P2。
checks 包含 narrativeComprehension,causalCompleteness,chronologyLegibility,characterClarity,faithfulness,continuity,visualClarity,promptQuality，均为 0-100。`;
}

export function aiEditPrompt(
  input: ValidPipelineRequest,
  target: "bible" | "adaptation" | "storyboard",
  instruction: string,
  artifact: unknown,
  context: unknown
) {
  const targetName = { bible: "Story Bible", adaptation: "Adaptation Plan", storyboard: "Storyboard Prompts" }[target];
  return `你是视觉叙事项目的 AI 编辑助手。用户希望修改 ${targetName}。
${narrativePriority}
${outputLanguageRule(input)}
你必须提出最小、可解释、可应用的修改，不得擅自改变用户没有要求的事实。
锁定事实始终优先：${input.lockedFacts.join("；") || "无"}

用户要求：${instruction}
当前产物：${JSON.stringify(artifact)}
上游上下文：${JSON.stringify(context)}

严格返回 JSON：summary,rationale,changes,revisedArtifact。
changes 每项包含 field,before,after,reason，便于用户确认。
revisedArtifact 必须是完整修改后的 ${targetName}，结构与当前产物完全一致，不能只返回差异。
如果要求违反锁定事实，不要应用该冲突；在 rationale 中明确解释。`;
}
