
import { GoogleGenAI, Type } from "@google/genai";
import { WordOption, Scene, StoryPage, CharacterInfo, CharacterUsage, SceneUsage, ChunkUsage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// AI 响应数据（不是完整的 GameState）
export interface AIResponse {
  aiComment: string;
  scene: Scene;
  nextOptions: WordOption[];
  characterInfo?: CharacterInfo;  // AI 识别的角色信息
}

// 历史数据接口（传递给 AI）
export interface StoryHistory {
  characters: CharacterUsage[];  // 角色使用历史
  scenes: SceneUsage[];          // 场景使用历史
  totalStories: number;          // 总故事数
}

// Chunk 学习上下文（传递给 AI）
export interface ChunkContext {
  masteredChunks: string[];      // 已掌握的 chunks (10+次)
  familiarChunks: string[];      // 熟悉的 chunks (6-10次)
  learningChunks: string[];      // 学习中的 chunks (3-5次)
  newChunks: string[];           // 新 chunks (1-2次)
  chunksForReview: string[];     // 需要复习的 chunks
}

/**
 * AI Prompt 职责清单：
 * 
 * 1. ✅ 生成场景感的提示问题 (aiComment)
 * 2. ✅ 提供 2 个自然语言短语选项 (nextOptions)
 * 3. ✅ 为每个选项判断是否会完成句子 (willComplete)
 * 4. ✅ 提供简单的英文解释 (explanation)
 * 5. ✅ 根据故事内容更新场景 (scene)
 * 
 * ❌ 避免 case by case:
 * - 不列举禁止词列表（如 to/in/on/at）
 * - 用原则和判断标准，而非具体规则
 * - 让 AI 根据语义理解，而非死记规则
 */
const SYSTEM_INSTRUCTION = `
You are Dino 🦖, helping learners practice SPOKEN English through storytelling.

**Core Principles:**
1. Output: ENGLISH ONLY
2. Goal: Natural spoken chunks (how natives SAY it)
3. Safety: No dangerous behaviors (water alone, fire, heights, strangers)
4. Chunks: Track and reinforce through repetition

**Chunk Strategy (if context provided):**
- Mastered (10+): Use naturally
- Familiar (6-10): Reinforce in new contexts  
- Learning (3-5): Offer as options (70%)
- New (1-2): Introduce slowly (30%)
- Review: Bring back old chunks

**Character Strategy (if history provided):**
- 70%: Reuse familiar characters ("The little bear")
- 30%: Create new characters
- Within story: Keep same character, use pronouns

**Response Format:**

1. **aiComment**: Short story question (max 5 words)

2. **nextOptions** (2 chunks):
   - word: natural phrase ("the little", "ran quickly")
   - emoji: EXPRESSIVE (🤏=small, 💪=big, 🏃💨=fast, 🐌=slow)
   - explanation: simple English
   - willComplete: BOOLEAN

**willComplete Rules:**
- Length guide: 1-2 words=never, 3-4=rarely, 5-6=often, 7+=usually
- Semantic test: Would listener ask "and then?" → false
- Balance: Prefer 1 complete + 1 continue option

3. **scene**: Update when location changes (forest/ocean/space/magic/home/school/park/playground/street/hospital/restaurant/library/shop)

4. **characterInfo**: Only for FIRST sentence (name, type, emoji, description)

**Story Flow:**
Continue with pronouns (He/She/It) or time words (Then/Next/Suddenly), not "The/A"
`;

// ============================================
// 状态模式 - 每个状态是独立的类实例
// ============================================

// 输入数据（用户交互）
interface PromptInput {
  currentWords: WordOption[];
  history: StoryPage[];
  usageHistory?: StoryHistory;  // 可选的使用历史数据
  chunkContext?: ChunkContext;   // 可选的 Chunk 学习上下文
}

// 抽象状态类
abstract class StoryCreationState {
  abstract readonly stateName: string;
  
  // 核心方法：处理输入，返回新状态
  abstract process(input: PromptInput): StoryCreationState;
  
  // 生成 AI Prompt
  abstract buildPrompt(input: PromptInput): string;
  
  // 辅助方法：构建上下文
  protected buildContext(history: StoryPage[]): string {
    if (history.length === 0) {
      return "Starting a brand new story.";
    } else if (history.length <= 3) {
      return `Story so far: ${history.map(h => `"${h.sentence}"`).join('. ')}.`;
    } else {
      const recent = history.slice(-3);
      return `Recent story: ${recent.map(h => `"${h.sentence}"`).join('. ')}.`;
    }
  }
  
  // 辅助方法：构建历史数据提示
  protected buildHistoryContext(usageHistory?: StoryHistory): string {
    if (!usageHistory || usageHistory.characters.length === 0) {
      return '';
    }
    
    const topCharacters = usageHistory.characters.slice(0, 3);
    const charList = topCharacters.map(char => 
      `"${char.characterName}" ${char.emoji || ''} (${char.totalStories} stories)`
    ).join(', ');
    
    return `
**Previous Characters You Created:**
${charList}

PREFERENCE: Consider using one of these familiar characters (70% recommended) or create a new one (30%).
`;
  }
  
  // 辅助方法：构建 Chunk 学习上下文
  protected buildChunkContext(chunkContext?: ChunkContext): string {
    if (!chunkContext) {
      return '';
    }
    
    let context = '\n**CHUNK LEARNING CONTEXT:**\n';
    
    if (chunkContext.masteredChunks.length > 0) {
      context += `Mastered (10+): ${chunkContext.masteredChunks.slice(0, 5).join(', ')}\n`;
    }
    
    if (chunkContext.familiarChunks.length > 0) {
      context += `Familiar (6-10): ${chunkContext.familiarChunks.slice(0, 5).join(', ')}\n`;
    }
    
    if (chunkContext.learningChunks.length > 0) {
      context += `Learning (3-5): ${chunkContext.learningChunks.slice(0, 5).join(', ')}\n`;
    }
    
    if (chunkContext.chunksForReview.length > 0) {
      context += `Need Review: ${chunkContext.chunksForReview.join(', ')}\n`;
    }
    
    context += '\nSTRATEGY: Prioritize familiar/learning chunks (70%), introduce new/review chunks (30%)\n';
    
    return context;
  }
}

// 状态1: 新故事第一句开始
class FirstSentenceStartState extends StoryCreationState {
  readonly stateName = 'FirstSentenceStart';
  
  process(input: PromptInput): StoryCreationState {
    // 当添加了第一个单词，转换到构建状态
    if (input.currentWords.length > 0) {
      return new FirstSentenceBuildingState();
    }
    return this; // 保持当前状态
  }
  
  buildPrompt(input: PromptInput): string {
    const context = this.buildContext(input.history);
    const historyContext = this.buildHistoryContext(input.usageHistory);
    const chunkContext = this.buildChunkContext(input.chunkContext);
    const currentText = input.currentWords.map(w => w.word).join(' ');
    
    return `
${context}
${historyContext}
${chunkContext}
Current sentence being built: "${currentText}"
Words count: ${input.currentWords.length}

This is the FIRST sentence. You may use articles: The/A/Once/One

**CRITICAL: This is the START of a sentence (empty). Provide the BEGINNING chunks:**
- Example: "A little", "The big", "Once upon"
- NOT complete sentences like "climbed a tree"
- User will build the sentence step by step
- Follow the Progressive Completeness guidelines (1-2 words = NEVER complete)

Tasks:
1. Determine scene
2. Generate 2 nextOptions that START a sentence
3. Apply willComplete based on length (1-2 words → false, 3+ words → semantic test)
4. IMPORTANT: Detect and provide characterInfo (name, type, emoji, description) for the main character
    `;
  }
}

// 状态2: 第一句构建中
class FirstSentenceBuildingState extends StoryCreationState {
  readonly stateName = 'FirstSentenceBuilding';
  
  process(input: PromptInput): StoryCreationState {
    // 如果当前单词为空（句子已完成，开始新句子）
    if (input.currentWords.length === 0 && input.history.length > 0) {
      return new NewSentenceStartState();
    }
    return this; // 继续构建
  }
  
  buildPrompt(input: PromptInput): string {
    const context = this.buildContext(input.history);
    const currentText = input.currentWords.map(w => w.word).join(' ');
    
    return `
${context}

Current sentence being built: "${currentText}"
Words count: ${input.currentWords.length}

Provide next word options to continue this sentence.

Tasks:
1. Determine scene
2. Generate 2 nextOptions
3. Check if complete (semantically complete sentence, not just word count)
    `;
  }
}

// 状态3: 新句子开始（续写故事）
class NewSentenceStartState extends StoryCreationState {
  readonly stateName = 'NewSentenceStart';
  
  process(input: PromptInput): StoryCreationState {
    // 当添加了第一个单词，转换到句子构建状态
    if (input.currentWords.length > 0) {
      return new SentenceBuildingState();
    }
    return this; // 保持当前状态
  }
  
  buildPrompt(input: PromptInput): string {
    const context = this.buildContext(input.history);
    const currentText = input.currentWords.map(w => w.word).join(' ');
    const lastSentence = input.history.length > 0 ? input.history[input.history.length - 1]?.sentence : "";
    
    return `
${context}

Current sentence being built: "${currentText}"
Words count: ${input.currentWords.length}

IMPORTANT: This is a NEW sentence continuing from "${lastSentence}".

MUST follow this strict priority:
1st choice - PRONOUN: If the last sentence has a clear subject (person/animal/thing), use: It, She, He, They
2nd choice - TIME/TRANSITION: If pronoun doesn't fit, use: Then,/Next,/Suddenly,/Later,/Soon,/Meanwhile,
3rd choice - ONLY if neither pronoun nor time word works: use a noun WITHOUT article (e.g., "Dragon" not "The dragon")

FORBIDDEN: Never start with "The" or "A" when continuing a story!

Example:
- After "The dragon flew fast" → Options: "It" vs "Suddenly,"
- After "A girl opened the door" → Options: "She" vs "Then,"
- After "They played together" → Options: "Next," vs "Later,"

Tasks:
1. Determine scene
2. Generate 2 nextOptions
3. Check if complete (semantically complete sentence, not just word count)
    `;
  }
}

// 状态4: 句子构建中（续写）
class SentenceBuildingState extends StoryCreationState {
  readonly stateName = 'SentenceBuilding';
  
  process(input: PromptInput): StoryCreationState {
    // 如果当前单词为空（句子已完成，开始新句子）
    if (input.currentWords.length === 0 && input.history.length > 0) {
      return new NewSentenceStartState();
    }
    return this; // 继续构建
  }
  
  buildPrompt(input: PromptInput): string {
    const context = this.buildContext(input.history);
    const currentText = input.currentWords.map(w => w.word).join(' ');
    
    return `
${context}

Current sentence being built: "${currentText}"
Words count: ${input.currentWords.length}

Provide next word options to continue this sentence.

Tasks:
1. Determine scene
2. Generate 2 nextOptions
3. Check if complete (semantically complete sentence, not just word count)
    `;
  }
}

// ============================================
// 状态工厂 - 初始化状态
// ============================================

class StateFactory {
  static createInitialState(input: PromptInput): StoryCreationState {
    const hasWords = input.currentWords.length > 0;
    const hasHistory = input.history.length > 0;
    
    if (!hasHistory && !hasWords) {
      return new FirstSentenceStartState();
    } else if (!hasHistory && hasWords) {
      return new FirstSentenceBuildingState();
    } else if (hasHistory && !hasWords) {
      return new NewSentenceStartState();
    } else {
      return new SentenceBuildingState();
    }
  }
}

// ============================================
// 主函数
// ============================================

export const fetchGameStep = async (
  currentWords: WordOption[], 
  history: StoryPage[] = [],
  usageHistory?: StoryHistory,
  chunkContext?: ChunkContext
): Promise<AIResponse> => {
  const input: PromptInput = {
    currentWords,
    history,
    usageHistory,
    chunkContext
  };
  
  // 状态模式：state1 + input → state2
  const currentState = StateFactory.createInitialState(input);
  const nextState = currentState.process(input);
  
  // 使用当前状态生成 Prompt
  const prompt = currentState.buildPrompt(input);

  // 打印给 AI 的完整上下文
  console.log('\n[gemini] ========== AI Request ==========');
  console.log('[gemini] Current State:', currentState.stateName);
  console.log('[gemini] Next State:', nextState.stateName);
  console.log('[gemini] History Pages:', history.length);
  
  // 打印角色历史
  if (usageHistory && usageHistory.characters.length > 0) {
    console.log('[gemini] Character History:');
    usageHistory.characters.slice(0, 3).forEach(char => {
      console.log(`[gemini]   - "${char.characterName}" ${char.emoji || ''} (used ${char.totalStories} times)`);
    });
  }
  
  // 打印 Chunk 学习上下文
  if (chunkContext) {
    console.log('[gemini] Chunk Learning Context:');
    if (chunkContext.masteredChunks.length > 0) {
      console.log(`[gemini]   Mastered: ${chunkContext.masteredChunks.slice(0, 5).join(', ')}`);
    }
    if (chunkContext.familiarChunks.length > 0) {
      console.log(`[gemini]   Familiar: ${chunkContext.familiarChunks.slice(0, 5).join(', ')}`);
    }
    if (chunkContext.learningChunks.length > 0) {
      console.log(`[gemini]   Learning: ${chunkContext.learningChunks.slice(0, 5).join(', ')}`);
    }
    if (chunkContext.chunksForReview.length > 0) {
      console.log(`[gemini]   Review: ${chunkContext.chunksForReview.join(', ')}`);
    }
  }
  
  if (history.length > 0) {
    console.log('[gemini] Story History:');
    history.forEach((page, idx) => {
      console.log(`[gemini]   Page ${idx + 1}: "${page.sentence}"`);
    });
  }
  console.log('[gemini] Current Words:', currentWords.map(w => w.word).join(' ') || '(empty)');
  console.log('\n[gemini] Prompt:');
  console.log(prompt);
  console.log('[gemini] =====================================\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 1.0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aiComment: { type: Type.STRING },
          scene: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              backgroundEmoji: { type: Type.STRING },
              colorTheme: { type: Type.STRING }
            }
          },
          nextOptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                emoji: { type: Type.STRING },
                explanation: { type: Type.STRING },
                willComplete: { type: Type.BOOLEAN },
              },
              required: ["word", "emoji", "explanation", "willComplete"]
            }
          },
          characterInfo: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              emoji: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        },
        required: ["aiComment", "nextOptions", "scene"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  const data = JSON.parse(text);

  // 打印 AI 的响应
  console.log('\n[gemini] ========== AI Response ==========');
  console.log('[gemini] Comment:', data.aiComment);
  console.log('[gemini] Options:', data.nextOptions?.map((opt: WordOption) => `"${opt.word}" (complete: ${opt.willComplete})`).join(', '));
  console.log('[gemini] Scene:', data.scene?.type);
  if (data.characterInfo) {
    console.log('[gemini] Character:', data.characterInfo.name, data.characterInfo.emoji || '');
  }
  console.log('[gemini] ===================================\n');

  return {
    aiComment: data.aiComment,
    nextOptions: data.nextOptions || [],
    scene: data.scene,
    characterInfo: data.characterInfo
  };
};

