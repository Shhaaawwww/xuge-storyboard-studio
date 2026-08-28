import type { AdaptationPlan, AiEditProposal, AuditReport, Character, ColdReadReport, PromptCard, StoryBible } from "../src/types.js";
import type { ValidPipelineRequest } from "./schemas.js";
import type { NarrativeProvider } from "./provider.js";

const splitSentences = (text: string) => text
  .split(/(?<=[。！？!?；;.])/)
  .map((sentence) => sentence.trim())
  .filter(Boolean);

const cleanExcerpt = (value: string, max = 72) => value.length > max ? `${value.slice(0, max)}…` : value;

function narrativeImportance(sentence: string) {
  let value = 0;
  if (/[“”"][^“”"]+[“”"]/.test(sentence)) value += 45;
  if (/五千万|取卵|叫我|称呼|昵称|条件|让我想想|会留下来吗|如果.+留下|没有人再见|再也没见|以后没见|what if|nickname|call me|never saw|never seen|condition/i.test(sentence)) value += 140;
  if (/因为|所以|但是|却|拒绝|答应|决定|发现|终于|离开|失踪|留下|结果|于是|therefore|because|but|refused|promised|decided|discovered|finally|left|disappeared/i.test(sentence)) value += 80;
  if (/父亲|母亲|恋人|朋友|丈夫|妻子|father|mother|partner|friend|husband|wife/i.test(sentence)) value += 45;
  if (/\d|年后|年前|当天|第二天|后来|之后|before|after|later|next day/i.test(sentence)) value += 35;
  return value;
}

function selectNarrativeSentences(sentences: string[], count: number) {
  if (sentences.length <= count) {
    return Array.from({ length: count }, (_, index) => {
      const sourceIndex = count === 1 ? 0 : Math.round(index * (sentences.length - 1) / (count - 1));
      return sentences[Math.max(0, sourceIndex)] || "";
    });
  }

  const selected = new Set<number>([0, sentences.length - 1]);
  const important = sentences
    .map((sentence, index) => ({ index, score: narrativeImportance(sentence) }))
    .filter((item) => item.index > 0 && item.index < sentences.length - 1 && item.score >= 80)
    .sort((left, right) => right.score - left.score || left.index - right.index);
  for (const item of important) {
    if (selected.size >= count) break;
    selected.add(item.index);
  }
  while (selected.size < count) {
    const candidates = sentences
      .map((sentence, index) => ({ index, score: narrativeImportance(sentence) }))
      .filter((item) => !selected.has(item.index))
      .map((item) => ({
        ...item,
        distance: Math.min(...[...selected].map((chosen) => Math.abs(chosen - item.index)))
      }))
      .sort((left, right) => right.distance - left.distance || right.score - left.score || left.index - right.index);
    selected.add(candidates[0].index);
  }
  return [...selected].sort((left, right) => left - right).map((index) => sentences[index]);
}

const prefersEnglish = (text: string) => {
  const latin = text.match(/[A-Za-z]/g)?.length || 0;
  const cjk = text.match(/[\u3400-\u9fff]/g)?.length || 0;
  return latin > cjk * 2;
};

function inferEnglishNames(text: string) {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)) {
    const name = match[1];
    if (text.split(name).length - 1 >= 2) found.add(name);
  }
  return [...found].slice(0, 4);
}

function inferNames(text: string): string[] {
  if (prefersEnglish(text)) return inferEnglishNames(text);
  const found = new Set<string>();
  const stopWords = new Set(["许多", "很多", "没有", "已经", "还是", "终于", "自己", "这里", "那里", "时候", "一个", "什么", "满了灰", "黄的信", "小了许", "放着一"]);
  const surname = "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元顾孟平黄和穆萧尹姚邵汪祁毛禹狄米贝明臧计伏成戴宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林钟徐邱骆高夏蔡田樊胡凌霍虞万支柯管卢莫房裘缪干解应宗丁宣邓郁单杭洪包诸左石崔吉龚程邢裴陆荣翁荀羊甄曲封储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全班仰秋仲伊宫宁仇栾暴甘厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰鄂索咸籍赖卓蔺屠蒙池乔阴郁胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍桑桂濮牛寿通边扈燕冀浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公";
  const regex = new RegExp(`([${surname}][\\u4e00-\\u9fa5]{1,2})(?=说|问|答|看|想|走|回|推|站|坐|拿|发现|听见|望|来到|离开|，|。)`, "g");
  for (const match of text.matchAll(regex)) {
    const name = match[1];
    const occurrences = text.split(name).length - 1;
    if (occurrences >= 2 && !stopWords.has(name) && !/[的了着过是在和与]/.test(name)) found.add(name);
  }
  for (const relationship of ["父亲", "母亲", "爷爷", "奶奶", "外公", "外婆", "哥哥", "姐姐", "弟弟", "妹妹"]) {
    if (text.includes(relationship)) found.add(relationship);
  }
  return [...found].slice(0, 4);
}

