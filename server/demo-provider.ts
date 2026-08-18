import type { AdaptationPlan, AiEditProposal, AuditReport, Character, PromptCard, StoryBible } from "../src/types.js";
import type { ValidPipelineRequest } from "./schemas.js";
import type { NarrativeProvider } from "./provider.js";

const splitSentences = (text: string) => text
  .split(/(?<=[。！？!?；;.])/)
  .map((sentence) => sentence.trim())
  .filter(Boolean);

const cleanExcerpt = (value: string, max = 72) => value.length > max ? `${value.slice(0, max)}…` : value;

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
      timeline: sentences.slice(0, Math.min(sentences.length, 8)).map((sentence, index) => ({
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
    return {
      approach: modeText,
      pacing: english
        ? `${input.panelCount}-panel structure: establish the setting, advance events through the middle, and preserve emotional resonance at the end.`
        : `${input.panelCount} 格结构：开场建立环境，中段推进事件，结尾保留情绪余韵。`,
      visualStrategy: english
        ? `${input.style}; use wide shots to establish space, medium and close shots for action, and close-ups for emotion and key objects.`
        : `${input.style}；使用远景建立空间、中近景表现动作、特写呈现情绪与关键物件。`,
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

  async buildStoryboard(input: ValidPipelineRequest, bible: StoryBible): Promise<PromptCard[]> {
    const sentences = splitSentences(input.sourceText);
    const english = prefersEnglish(input.sourceText);
    const shotCycle = english ? [
      ["Wide shot", "Eye level"], ["Medium shot", "Rear three-quarter"], ["Close shot", "Eye level"], ["Close-up", "Slight high angle"],
      ["Medium wide", "Low angle"], ["Close shot", "Over the shoulder"]
    ] : [
      ["远景", "平视"], ["中景", "侧后方"], ["近景", "平视"], ["特写", "轻微俯视"],
      ["中远景", "低机位"], ["近景", "过肩视角"]
    ];
    const characters = bible.characters.map((item) => item.name);
    const absentCharacters = new Set(input.lockedFacts.flatMap((fact) => {
      if (english) return characters.filter((name) => fact.includes(name) && /does not appear|is absent/i.test(fact));
      const match = fact.match(/^(.+?)没有(?:在现实场景中出现|出现在现实场景中)/);
      return match ? [match[1]] : [];
    }));
    return Array.from({ length: input.panelCount }, (_, index) => {
      const sourceIndex = input.panelCount === 1 ? 0 : Math.round(index * (sentences.length - 1) / (input.panelCount - 1));
      const source = (sentences[Math.max(0, sourceIndex)] || input.sourceText).replace(/^[”’]+/, "");
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
      return {
        id: `panel_${String(index + 1).padStart(3, "0")}`,
        order: index + 1,
        sourceExcerpt: source,
        storyPurpose: purpose,
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
          ? `${input.style}. ${shotSize}, ${cameraAngle}. ${panelCharacters.join(" and ") || "environment-only shot"}, ${action}. ${isFirst ? "Place the character near the frame edge and establish a clear spatial relationship with the environment" : "Show a clear action with layered depth between the subject and key object"}. ${creative ? "Use glass reflections and negative space to overlap memory with the present." : "Express emotion through posture, gaze, and environmental detail."} Consistent character design, continuous clothing and setting, soft environmental light, narrative composition, no text.`
          : `${input.style}。${shotSize}，${cameraAngle}。${panelCharacters.join("与") || "环境空镜"}，${action}。${isFirst ? "人物位于画面边缘，环境建立明确空间关系" : "人物动作清晰，主体与关键物件形成前后景"}。${creative ? "通过玻璃倒影和留白表现记忆与现实的重叠。" : "情绪通过姿态、视线和环境细节表达。"}统一角色设计，连续的服装与场景，柔和环境光，叙事性构图，无文字。`,
        negativePrompt: english
          ? "text, watermark, signature, extra people, duplicate limbs, malformed fingers, character drift, clothing changes, contradictory scene structure, overcrowded composition"
          : "文字，水印，签名，多余人物，重复肢体，错误手指，人物外观漂移，服装变化，场景结构矛盾，过度拥挤的构图",
        narration: isFirst || isLast ? cleanExcerpt(source.replace(/[“”]/g, ""), 42) : "",
        dialogue: /[“”]/.test(source) ? (source.match(/“([^”]+)”/)?.[1] || "") : "",
        provenance: creative ? ["SOURCE", "CREATIVE"] : ["SOURCE", "INFERENCE"]
      };
    });
  }

  async audit(input: ValidPipelineRequest, bible: StoryBible, panels: PromptCard[]): Promise<AuditReport> {
    const english = prefersEnglish(input.sourceText);
    const issues = [];
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
      score: issues.length ? 86 : 94,
      summary: english
        ? "The storyboard covers the major events and the prompt structure is complete. Confirm unspecified character visuals before final image generation."
        : "分镜已覆盖主要事件，Prompt 结构完整；正式出图前建议确认未明确的人物视觉设定。",
      issues,
      checks: { faithfulness: 92, continuity: 84, visualClarity: 88, promptQuality: 89 }
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