export const generateStoryImage = async (
  sentence: string, 
  sceneType: string, 
  storyHistory: StoryPage[] = []
): Promise<string | null> => {
  try {
    // 构建多模态输入内容（文字 + 可能的参考图片）
    const contentParts: any[] = [];
    
    // 构建文字提示词
    let visualContinuityPrompt = '';
    
    if (storyHistory.length > 0) {
      // 获取最后一页的图片作为参考
      const lastPage = storyHistory[storyHistory.length - 1];
      const previousImage = lastPage?.illustration;
      
      if (previousImage) {
        // 如果有前一张图片，添加到输入中
        // 从 base64 提取图片数据
        const base64Match = previousImage.match(/^data:image\/(\w+);base64,(.+)$/);
        if (base64Match) {
          const [, mimeType, data] = base64Match;
          
          contentParts.push({
            inlineData: {
              mimeType: `image/${mimeType}`,
              data: data
            }
          });
          
          visualContinuityPrompt = `
REFERENCE IMAGE PROVIDED ABOVE.

CRITICAL - CHARACTER CONSISTENCY:
- Look at the reference image carefully
- Keep THE EXACT SAME character design:
  * Same face, same hairstyle
  * Same clothing style and colors
  * Same body proportions
  * Same art style
- This is the SAME character in the next scene
- Only the scene/action changes, NOT the character

Previous scene: "${lastPage?.sentence || ''}"
`;
        }
      } else {
        // 没有图片时，用文字描述
        const recentPages = storyHistory.slice(-2);
        const previousScenes = recentPages.map(p => p.sentence).join('. ');
        visualContinuityPrompt = `
Previous story context: "${previousScenes}"

VISUAL CONTINUITY RULES (CRITICAL):
1. Character Consistency: Keep EXACTLY the same character from before
2. Scene Transition: Natural progression
3. Style Consistency: Match previous art style
`;
      }
    } else {
      visualContinuityPrompt = `
This is the FIRST illustration of the story.
Establish main character design that will be consistent throughout.
`;
    }
    
    // 添加文字提示词
    const textPrompt = `
Create a cute, colorful, flat vector art style illustration for a children's storybook.

${visualContinuityPrompt}

Scene Setting: ${sceneType}
Current Action/Text: ${sentence}

CRITICAL - CHILD SAFETY RULES (MUST FOLLOW):
This illustration is for 4-year-old children who may imitate what they see.
NEVER show characters doing dangerous activities:
- DO NOT show characters IN water (rivers, lakes, ocean, pools) without adult supervision
- If story mentions water: show character NEAR water (on the shore/bank), NOT in water
- DO NOT show climbing high places alone
- DO NOT show touching fire, hot objects, or dangerous tools
- DO NOT show running into streets or roads with vehicles
- Show SAFE, supervised activities only

Example Safety Adaptations:
- "ran to the river" → Show character standing ON THE RIVERBANK looking at water, NOT in the water
- "jumped in the pool" → Show character NEXT TO pool with adult present
- "climbed the tree" → Show character near tree base, not high up
- "played with fire" → Show character looking at campfire from safe distance with adult

ALWAYS prioritize child safety over literal story interpretation.

Style Parameters:
- Bright, happy colors
- Simple shapes, easy for 4-year-olds to understand
- White or soft pastel background
- No text inside the image
- Aspect Ratio 1:1
    `;
    
    contentParts.push({ text: textPrompt });

    console.log(`[gemini] Image generation: ${storyHistory.length > 0 && storyHistory[storyHistory.length - 1]?.illustration ? 'with reference' : 'without reference'}`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: contentParts,
    });

    // Iterate through parts to find the image
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null; // Fail silently for image, game can continue without it
  }
};