function characterFor(name: string, index: number, english: boolean): Character {
  return {
    id: `character_${index + 1}`,
    name,
    role: english ? (index === 0 ? "Protagonist" : "Story character") : (index === 0 ? "主要人物" : "故事人物"),
    appearance: [english ? "Not specified by the source; confirm before image generation" : "原文未明确，生成前需要用户确认"],
    personality: [english ? "Confirm through actions and dialogue" : "由行动与对白进一步确认"],
    visualMotifs: [english
      ? (index === 0 ? "Visually connected to the story's central object" : "Maintain recognizable features across panels")
      : (index === 0 ? "与故事核心物件形成视觉联系" : "保持跨格可识别特征")],
    lockedFacts: []
  };
}

export class DemoProvider implements NarrativeProvider {
  readonly name = "demo/heuristic";

  async buildStoryBible(input: ValidPipelineRequest): Promise<StoryBible> {
    const sentences = splitSentences(input.sourceText);
    const english = prefersEnglish(input.sourceText);
    const names = inferNames(input.sourceText);
    const characters = (names.length ? names : [english ? "Narrator" : "叙述者"]).map((name, index) => characterFor(name, index, english));
    return {
      logline: cleanExcerpt(sentences.slice(0, 2).join(""), 110),
      themes: english
        ? (input.mode === "faithful" ? ["Memory", "Event reconstruction"] : ["Memory", "Change", "People and place"])
        : (input.mode === "faithful" ? ["记忆", "事件还原"] : ["记忆", "变化", "人与空间"]),
      narrativeVoice: english
        ? (/\bI\b|\bwe\b/i.test(input.sourceText) ? "First person" : "Third person")
        : (/我|我们/.test(input.sourceText) ? "第一人称" : "第三人称"),
      characters,
      locations: [{
        id: "location_1",
        name: english
          ? (/hometown|house|home/i.test(input.sourceText) ? "The old family home and its surroundings" : "Primary setting")
          : (/故乡|老屋|家/.test(input.sourceText) ? "故事中的旧居与周边" : "主要场景"),
        description: english ? "Build spatial relationships from the source; add unspecified details during visual development." : "依据原文建立空间关系，未明确的细节需要在视觉设定阶段补充。",
        fixedElements: [english ? "Keep entrances, major furniture, and landmark objects spatially consistent" : "保持出入口、主要家具与标志性物件的位置连续"]
      }],
      timeline: sentences.slice(0, Math.min(sentences.length, 200)).map((sentence, index) => ({
        id: `event_${index + 1}`,
        summary: cleanExcerpt(sentence, 56),
        sourceExcerpt: sentence,
        participants: characters.slice(0, index === 0 ? 1 : 2).map((item) => item.name)
      })),
      lockedFacts: input.lockedFacts,
      ambiguities: english
        ? ["Exact character appearances are not confirmed by the source", "Weather, period, and spatial layout require confirmation"]
        : ["人物精确外貌尚未由原文确认", "天气、年代和空间布局需要用户确认"]
    };
  }

