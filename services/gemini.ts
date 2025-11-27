
import { GoogleGenAI, Type } from "@google/genai";
import { WordOption, Scene, StoryPage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// AI 响应数据（不是完整的 GameState）
export interface AIResponse {
  aiComment: string;
  scene: Scene;
  nextOptions: WordOption[];
  isComplete: boolean;
  englishTranslation?: string;
}

const SYSTEM_INSTRUCTION = `
You are Dino 🦖, creating an ongoing picture book story WITH the child.

**Core Rules:**
1. aiComment: Chinese + English in quotes. Example: "接下来选 'opened'（打开）还是 'knocked'（敲门）？"
2. nextOptions: Exactly 2 word choices
3. isComplete: true ONLY when sentence is semantically complete:
   - Has subject + verb + meaningful content
   - Ends with noun/verb (NOT: a/the/and/or/with/comma/preposition)
   - Expresses a complete thought (quality over quantity)
   - Examples: "The cat slept" (3 words, complete), "It jumped high" (3 words, complete)
4. Scene: Keep current unless clear location change

**CRITICAL - Story Continuity & Variety:**
When starting a new sentence (empty currentWords BUT history exists):
- CONTINUE the previous story, don't restart
- Use VARIED sentence starters (NOT always "The/A"):

Priority order for options:
1. **Pronouns** (highest priority): "It", "She", "He", "They"
2. **Time/Transition words**: "Then,", "Next,", "Suddenly,", "Later,", "Soon,"
3. **Character names with pronouns**: "Little Bear", "Dragon Dino", "Brave Knight"
4. **Only as last resort**: "The X", "A Y"

Examples:
- After "The dragon breathed fire" → Options: "It" vs "Suddenly,"
- After "A girl found a door" → Options: "She" vs "Then,"  
- After "They played together" → Options: "Next," vs "Later,"
- After "The bear walked" → Options: "He" vs "Soon,"

**Scenes:** forest🌲 ocean🌊 space🚀 magic✨ home🏠 school🏫 park🎡 playground🛝 street🚦 hospital🏥 restaurant🍽️ library📚 shop🏪 default🌟
`;

// ============================================
// 状态模式 - 每个状态是独立的类实例
// ============================================

// 输入数据（用户交互）
interface PromptInput {
  currentWords: WordOption[];
  history: StoryPage[];
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
    const currentText = input.currentWords.map(w => w.word).join(' ');
    
    return `
${context}

Current sentence being built: "${currentText}"
Words count: ${input.currentWords.length}

This is the FIRST sentence. You may use articles: The/A/Once/One

Tasks:
1. Determine scene
2. Generate 2 nextOptions
3. Check if complete (semantically complete sentence, not just word count)
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
    const lastSentence = input.history.length > 0 ? input.history[input.history.length - 1].sentence : "";
    
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

export const fetchGameStep = async (currentWords: WordOption[], history: StoryPage[] = []): Promise<AIResponse> => {
  const input: PromptInput = {
    currentWords,
    history
  };
  
  // 状态模式：state1 + input → state2
  const currentState = StateFactory.createInitialState(input);
  const nextState = currentState.process(input);
  
  // 使用当前状态生成 Prompt
  const prompt = currentState.buildPrompt(input);

  // 打印给 AI 的完整上下文
  console.log('\n========== 📤 AI Request Context ==========');
  console.log('🎯 Current State:', currentState.stateName);
  console.log('➡️  Next State (after response):', nextState.stateName);
  console.log('📚 History Pages:', history.length);
  if (history.length > 0) {
    console.log('Full Story History:');
    history.forEach((page, idx) => {
      console.log(`  Page ${idx + 1}: "${page.sentence}"`);
    });
  }
  console.log('✍️  Current Words:', currentWords.map(w => w.word).join(' ') || '(empty - starting new sentence)');
  console.log('\n--- Prompt to AI ---');
  console.log(prompt);
  console.log('==========================================\n');

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
              type: { type: Type.STRING, enum: ['forest', 'ocean', 'space', 'city', 'home', 'magic', 'default'] },
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
                zh: { type: Type.STRING },
              },
              required: ["word", "emoji", "zh"]
            }
          },
          isComplete: { type: Type.BOOLEAN },
          englishTranslation: { type: Type.STRING }
        },
        required: ["aiComment", "nextOptions", "isComplete", "scene"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  const data = JSON.parse(text);

  // 打印 AI 的响应
  console.log('\n========== 📥 AI Response ==========');
  console.log('AI Comment:', data.aiComment);
  console.log('Next Options:', data.nextOptions?.map((opt: WordOption) => `${opt.word} (${opt.zh})`).join(', '));
  console.log('Scene:', data.scene?.type);
  console.log('Is Complete:', data.isComplete);
  console.log('Translation:', data.englishTranslation || 'N/A');
  console.log('====================================\n');

  // Fallback guard: Ensure isComplete is false if specific last words are used, regardless of what AI says
  const lastWord = currentWords.length > 0 ? currentWords[currentWords.length - 1].word.toLowerCase() : "";
  const forbiddenEndings = ['and', 'or', 'but', 'with', 'the', 'a', 'an', 'my', 'his', 'her', 'their', 'of', 'to', 'in', 'on', 'at'];
  
  let finalIsComplete = data.isComplete;
  if (forbiddenEndings.includes(lastWord)) {
      finalIsComplete = false;
  }
  
  return {
    aiComment: data.aiComment,
    nextOptions: data.nextOptions || [],
    isComplete: finalIsComplete,
    englishTranslation: data.englishTranslation,
    scene: data.scene
  };
};

export const generateStoryImage = async (
  sentence: string, 
  sceneType: string, 
  storyHistory: StoryPage[] = []
): Promise<string | null> => {
  try {
    // 构建故事上下文（提供给图片生成的延续性）
    let visualContinuityPrompt = '';
    if (storyHistory.length > 0) {
      // 获取最近1-2句话作为视觉延续参考
      const recentPages = storyHistory.slice(-2);
      const previousScenes = recentPages.map(p => p.sentence).join('. ');
      visualContinuityPrompt = `
Previous story context: "${previousScenes}"

VISUAL CONTINUITY RULES (CRITICAL):
1. Character Consistency: If any character appeared before (person, animal, creature), keep EXACTLY the same:
   - Same colors, same design, same style
   - Same clothing/features if applicable
2. Scene Transition: Smoothly continue from previous scene
   - Don't restart the story visually
   - Show natural progression
3. Style Consistency: Match the art style of previous illustrations
`;
    } else {
      visualContinuityPrompt = `
This is the FIRST illustration of the story.
Establish main character design that will be consistent throughout.
`;
    }
    
    const prompt = `
Create a cute, colorful, flat vector art style illustration for a children's storybook.

${visualContinuityPrompt}

Scene Setting: ${sceneType}
Current Action/Text: ${sentence}

Style Parameters:
- Bright, happy colors
- Simple shapes, easy for 4-year-olds to understand
- White or soft pastel background
- No text inside the image
- Aspect Ratio 1:1
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
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
  return `${sceneName}冒险 ${timestamp}`;
}

/**
 * 获取最常见的场景名称
 */
function getMostFrequentScene(pages: StoryPage[]): string {
  const SCENE_NAMES: Record<string, string> = {
    forest: '森林',
    ocean: '海洋',
    space: '太空',
    magic: '魔法',
    city: '城市',
    home: '家',
    school: '学校',
    park: '公园',
    playground: '游乐场',
    street: '街道',
    hospital: '医院',
    restaurant: '餐厅',
    library: '图书馆',
    shop: '商店',
    default: '奇妙'
  };

  const sceneCount = new Map<string, number>();
  
  pages.forEach(page => {
    const sceneType = page.scene.type;
    sceneCount.set(sceneType, (sceneCount.get(sceneType) || 0) + 1);
  });
  
  let maxCount = 0;
  let mainScene = 'default';
  
  sceneCount.forEach((count, scene) => {
    if (count > maxCount) {
      maxCount = count;
      mainScene = scene;
    }
  });
  
  return SCENE_NAMES[mainScene] || SCENE_NAMES.default;
}

/**
 * 默认标题（带时间戳）
 */
function generateDefaultTitle(): string {
  const timestamp = formatTimestamp(Date.now());
  return `我的绘本 ${timestamp}`;
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