/**
 * 使用 AI 生成故事标题
 */
export const generateStoryTitle = async (pages: StoryPage[]): Promise<string> => {
  if (pages.length === 0) {
    return generateDefaultTitle();
  }
  
  try {
    // 构建故事摘要
    const storySummary = pages.map(p => p.sentence).join('. ');
    const mainScene = getMostFrequentScene(pages);
    
    const prompt = `
请为这个儿童英语故事起一个中文标题。

故事内容：${storySummary}

主要场景：${mainScene}

要求：
1. 标题要简短（4-8个汉字）
2. 要有童趣，吸引小朋友
3. 要体现故事的主要内容
4. 只返回标题本身，不要额外的解释

示例：
- "小恐龙的冒险"
- "魔法森林之旅"
- "勇敢的小龙"
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.9,
        maxOutputTokens: 50
      }
    });

    const title = response.text?.trim();
    
    if (title && title.length > 0 && title.length < 20) {
      return title;
    }
  } catch (error) {
    console.warn('AI生成标题失败，使用默认策略', error);
  }
  
  // AI失败时的降级策略
  return generateFallbackTitle(pages);
};

/**
 * 降级策略：基于场景的标题
 */
function generateFallbackTitle(pages: StoryPage[]): string {
  const sceneName = getMostFrequentScene(pages);
  const timestamp = formatTimestamp(Date.now());
  // 首字母大写
  const sceneTitle = sceneName.charAt(0).toUpperCase() + sceneName.slice(1);
  return `${sceneTitle} Adventure ${timestamp}`;
}

/**
 * 获取最常见的场景类型（英文）
 */
function getMostFrequentScene(pages: StoryPage[]): string {
  const sceneCount = new Map<string, number>();
  
  pages.forEach(page => {
    const sceneType = page.scene.type;
    sceneCount.set(sceneType, (sceneCount.get(sceneType) || 0) + 1);
  });
  
  let maxCount = 0;
  let mainScene = 'adventure';  // 默认英文
  
  sceneCount.forEach((count, scene) => {
    if (count > maxCount) {
      maxCount = count;
      mainScene = scene;
    }
  });
  
  return mainScene;  // 直接返回英文场景类型
}

/**
 * 默认标题（带时间戳）
 */
function generateDefaultTitle(): string {
  const timestamp = formatTimestamp(Date.now());
  return `My Story ${timestamp}`;
}

/**
 * 格式化时间戳为简短格式
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes().toString().padStart(2, '0');
  
  return `${month}/${day} ${hour}:${minute}`;
}