  async buildAdaptation(input: ValidPipelineRequest, bible: StoryBible): Promise<AdaptationPlan> {
    const english = prefersEnglish(input.sourceText);
    const modeText = english ? {
      faithful: "Build a clear event chain in source order, adding only actions and environments required to make each image work.",
      adapted: "Preserve core events while organizing comic pacing around arrival, discovery, reaction, and emotional aftermath.",
      artistic: "Preserve core facts while using reflections, environmental shots, and subjective framing to strengthen the theme of memory."
    }[input.mode] : {
      faithful: "按原文顺序建立清晰的事件链，只添加画面成立所需的动作与环境。",
      adapted: "保留核心事件，以进入、发现、反应和余韵组织漫画节奏。",
      artistic: "保留核心事实，通过倒影、空镜和主观镜头强化记忆主题。"
    }[input.mode];
    const firstEvent = bible.timeline[0]?.summary || bible.logline;
    const middleEvent = bible.timeline[Math.floor(bible.timeline.length / 2)]?.summary || firstEvent;
    const finalEvent = bible.timeline.at(-1)?.summary || middleEvent;
    const indispensableEvents = bible.timeline
      .map((event, index) => ({ event, index, score: narrativeImportance(event.sourceExcerpt) }))
      .filter((item) => item.score >= 80)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, Math.max(3, Math.min(12, input.panelCount - 2)))
      .sort((left, right) => left.index - right.index)
      .map((item) => item.event.summary);
    const sequenceCount = Math.min(3, input.panelCount);
    const baseBudget = Math.floor(input.panelCount / sequenceCount);
    const remainder = input.panelCount % sequenceCount;
    const sequenceNames = english ? ["Setup", "Development", "Resolution"] : ["建立处境", "推进冲突", "完成结果"];
    const sequenceEvents = [firstEvent, middleEvent, finalEvent];
    const sequences = Array.from({ length: sequenceCount }, (_, index) => ({
      id: `sequence_${index + 1}`,
      title: sequenceNames[index],
      purpose: english
        ? ["Introduce the protagonist, time, place, and central situation", "Show how actions and discoveries change the situation", "Resolve the event and make the ending understandable"][index]
        : ["交代主角、时间、地点与核心处境", "通过行动与发现推进因果", "完成事件并让结局含义清楚"][index],
      time: english ? (index === 0 ? "Story opening" : "Continuous from the previous sequence") : (index === 0 ? "故事开始时" : "承接上一段"),
      location: bible.locations[0]?.name || (english ? "Primary setting" : "主要场景"),
      transitionIn: index === 0 ? "" : (english ? "Because of the previous discovery, the story moves to the next consequence." : "由于上一段的发现，故事进入下一步结果。"),
      panelBudget: baseBudget + (index < remainder ? 1 : 0),
      requiredInformation: [sequenceEvents[index]]
    }));
    return {
      narrativeSpine: {
        protagonist: bible.characters[0]?.name || (english ? "The protagonist" : "主角"),
        setup: firstEvent,
        goal: english ? "Understand and respond to the central event in the source" : "理解并回应原文中的核心事件",
        obstacle: middleEvent,
        stakes: english ? "The protagonist must act or remain trapped in the unresolved situation" : "主角必须采取行动，否则核心处境将继续悬而未决",
        incitingIncident: firstEvent,
        turningPoint: middleEvent,
        resolution: finalEvent,
        centralQuestion: english ? "What will the protagonist do after confronting the central discovery?" : "主角面对核心发现后会如何行动？",
        causalChain: bible.timeline.slice(1).map((event, index) => english
          ? `After ${bible.timeline[index].summary}, ${event.summary}`
          : `“${bible.timeline[index].summary}”之后，“${event.summary}”`),
        indispensableFacts: [...new Set([firstEvent, ...indispensableEvents, middleEvent, finalEvent].filter(Boolean))]
      },
      approach: modeText,
      pacing: english
        ? `${input.panelCount}-panel structure: establish the setting, advance events through the middle, and preserve emotional resonance at the end.`
        : `${input.panelCount} 格结构：开场建立环境，中段推进事件，结尾保留情绪余韵。`,
      visualStrategy: english
        ? `${input.style}; use wide shots to establish space, medium and close shots for action, and close-ups for emotion and key objects.`
        : `${input.style}；使用远景建立空间、中近景表现动作、特写呈现情绪与关键物件。`,
      chronologyStrategy: english
        ? "Use readable chronological order; mark every scene change with a visible time, place, or transition caption."
        : "采用清楚的顺叙；每次场景切换都用读者可见的时间、地点或转场字幕标记。",
      sequences,
      decisions: bible.timeline.slice(0, input.panelCount).map((event, index) => ({
        id: `decision_${index + 1}`,
        source: event.sourceExcerpt,
        decision: english
          ? (index === 0 ? "Use as an establishing shot" : index === bible.timeline.length - 1 ? "Use as the emotional close" : "Translate into visible action")
          : (index === 0 ? "作为建立镜头" : index === bible.timeline.length - 1 ? "作为情绪收束" : "转化为可见动作"),
        reason: english ? "Give every panel one clear narrative purpose" : "保证每格承担一个明确叙事功能",
        provenance: index % 3 === 2 && input.mode !== "faithful" ? "INFERENCE" : "SOURCE"
      }))
    };
  }

  async buildStoryboard(input: ValidPipelineRequest, bible: StoryBible, plan: AdaptationPlan): Promise<PromptCard[]> {
    const sentences = splitSentences(input.sourceText);
    const selectedSentences = selectNarrativeSentences(sentences, input.panelCount);
    const english = prefersEnglish(input.sourceText);
    const shotCycle = english ? [
      ["Wide shot", "Eye level"], ["Medium shot", "Rear three-quarter"], ["Close shot", "Eye level"], ["Close-up", "Slight high angle"],
      ["Medium wide", "Low angle"], ["Close shot", "Over the shoulder"]
    ] : [
      ["远景", "平视"], ["中景", "侧后方"], ["近景", "平视"], ["特写", "轻微俯视"],
      ["中远景", "低机位"], ["近景", "过肩视角"]
    ];
    const characters = bible.characters.map((item) => item.name);
    const sequenceSlots = plan.sequences.flatMap((sequence) => Array.from({ length: sequence.panelBudget }, () => sequence));
    const absentCharacters = new Set(input.lockedFacts.flatMap((fact) => {
      if (english) return characters.filter((name) => fact.includes(name) && /does not appear|is absent/i.test(fact));
      const match = fact.match(/^(.+?)没有(?:在现实场景中出现|出现在现实场景中)/);
      return match ? [match[1]] : [];
    }));
    return Array.from({ length: input.panelCount }, (_, index) => {
      const source = (selectedSentences[index] || input.sourceText).replace(/^[”’]+/, "");
      const [shotSize, cameraAngle] = shotCycle[index % shotCycle.length];
      const isFirst = index === 0;
      const isLast = index === input.panelCount - 1;
      const creative = input.mode === "artistic" && index % 3 === 1;
      const action = cleanExcerpt(source.replace(/[“”]/g, "").replace(/[。！？!?；;]+$/, ""), 48);
      const panelCharacters = characters.filter((name, characterIndex) =>
        !absentCharacters.has(name) && (characterIndex === 0 || source.includes(name))
      );
      const location = english
        ? (/station|awning|platform/i.test(source)
            ? "Hometown station"
            : /river|old road/i.test(source)
              ? "Old road by the river"
              : /house|courtyard|living room|clock|window|letter/i.test(source)
                ? "Old family house"
                : (bible.locations[0]?.name || "Primary setting"))
        : (/车站|站台|雨棚/.test(source)
            ? "故乡车站"
            : /河边|旧路/.test(source)
              ? "河边旧路"
              : /老屋|院门|客厅|挂钟|窗边|信/.test(source)
                ? "老屋"
                : (bible.locations[0]?.name || "主要场景"));
      const purpose = english
        ? (isFirst ? "Establish time, place, and the character's situation" : isLast ? "Complete the event and leave emotional resonance" : "Advance the action and reveal the character's reaction")
        : (isFirst ? "建立时间、地点与人物处境" : isLast ? "完成事件并留下情绪余韵" : "推进动作并呈现人物反应");
      const sequence = sequenceSlots[index] || plan.sequences.at(-1) || {
        id: "sequence_1",
        title: english ? "Main sequence" : "主线",
        time: english ? "Story time" : "故事时间",
        location,
        transitionIn: ""
      };
      const previousSequence = index > 0 ? sequenceSlots[index - 1] : undefined;
      const sequenceBoundary = isFirst || previousSequence?.id !== sequence.id;
      const characterDesign = bible.characters
        .filter((character) => panelCharacters.includes(character.name))
        .map((character) => `${character.name}: ${character.appearance.join(", ")}`)
        .join("; ");
      return {
        id: `panel_${String(index + 1).padStart(3, "0")}`,
        order: index + 1,
        sequenceId: sequence.id,
        sequenceTitle: sequence.title,
        sourceExcerpt: source,
        storyPurpose: purpose,
        causeFromPrevious: isFirst
          ? ""
          : (english ? "The previous action or discovery directly leads to this response." : "上一格的行动或发现直接引出本格的反应。"),
        readerLearns: cleanExcerpt(source.replace(/[“”]/g, ""), 80),
        timeCard: sequenceBoundary ? sequence.time : "",
        locationCard: sequenceBoundary ? (sequence.location || location) : "",
        transitionCaption: !isFirst && sequenceBoundary ? sequence.transitionIn : "",
        characters: panelCharacters,
        location,
        action,
        emotion: english
          ? (isFirst ? "Restrained, slightly hesitant" : isLast ? "Quiet, complex resonance" : "Focused, gradually changing")
          : (isFirst ? "克制、略带迟疑" : isLast ? "安静、复杂的余韵" : "专注、逐渐变化"),
        shotSize,
        cameraAngle,
        composition: english
          ? (isFirst ? "Place the character near the frame edge and let the environment dominate" : "Create a clear foreground-background relationship between the subject and key object")
          : (isFirst ? "人物置于画面边缘，环境占据大部分画面" : "主体与关键物件形成清晰的前后景关系"),
        lighting: english ? "Consistent soft environmental light with clear tonal separation in key areas" : "统一的柔和环境光，关键区域有明确明暗层次",
        continuity: english ? [
          `Use the character design for ${characters[0] || "the protagonist"} exactly`,
          "Keep fixed scene objects spatially consistent",
          "Carry clothing, time, and weather forward from the previous panel"
        ] : [
          `人物外观严格引用 ${characters[0] || "主角"} 的角色设定`,
          "场景固定物件保持位置连续",
          "服装、时间与天气承接上一格"
        ],
        prompt: english
          ? `${input.style}. ${shotSize}, ${cameraAngle}. ${characterDesign || "environment-only shot"}. ${action}. ${isFirst ? "Place the character near the frame edge and establish a clear spatial relationship with the environment" : "Show a clear action with layered depth between the subject and key object"}. ${creative ? "Use restrained reflections only after the literal action remains unmistakable." : "Express emotion through posture, gaze, and environmental detail."} Repeat the stated character design exactly, preserve clothing and setting continuity, soft environmental light, narrative composition, no text, no letters, no speech bubbles.`
          : `${input.style}。${shotSize}，${cameraAngle}。${characterDesign || "环境空镜"}。${action}。${isFirst ? "人物位于画面边缘，环境建立明确空间关系" : "人物动作清晰，主体与关键物件形成前后景"}。${creative ? "只在真实动作仍然一目了然的前提下使用克制的倒影。" : "情绪通过姿态、视线和环境细节表达。"}严格重复上述人物设计，保持服装与场景连续，柔和环境光，叙事性构图，无文字、无字母、无对白框。`,
        negativePrompt: english
          ? "text, watermark, signature, extra people, duplicate limbs, malformed fingers, character drift, clothing changes, contradictory scene structure, overcrowded composition"
          : "文字，水印，签名，多余人物，重复肢体，错误手指，人物外观漂移，服装变化，场景结构矛盾，过度拥挤的构图",
        narration: cleanExcerpt(source.replace(/[“”]/g, ""), 80),
        dialogue: /[“”]/.test(source) ? (source.match(/“([^”]+)”/)?.[1] || "") : "",
        provenance: creative ? ["SOURCE", "CREATIVE"] : ["SOURCE", "INFERENCE"]
      };
    });
  }

  async coldRead(input: ValidPipelineRequest, panels: PromptCard[]): Promise<ColdReadReport> {
    const english = prefersEnglish(input.sourceText);
    const missingLinks: string[] = [];
    const unclearPoints: string[] = [];
    const readerText = panels.map((panel) => [panel.timeCard, panel.locationCard, panel.transitionCaption, panel.narration, panel.dialogue].join(" ")).join(" ");
    const productionCharacters = [...new Set(panels.flatMap((panel) => panel.characters))];
    const understoodCharacters = productionCharacters.filter((character) => readerText.includes(character));
    const missingCause = panels.filter((panel, index) => index > 0 && !panel.causeFromPrevious);
    const missingLearning = panels.filter((panel) => !panel.readerLearns);
    const unmarkedTransitions = panels.filter((panel, index) => (
      index > 0
      && panel.sequenceId !== panels[index - 1].sequenceId
      && !panel.timeCard
      && !panel.locationCard
      && !panel.transitionCaption
    ));
    if (panels.length !== input.panelCount) {
      missingLinks.push(english ? "The requested panel sequence is incomplete." : "目标分镜序列不完整。");
    }
    if (missingCause.length) {
      missingLinks.push(english ? "Some panels lack a causal bridge from the previous action." : "部分画格缺少与上一行动的因果桥梁。");
    }
    if (unmarkedTransitions.length) {
      missingLinks.push(english ? "Some scene changes have no visible transition." : "部分场景变化没有可见转场。");
    }
    if (missingLearning.length) {
      unclearPoints.push(english ? "Some panels add no identifiable story information." : "部分画格没有增加可识别的故事信息。");
    }
    if (!panels[0]?.timeCard || !panels[0]?.locationCard) {
      unclearPoints.push(english ? "The opening does not explicitly establish both time and place." : "开场没有同时明确时间与地点。");
    }
    if (productionCharacters.length > 0 && understoodCharacters.length === 0) {
      unclearPoints.push(english ? "The visible text never identifies the depicted characters." : "读者可见文字从未交代画面人物身份。" );
    }
    const passed = missingLinks.length === 0 && unclearPoints.length === 0;
    const score = Math.max(0, 94 - missingLinks.length * 24 - unclearPoints.length * 12);
    return {
      passed,
      score,
      retelling: [...new Set(panels.map((panel) => (
        [panel.transitionCaption, panel.narration, panel.dialogue].filter(Boolean).join(english ? " " : "；") || panel.action
      )).filter(Boolean))].join(english ? " Then " : "随后，"),
      understoodCharacters,
      understoodTimeline: panels
        .filter((panel) => panel.timeCard || panel.locationCard || panel.transitionCaption)
        .map((panel) => [panel.timeCard, panel.locationCard, panel.transitionCaption].filter(Boolean).join(english ? " · " : " · ")),
      unclearPoints,
      missingLinks
    };
  }

  async reviseStoryboardForClarity(
    input: ValidPipelineRequest,
    bible: StoryBible,
    _plan: AdaptationPlan,
    panels: PromptCard[],
    _coldRead: ColdReadReport
  ): Promise<PromptCard[]> {
    const english = prefersEnglish(input.sourceText);
    return panels.map((panel, index) => {
      const previous = panels[index - 1];
      const boundary = index > 0 && previous.sequenceId !== panel.sequenceId;
      return {
        ...panel,
        causeFromPrevious: index === 0
          ? ""
          : (panel.causeFromPrevious || (english ? "The previous action directly causes this response." : "上一格的行动直接引出本格反应。")),
        readerLearns: panel.readerLearns || panel.action,
        timeCard: index === 0
          ? (panel.timeCard || (english ? "Story opening" : "故事开始时"))
          : panel.timeCard,
        locationCard: index === 0
          ? (panel.locationCard || panel.location || bible.locations[0]?.name || (english ? "Primary setting" : "主要场景"))
          : panel.locationCard,
        transitionCaption: boundary
          ? (panel.transitionCaption || (english ? "The previous event leads into the next scene." : "上一事件推动故事进入下一场。"))
          : panel.transitionCaption,
        narration: panel.narration || panel.readerLearns || panel.action
      };
    });
  }

  async audit(
    input: ValidPipelineRequest,
    bible: StoryBible,
    plan: AdaptationPlan,
    panels: PromptCard[],
    coldRead: ColdReadReport
  ): Promise<AuditReport> {
    const english = prefersEnglish(input.sourceText);
    const issues = [];
    const compact = (value: string) => value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
    const visibleStory = compact(panels.map((panel) => [
      panel.action,
      panel.timeCard,
      panel.locationCard,
      panel.transitionCaption,
      panel.narration,
      panel.dialogue
    ].join(" ")).join(" "));
    const uncoveredFacts = plan.narrativeSpine.indispensableFacts.filter((fact) => {
      const normalized = compact(fact);
      const fingerprint = normalized.slice(0, Math.min(14, normalized.length));
      return fingerprint.length > 0 && !visibleStory.includes(fingerprint);
    });
    if (uncoveredFacts.length) {
      issues.push({
        id: "audit_story_coverage", severity: "P0" as const, target: english ? "Reader-visible story" : "读者可见故事",
        message: english ? "The storyboard omits indispensable story facts." : `分镜遗漏了不可丢失的故事事实：${uncoveredFacts.join("；")}`,
        suggestion: english ? "Replace decorative panels with the missing premise, causal turn, or resolution." : "用缺失的前提、因果转折或结局替换只承担装饰作用的画格。"
      });
    }
    if (bible.ambiguities.length) {
      issues.push({
        id: "audit_1", severity: "P1" as const, target: "Story Bible",
        message: english ? "Character appearances and some environmental details are not supported by the source." : "人物外貌和部分环境信息没有原文依据。",
        suggestion: english ? "Add character sheets before image generation, or explicitly authorize visual invention." : "正式生成前补充角色卡，或明确授权系统进行视觉创作。"
      });
    }
    if (input.panelCount > 14) {
      issues.push({
        id: "audit_2", severity: "P2" as const, target: "Storyboard",
        message: english ? "The short source is split across many panels, so some shots may feel repetitive." : "短文本被拆成较多画格，部分镜头可能重复。",
        suggestion: english ? "Combine adjacent actions or use environmental shots to carry pacing." : "合并相邻动作，或增加环境空镜承担节奏功能。"
      });
    }
    return {
      score: uncoveredFacts.length ? 55 : issues.length ? 86 : 94,
      summary: english
        ? "The storyboard covers the major events and the prompt structure is complete. Confirm unspecified character visuals before final image generation."
        : "分镜已覆盖主要事件，Prompt 结构完整；正式出图前建议确认未明确的人物视觉设定。",
      coldRead,
      autoRevisionApplied: false,
      issues,
      checks: {
        narrativeComprehension: coldRead.score,
        causalCompleteness: coldRead.passed ? 92 : 52,
        chronologyLegibility: coldRead.passed ? 92 : 55,
        characterClarity: coldRead.understoodCharacters.length ? 88 : 45,
        faithfulness: uncoveredFacts.length ? 52 : 92,
        continuity: 88,
        visualClarity: 88,
        promptQuality: panels.every((panel) => panel.prompt) ? 91 : 45
      }
    };
  }

  async proposeEdit(
    _input: ValidPipelineRequest,
    target: AiEditProposal["target"],
    instruction: string,
    artifact: unknown,
    _context: unknown
  ): Promise<AiEditProposal> {
    const english = prefersEnglish(_input.sourceText);
    const revisedArtifact = structuredClone(artifact) as StoryBible | AdaptationPlan | PromptCard[];
    if (target === "bible") {
      const bible = revisedArtifact as StoryBible;
      bible.ambiguities = [...bible.ambiguities, english ? `User edit request: ${instruction}` : `用户编辑要求：${instruction}`];
    } else if (target === "adaptation") {
      const adaptation = revisedArtifact as AdaptationPlan;
      adaptation.decisions = [...adaptation.decisions, {
        id: `decision_user_${adaptation.decisions.length + 1}`,
        source: english ? "User edit request" : "用户编辑要求",
        decision: instruction,
        reason: english ? "Requested by the user through the AI editing assistant" : "由用户通过 AI 编辑助手提出",
        provenance: "CREATIVE"
      }];
    } else {
      for (const panel of revisedArtifact as PromptCard[]) {
        panel.continuity = [...panel.continuity, instruction];
      }
    }
    return {
      target,
      summary: english ? "Converted the request into an applicable structured revision" : "已把用户要求整理为可应用的结构化修改",
      rationale: english
        ? "Demo mode uses deterministic rules. A connected model can provide more precise field-level changes."
        : "演示模式使用确定性规则生成建议；连接模型后会给出更精细的字段级调整。",
      changes: [{
        field: target,
        before: english ? "Current version" : "当前版本",
        after: instruction,
        reason: english ? "Responds to the user's editing request" : "响应用户编辑要求"
      }],
      revisedArtifact
    };
  }
}
