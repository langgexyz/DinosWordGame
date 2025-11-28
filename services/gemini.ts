
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
You are Dino 🦖, helping 4-year-olds practice SPOKEN English through interactive storytelling.

**CRITICAL - This is ORAL PRACTICE, not vocabulary learning**
- Goal: Children speak natural, fluent English phrases (like native speakers)
- NOT: Memorizing individual words

**Output Language: ENGLISH ONLY**

**Your Role:**
1. aiComment: Ask a SHORT (max 5 words), story-driven question
   - Connect to the story moment
   - Engage the child's imagination
   
2. nextOptions: Provide 2 NATURAL LANGUAGE CHUNKS
   
   **Chunk Philosophy:**
   - Think: "How would a native speaker SAY this?"
   - Provide natural spoken phrases
   
   **Phrase guidelines:**
   - Prefer natural combinations: "the little", "ran quickly", "looked at"
   - Use single words when they stand alone naturally
   
   **CRITICAL - Each option MUST specify:**
   - word: the phrase/chunk to add
   - emoji: visual hint
   - explanation: what does this mean?
   - willComplete: BOOLEAN - Will adding THIS option create a complete sentence?
   
   **How to determine willComplete:**
   Step 1: Imagine the sentence AFTER adding this option
   Step 2: Ask: "Does it express a complete thought?"
   Step 3: Check: Does it end with a meaningful word (NOT preposition/article)?
   
   Examples:
   Current: "She"
   Option 1: {word: "loved singing", willComplete: true}  
     → "She loved singing" ✅ Complete thought
   Option 2: {word: "went to", willComplete: false}      
     → "She went to" ❌ Incomplete (where?)
   
   Current: "The bear lived"
   Option 1: {word: "happily", willComplete: true}
     → "The bear lived happily" ✅ Complete
   Option 2: {word: "in", willComplete: false}
     → "The bear lived in" ❌ Incomplete (where?)
   
   NEVER mark as complete if it ends with: to/in/on/at/the/a/and/or/with

3. isComplete: Derived from the options
   - If ANY option has willComplete=true, then isComplete=true
   - Otherwise, isComplete=false

4. Scene: Update when location changes

**Story Flow:**
- Continue naturally using pronouns/time words
- Think in spoken phrases, not written words

**Available Scenes:** forest🌲 ocean🌊 space🚀 magic✨ home🏠 school🏫 park🎡 playground🛝 street🚦 hospital🏥 restaurant🍽️ library📚 shop🏪 default🌟
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
  console.log('\n[gemini] ========== 📤 AI Request Context ==========');
  console.log('[gemini] 🎯 Current State:', currentState.stateName);
  console.log('[gemini] ➡️  Next State (after response):', nextState.stateName);
  console.log('[gemini] 📚 History Pages:', history.length);
  if (history.length > 0) {
    console.log('[gemini] Full Story History:');
    history.forEach((page, idx) => {
      console.log(`[gemini]   Page ${idx + 1}: "${page.sentence}"`);
    });
  }
  console.log('[gemini] ✍️  Current Words:', currentWords.map(w => w.word).join(' ') || '(empty - starting new sentence)');
  console.log('\n[gemini] --- Prompt to AI ---');
  console.log(prompt);
  console.log('[gemini] ==========================================\n');

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
                explanation: { type: Type.STRING },
                willComplete: { type: Type.BOOLEAN },
              },
              required: ["word", "emoji", "explanation", "willComplete"]
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
  console.log('\n[gemini] ========== 📥 AI Response ==========');
  console.log('[gemini] AI Comment:', data.aiComment);
  console.log('[gemini] Next Options:', data.nextOptions?.map((opt: WordOption) => `${opt.word} (willComplete: ${opt.willComplete})`).join(', '));
  console.log('[gemini] Scene:', data.scene?.type);
  console.log('[gemini] Is Complete:', data.isComplete);
  console.log('[gemini] Translation:', data.englishTranslation || 'N/A');
  console.log('[gemini] ====================================\n');

  // Derive isComplete from options: if ANY option can complete the sentence, mark as complete
  const finalIsComplete = data.nextOptions?.some((opt: WordOption) => opt.willComplete) || false;
  
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
    // 构建多模态输入内容（文字 + 可能的参考图片）
    const contentParts: any[] = [];
    
    // 构建文字提示词
    let visualContinuityPrompt = '';
    
    if (storyHistory.length > 0) {
      // 获取最后一页的图片作为参考
      const lastPage = storyHistory[storyHistory.length - 1];
      const previousImage = lastPage.illustration;
      
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

Previous scene: "${lastPage.sentence}"
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

Style Parameters:
- Bright, happy colors
- Simple shapes, easy for 4-year-olds to understand
- White or soft pastel background
- No text inside the image
- Aspect Ratio 1:1
    `;
    
    contentParts.push({ text: textPrompt });

    console.log(`[gemini] 🎨 Generating image with${storyHistory.length > 0 && storyHistory[storyHistory.length - 1].illustration ? ' reference image' : 'out reference image'}`);

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
